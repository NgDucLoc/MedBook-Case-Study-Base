const { getClient } = require("../db/pool");
const appointmentRepository = require("../repositories/appointmentRepository");
const slotRepository = require("../repositories/slotRepository");
const offerEngineService = require("./offerEngineService");
const { toInt, required } = require("../utils/validate");
const { httpError } = require("../errors");

async function bookAppointment({ slotId, patientId, type }) {
  const normalizedSlotId = toInt(required(slotId, "slotId"));
  const normalizedType = type === "online" ? "online" : "in_person";

  const client = await getClient();
  let appointmentId;
  try {
    await client.query("begin");
    const slot = await slotRepository.findForUpdate(client, normalizedSlotId);
    if (!slot) throw httpError(404, "Không tìm thấy khung giờ");
    if (slot.status !== "available") throw httpError(409, "Khung giờ đã được đặt");

    await slotRepository.updateStatus(client, normalizedSlotId, "booked");
    const appointment = await appointmentRepository.create(client, {
      patientId,
      slotId: normalizedSlotId,
      type: normalizedType,
    });
    await client.query("commit");
    appointmentId = appointment.id;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  // doc/specs/05-api-contract.md §5.2: đặt lịch trực tiếp cũng phải huỷ offer đang treo
  // trên slot này (nếu có) — không thì offer đó "treo" tới khi hết hạn tự nhiên.
  try {
    await offerEngineService.onSlotTaken(normalizedSlotId);
  } catch (hookError) {
    console.error(`[slot-taken] hook failed slot=${normalizedSlotId} reason=${hookError.message}`);
  }

  return appointmentRepository.findDetailedById(appointmentId);
}

async function listMyAppointments(patientId) {
  return appointmentRepository.listByPatient(patientId);
}

async function listAppointmentsForStaff({ date }) {
  return appointmentRepository.listForStaff({ date });
}

async function confirmAppointment(id) {
  const appointmentId = toInt(id);
  const updated = await appointmentRepository.confirmBooked(appointmentId);
  if (!updated) {
    throw httpError(409, "Chỉ xác nhận được lịch đang chờ xác nhận");
  }
  return appointmentRepository.findDetailedById(appointmentId);
}

async function cancelAppointment({ appointmentId, user }) {
  const id = toInt(appointmentId);
  let freedSlotId = null;

  const client = await getClient();
  try {
    await client.query("begin");
    const appointment = await appointmentRepository.findForUpdate(client, id);
    if (!appointment) throw httpError(404, "Không tìm thấy lịch hẹn");
    if (user.role === "patient" && appointment.patient_id !== user.patientId) {
      throw httpError(403, "Không đủ quyền");
    }
    if (appointment.status === "cancelled") {
      throw httpError(409, "Lịch hẹn đã bị hủy");
    }

    await appointmentRepository.updateStatus(client, id, "cancelled");
    await slotRepository.updateStatus(client, appointment.slot_id, "available");
    await client.query("commit");
    freedSlotId = appointment.slot_id;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  // BR-04 / BR-07 nguồn 1: phát sự kiện SlotAvailable SAU khi commit + release.
  // Lỗi của hook được nuốt lại — huỷ lịch vẫn thành công.
  if (freedSlotId != null) {
    try {
      await offerEngineService.onSlotBecameAvailable(freedSlotId);
    } catch (hookError) {
      console.error(`[slot-available] hook failed slot=${freedSlotId} reason=${hookError.message}`);
    }
  }

  return appointmentRepository.findDetailedById(id);
}

module.exports = {
  bookAppointment,
  listMyAppointments,
  listAppointmentsForStaff,
  confirmAppointment,
  cancelAppointment,
};
