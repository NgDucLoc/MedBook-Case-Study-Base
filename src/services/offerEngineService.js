const { getClient, query } = require("../db/pool");
const offerRepository = require("../repositories/offerRepository");
const waitingListRepository = require("../repositories/waitingListRepository");
const offerEventRepository = require("../repositories/offerEventRepository");
const slotRepository = require("../repositories/slotRepository");
const appointmentRepository = require("../repositories/appointmentRepository");
const { httpError } = require("../errors");
const { toInt } = require("../utils/validate");

// doc/specs/05-api-contract.md §5.5 — biến môi trường mới của feature.
const OFFER_RESPONSE_TIMEOUT_MINUTES = Number(process.env.OFFER_RESPONSE_TIMEOUT_MINUTES || 15);
const OFFER_MIN_LEAD_MINUTES = Number(process.env.OFFER_MIN_LEAD_MINUTES || 30);

// NFR-08: công tắc an toàn — tắt toàn bộ Offer Engine, hệ thống về đúng hành vi trước feature.
function isEngineEnabled() {
  return process.env.OFFER_ENGINE_ENABLED !== "false";
}

function formatDateTime(date) {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 16).replace("T", " ");
}

// Tính lead time hoàn toàn trong Postgres (cùng cách offerRepository.create tính expires_at)
// để tránh lệch múi giờ giữa Node và DB — slots.date/start_time không mang timezone (ADR không đổi bảng).
async function readSlotForTrigger(slotId) {
  const rows = await query(
    `select status,
       extract(epoch from ((date + start_time)::timestamptz - now())) / 60 as lead_minutes
     from slots where id = $1`,
    [slotId],
  );
  return rows[0] || null;
}

// BR-01 → BR-03 → BR-02: điểm móc gọi từ appointmentService/slotService SAU khi commit.
// Cũng được tự gọi lại nội bộ để "chuyển tiếp" chuỗi offer (BR-06) — an toàn vì luôn đọc
// lại slots.status + lead time mới nhất từ DB, không tin giá trị đã đọc trước đó (§6.3).
async function onSlotBecameAvailable(slotId) {
  if (!isEngineEnabled()) return null;
  const id = toInt(slotId);

  const slot = await readSlotForTrigger(id);
  if (!slot || slot.status !== "available") return null; // BR-06 điều kiện dừng #2 — dừng im lặng

  if (Number(slot.lead_minutes) < OFFER_MIN_LEAD_MINUTES) {
    await offerEventRepository.append(null, {
      eventType: "no_candidate",
      slotId: id,
      actor: "system",
      reason: "lead_time",
    });
    return null; // BR-06 điều kiện dừng #3
  }

  return createOfferForSlot(id);
}

async function createOfferForSlot(slotId) {
  const client = await getClient();
  let offer = null;
  try {
    await client.query("begin");
    const slot = await slotRepository.findForUpdate(client, slotId);
    if (!slot || slot.status !== "available") {
      await client.query("commit");
      return null;
    }

    const candidate = await waitingListRepository.findBestCandidateForSlot(client, slotId);
    if (!candidate) {
      await client.query("commit");
      await offerEventRepository.append(null, {
        eventType: "no_candidate",
        slotId,
        actor: "system",
        reason: "no_match",
      });
      return null; // BR-06 điều kiện dừng #1
    }

    offer = await offerRepository.create(client, {
      waitingListEntryId: candidate.id,
      patientId: candidate.patient_id,
      slotId,
      appointmentType: candidate.preferred_type,
      timeoutMinutes: OFFER_RESPONSE_TIMEOUT_MINUTES,
    });
    await waitingListRepository.updateStatus(client, candidate.id, "offered");
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    // BR-04: partial unique index chặn 2 offer 'sent' cùng slot/bệnh nhân — bỏ qua, không nhân đôi.
    if (error.code === "23505") return null;
    throw error;
  } finally {
    client.release();
  }

  await offerEventRepository.append(null, {
    eventType: "offer_sent",
    offerId: offer.id,
    waitingListEntryId: offer.waiting_list_entry_id,
    slotId,
    patientId: offer.patient_id,
    fromStatus: null,
    toStatus: "sent",
    actor: "system",
  });
  return offer;
}

// BR-07 "nguồn 2": slot bị chiếm bằng bất kỳ đường nào khác (đặt trực tiếp, staff chặn giờ)
// trong lúc đang có offer 'sent' treo trên nó → huỷ offer, entry quay lại waiting KHÔNG mất lượt.
async function onSlotTaken(slotId) {
  const id = toInt(slotId);
  const offer = await offerRepository.findPendingBySlot(id);
  if (!offer) return null;

  const cancelled = await offerRepository.transitionIfSent(null, offer.id, "cancelled", {
    cancelReason: "slot_unavailable",
  });
  if (!cancelled) return null;

  await waitingListRepository.updateStatus(null, offer.waiting_list_entry_id, "waiting");
  await offerEventRepository.append(null, {
    eventType: "offer_cancelled",
    offerId: offer.id,
    waitingListEntryId: offer.waiting_list_entry_id,
    slotId: id,
    patientId: offer.patient_id,
    fromStatus: "sent",
    toStatus: "cancelled",
    actor: "system",
    reason: "slot_unavailable",
  });
  return cancelled;
}

