const slotRepository = require("../repositories/slotRepository");
const appointmentRepository = require("../repositories/appointmentRepository");
const { toInt, required } = require("../utils/validate");
const { httpError } = require("../errors");

function normalizeStatus(status) {
  if (!status) return undefined;
  if (!["available", "booked"].includes(status)) {
    throw httpError(400, "Trạng thái slot không hợp lệ");
  }
  return status;
}

async function listManageableSlots({ date }) {
  return slotRepository.listAllUpcoming({ date });
}

async function createSlot({ doctorId, date, startTime, endTime }) {
  return slotRepository.createSlot({
    doctorId: toInt(required(doctorId, "doctorId")),
    date: required(date, "date"),
    startTime: required(startTime, "startTime"),
    endTime: required(endTime, "endTime"),
    status: "available",
  });
}

async function updateSlot({ id, startTime, endTime, status }) {
  const slotId = toInt(id);
  const normalizedStatus = normalizeStatus(status);

  // Mở lại slot đang có lịch hẹn sẽ khiến slots.status lệch với appointments,
  // và người đặt tiếp theo va vào unique index rồi nhận lỗi 500 khó hiểu.
  if (normalizedStatus === "available") {
    const active = await appointmentRepository.countActiveBySlot(slotId);
    if (active > 0) {
      throw httpError(409, "Không thể mở lại khung giờ đang có lịch hẹn");
    }
  }

  const updated = await slotRepository.updateSlot({
    id: slotId,
    startTime,
    endTime,
    status: normalizedStatus,
  });
  if (!updated) throw httpError(404, "Không tìm thấy khung giờ");
  return updated;
}

module.exports = { listManageableSlots, createSlot, updateSlot };
