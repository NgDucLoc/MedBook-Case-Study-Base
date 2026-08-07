const waitingListRepository = require("../repositories/waitingListRepository");
const offerEngineService = require("./offerEngineService");
const { toInt, required } = require("../utils/validate");
const { httpError } = require("../errors");

const MEDICAL_PRIORITIES = ["urgent", "high", "normal"];
const PREFERRED_TYPES = ["in_person", "online"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateMedicalPriority(value) {
  if (value === undefined || value === null || value === "") return "normal";
  if (!MEDICAL_PRIORITIES.includes(value)) {
    throw httpError(400, "Mức ưu tiên không hợp lệ");
  }
  return value;
}

function validatePreferredType(value) {
  if (value === undefined || value === null || value === "") return "in_person";
  if (!PREFERRED_TYPES.includes(value)) {
    throw httpError(400, "Loại lịch hẹn không hợp lệ");
  }
  return value;
}

function validateDate(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (!DATE_RE.test(value)) throw httpError(400, `${label} không hợp lệ (định dạng YYYY-MM-DD)`);
  return value;
}

// US-01 (AC-01.1 → AC-01.5): staff thêm bệnh nhân vào danh sách chờ.
async function createEntry({ user, patientId, doctorId, specializationId, medicalPriority, preferredType, desiredFrom, desiredTo, note }) {
  const pid = toInt(required(patientId, "patientId"));
  const docId = doctorId ? toInt(doctorId) : null;
  const specId = specializationId ? toInt(specializationId) : null;
  if (!docId && !specId) {
    throw httpError(400, "Cần chọn bác sĩ hoặc chuyên khoa"); // AC-01.3
  }

  const priority = validateMedicalPriority(medicalPriority); // AC-01.4
  const type = validatePreferredType(preferredType);
  const from = validateDate(desiredFrom, "desiredFrom");
  const to = validateDate(desiredTo, "desiredTo");

  try {
    return await waitingListRepository.create({
      patientId: pid,
      doctorId: docId,
      specializationId: specId,
      medicalPriority: priority,
      preferredType: type,
      desiredFrom: from,
      desiredTo: to,
      note: note || null,
      createdByUserId: user.id,
    });
  } catch (error) {
    if (error.code === "23505") throw httpError(409, "Bệnh nhân đã có trong danh sách chờ"); // AC-01.5
    if (error.code === "23503") {
      if (error.constraint && error.constraint.includes("patient_id")) {
        throw httpError(404, "Không tìm thấy bệnh nhân");
      }
      throw httpError(404, "Không tìm thấy bác sĩ hoặc chuyên khoa");
    }
    throw error;
  }
}

// US-07 (AC-07.1, AC-07.2): staff xem toàn bộ danh sách chờ.
async function listForStaff({ status, doctorId, specializationId } = {}) {
  return waitingListRepository.listForStaff({
    status,
    doctorId: doctorId ? toInt(doctorId) : null,
    specializationId: specializationId ? toInt(specializationId) : null,
  });
}

// PUT /api/waiting-list/:id — staff sửa medicalPriority/preferredType/desiredFrom/desiredTo/note.
async function updateEntry({ id, medicalPriority, preferredType, desiredFrom, desiredTo, note }) {
  const entryId = toInt(id);
  const entry = await waitingListRepository.findById(entryId);
  if (!entry) throw httpError(404, "Không tìm thấy đăng ký chờ");
  if (entry.status !== "waiting" && entry.status !== "offered") {
    throw httpError(409, "Không thể sửa đăng ký đã kết thúc");
  }

  const priority = medicalPriority === undefined ? null : validateMedicalPriority(medicalPriority);
  const type = preferredType === undefined ? null : validatePreferredType(preferredType);
  const from = validateDate(desiredFrom, "desiredFrom");
  const to = validateDate(desiredTo, "desiredTo");

  return waitingListRepository.updateEntry(entryId, {
    medicalPriority: priority,
    preferredType: type,
    desiredFrom: from,
    desiredTo: to,
    note,
  });
}

// US-07 (AC-07.3, AC-07.4): staff huỷ một entry — xoá mềm, huỷ offer đang treo nếu có.
async function cancelEntry({ user, id }) {
  const entryId = toInt(id);
  const entry = await waitingListRepository.findById(entryId);
  if (!entry) throw httpError(404, "Không tìm thấy đăng ký chờ");
  if (entry.status !== "waiting" && entry.status !== "offered") {
    throw httpError(409, "Đăng ký chờ đã kết thúc");
  }

  await waitingListRepository.updateStatus(null, entryId, "cancelled");
  const cancelledOfferId = await offerEngineService.cancelOfferForEntry(entryId, {
    reason: "entry_cancelled",
    actorUserId: user.id,
  });

  return { id: entryId, status: "cancelled", cancelledOfferId };
}

// GET /api/my-waiting-list — bệnh nhân xem hàng đợi của chính mình (BR-08: cột hẹp).
async function listMine(user) {
  return waitingListRepository.listMineByPatient(user.patientId);
}

module.exports = { createEntry, listForStaff, updateEntry, cancelEntry, listMine };
