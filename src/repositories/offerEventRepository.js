const { query, pool } = require("../db/pool");

// BR-08: offer_events là append-only — repository CHỈ có append() và list(), không update/delete.
async function append(client, {
  eventType,
  offerId,
  waitingListEntryId,
  slotId,
  patientId,
  fromStatus,
  toStatus,
  actor,
  actorUserId,
  reason,
}) {
  const runner = client || pool;
  await runner.query(
    `insert into offer_events
       (event_type, offer_id, waiting_list_entry_id, slot_id, patient_id,
        from_status, to_status, actor, actor_user_id, reason)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      eventType,
      offerId || null,
      waitingListEntryId || null,
      slotId || null,
      patientId || null,
      fromStatus || null,
      toStatus || null,
      actor || "system",
      actorUserId || null,
      reason || null,
    ],
  );
}

async function list({ slotId, patientId, limit } = {}) {
  const params = [];
  const filters = [];
  if (slotId) {
    params.push(slotId);
    filters.push(`slot_id = $${params.length}`);
  }
  if (patientId) {
    params.push(patientId);
    filters.push(`patient_id = $${params.length}`);
  }
  const where = filters.length ? `where ${filters.join(" and ")}` : "";
  const cappedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  params.push(cappedLimit);
  return query(
    `select
       id,
       to_char(occurred_at, 'YYYY-MM-DD HH24:MI') as "occurredAt",
       event_type as "eventType",
       offer_id as "offerId",
       slot_id as "slotId",
       patient_id as "patientId",
       waiting_list_entry_id as "waitingListEntryId",
       from_status as "fromStatus",
       to_status as "toStatus",
       actor,
       actor_user_id as "actorUserId",
       reason
     from offer_events
     ${where}
     order by occurred_at asc
     limit $${params.length}`,
    params,
  );
}

module.exports = { append, list };