// BR-07: chấp nhận offer — transaction 7 bước, 3 mã 409 phân biệt (AC-04.2/03/04).
async function acceptOffer({ offerId, user }) {
  const id = toInt(offerId);
  const offer = await offerRepository.findById(id);
  if (!offer) throw httpError(404, "Không tìm thấy đề xuất");
  if (offer.patient_id !== user.patientId) throw httpError(403, "Không đủ quyền");

  // Đọc trước ngoài transaction để trả đúng 1-trong-3 message 409 (BR-07). Phân biệt theo
  // NGUYÊN NHÂN thật, không chỉ theo trạng thái slot hiện tại — offer 'accepted' cũng khiến
  // slot hết available, nhưng đó là AC-04.4 (không còn hiệu lực), không phải AC-04.2 (khung
  // giờ đã được đặt bởi NGƯỜI KHÁC, nhận diện qua cancel_reason='slot_unavailable' mà
  // onSlotTaken đã gắn). Vòng lặp thứ hai vẫn được bảo vệ tuyệt đối bởi conditional UPDATE
  // atomic bên trong transaction — kiểm tra này chỉ để trả đúng message, không phải chốt an toàn.
  if (offer.status === "cancelled" && offer.cancel_reason === "slot_unavailable") {
    throw httpError(409, "Khung giờ đã được đặt"); // AC-04.2 — onSlotTaken đã huỷ offer trước khi accept tới
  }
  if (offer.status === "sent" && offer.expires_at && new Date(offer.expires_at) <= new Date()) {
    throw httpError(409, "Đề xuất đã hết hạn"); // AC-04.3 — quá hạn nhưng sweeper chưa kịp quét
  }
  if (offer.status !== "sent") {
    throw httpError(409, "Đề xuất không còn hiệu lực"); // AC-04.4 và các trạng thái kết thúc khác
  }

  const client = await getClient();
  let outcome;
  try {
    await client.query("begin");
    const slot = await slotRepository.findForUpdate(client, offer.slot_id); // bước 2

    if (!slot || slot.status !== "available") {
      // AC-04.2: slot mất khả dụng trong lúc offer đang chờ — huỷ luôn offer, entry không mất lượt.
      const cancelled = await offerRepository.transitionIfSent(client, id, "cancelled", {
        cancelReason: "slot_unavailable",
      });
      if (cancelled) {
        await waitingListRepository.updateStatus(client, offer.waiting_list_entry_id, "waiting");
      }
      await client.query("commit");
      outcome = { type: "slot_taken", cancelled: Boolean(cancelled) };
    } else {
      const created = await appointmentRepository.create(client, {
        // bước 4
        patientId: offer.patient_id,
        slotId: offer.slot_id,
        type: offer.appointment_type,
      });

      const accepted = await offerRepository.acceptIfSentAndNotExpired(client, id, created.id); // bước 5
      if (!accepted) {
        await client.query("rollback");
        const fresh = await offerRepository.findById(id);
        const expired = Boolean(fresh && fresh.expires_at && new Date(fresh.expires_at) <= new Date());
        outcome = { type: "invalid", expired };
      } else {
        await slotRepository.updateStatus(client, offer.slot_id, "booked"); // bước 6
        await waitingListRepository.updateStatus(client, offer.waiting_list_entry_id, "fulfilled"); // bước 7
        await client.query("commit");
        outcome = { type: "accepted", appointmentId: created.id };
      }
    }
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  if (outcome.type === "slot_taken") {
    if (outcome.cancelled) {
      await offerEventRepository.append(null, {
        eventType: "offer_cancelled",
        offerId: id,
        waitingListEntryId: offer.waiting_list_entry_id,
        slotId: offer.slot_id,
        patientId: offer.patient_id,
        fromStatus: "sent",
        toStatus: "cancelled",
        actor: "system",
        reason: "slot_unavailable",
      });
    }
    throw httpError(409, "Khung giờ đã được đặt");
  }
  if (outcome.type === "invalid") {
    throw httpError(409, outcome.expired ? "Đề xuất đã hết hạn" : "Đề xuất không còn hiệu lực");
  }

  await offerEventRepository.append(null, {
    eventType: "offer_accepted",
    offerId: id,
    waitingListEntryId: offer.waiting_list_entry_id,
    slotId: offer.slot_id,
    patientId: offer.patient_id,
    fromStatus: "sent",
    toStatus: "accepted",
    actor: "patient",
    actorUserId: user.id,
  });
  await offerEventRepository.append(null, {
    eventType: "entry_fulfilled",
    waitingListEntryId: offer.waiting_list_entry_id,
    slotId: offer.slot_id,
    patientId: offer.patient_id,
    actor: "system",
  });

  return appointmentRepository.findDetailedById(outcome.appointmentId);
}

// BR-06/BR-08: bệnh nhân từ chối. Chuyển tiếp cho ứng viên kế tiếp SAU KHI trả response
// (§5.4 ⑦) — không await, chỉ log lỗi nếu có, không được làm hỏng response đã trả.
async function declineOffer({ offerId, user, reason }) {
  const id = toInt(offerId);
  const offer = await offerRepository.findById(id);
  if (!offer) throw httpError(404, "Không tìm thấy đề xuất");
  if (offer.patient_id !== user.patientId) throw httpError(403, "Không đủ quyền");

  const declined = await offerRepository.transitionIfSent(null, id, "declined", {
    declineReason: reason || null,
  });
  if (!declined) throw httpError(409, "Đề xuất không còn hiệu lực");

  await waitingListRepository.updateStatus(null, offer.waiting_list_entry_id, "waiting");
  await offerEventRepository.append(null, {
    eventType: "offer_declined",
    offerId: id,
    waitingListEntryId: offer.waiting_list_entry_id,
    slotId: offer.slot_id,
    patientId: offer.patient_id,
    fromStatus: "sent",
    toStatus: "declined",
    actor: "patient",
    actorUserId: user.id,
  });

  onSlotBecameAvailable(offer.slot_id).catch((error) => {
    console.error(`[offer-engine] chuyển tiếp sau decline thất bại slot=${offer.slot_id}`, error);
  });

  return { id, status: "declined", respondedAt: formatDateTime(declined.responded_at) };
}

// BR-05/BR-06: sweeper gọi khi offer quá hạn. Idempotent nhờ transitionIfSent (WHERE status='sent').
async function expireOffer(offerId) {
  const id = toInt(offerId);
  const offer = await offerRepository.findById(id);
  if (!offer) return null;

  const expired = await offerRepository.transitionIfSent(null, id, "expired");
  if (!expired) return null; // đã bị xử lý bởi thao tác khác — dừng, không xử lý 2 lần (AC-06.5)

  await waitingListRepository.updateStatus(null, offer.waiting_list_entry_id, "waiting");
  await offerEventRepository.append(null, {
    eventType: "offer_expired",
    offerId: id,
    waitingListEntryId: offer.waiting_list_entry_id,
    slotId: offer.slot_id,
    patientId: offer.patient_id,
    fromStatus: "sent",
    toStatus: "expired",
    actor: "system",
  });

  await onSlotBecameAvailable(offer.slot_id);
  return expired;
}

// Dùng bởi waitingListService khi staff huỷ một entry đang giữ offer (AC-07.4).
async function cancelOfferForEntry(waitingListEntryId, { reason, actorUserId } = {}) {
  const offer = await offerRepository.findPendingByWaitingListEntry(waitingListEntryId);
  if (!offer) return null;

  const cancelled = await offerRepository.transitionIfSent(null, offer.id, "cancelled", {
    cancelReason: reason || "entry_cancelled",
  });
  if (!cancelled) return null;

  await offerEventRepository.append(null, {
    eventType: "offer_cancelled",
    offerId: offer.id,
    waitingListEntryId,
    slotId: offer.slot_id,
    patientId: offer.patient_id,
    fromStatus: "sent",
    toStatus: "cancelled",
    actor: "staff",
    actorUserId: actorUserId || null,
    reason: reason || "entry_cancelled",
  });

  await onSlotBecameAvailable(offer.slot_id);
  return offer.id;
}

async function listMyOffers(patientId, { includeHistory } = {}) {
  return offerRepository.listMyOffers(patientId, { includeHistory });
}

async function listForStaff({ slotId, patientId, status } = {}) {
  return offerRepository.listForStaff({ slotId, patientId, status });
}

// US-07 (AC-07.5, AC-07.6) — BR-08: nhật ký chỉ đọc, append-only ở tầng repository.
async function listEvents({ slotId, patientId, limit } = {}) {
  return offerEventRepository.list({ slotId, patientId, limit });
}

module.exports = {
  OFFER_RESPONSE_TIMEOUT_MINUTES,
  OFFER_MIN_LEAD_MINUTES,
  onSlotBecameAvailable,
  onSlotTaken,
  acceptOffer,
  declineOffer,
  listMyOffers,
  listForStaff,
  listEvents,
  expireOffer,
  cancelOfferForEntry,
};
