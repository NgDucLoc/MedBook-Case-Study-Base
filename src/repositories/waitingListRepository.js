const { query, pool } = require("../db/pool");

// BR-08: response cho bệnh nhân phải hẹp — tuyệt đối không SELECT *.
function staffSelect(where) {
  return `
    select
      w.id,
      w.patient_id as "patientId",
      p.name as "patientName",
      p.phone as "patientPhone",
      w.doctor_id as "doctorId",
      d.name as "doctorName",
      w.specialization_id as "specializationId",
      coalesce(sp.name, dsp.name) as specialization,
      w.medical_priority as "medicalPriority",
      w.preferred_type as "preferredType",
      w.status,
      to_char(w.desired_from, 'YYYY-MM-DD') as "desiredFrom",
      to_char(w.desired_to, 'YYYY-MM-DD') as "desiredTo",
      w.note,
      to_char(w.created_at, 'YYYY-MM-DD HH24:MI') as "createdAt",
      to_char(w.updated_at, 'YYYY-MM-DD HH24:MI') as "updatedAt",
      (
        select json_build_object(
          'id', o.id, 'slotId', o.slot_id, 'status', o.status,
          'expiresAt', to_char(o.expires_at, 'YYYY-MM-DD"T"HH24:MI:SSOF')
        )
        from appointment_offers o
        where o.waiting_list_entry_id = w.id and o.status = 'sent'
        limit 1
      ) as "pendingOffer"
    from waiting_list_entries w
    join patients p on p.id = w.patient_id
    left join doctors d on d.id = w.doctor_id
    left join specializations sp on sp.id = w.specialization_id
    left join specializations dsp on dsp.id = d.specialization_id
    ${where}
  `;
}

// GET /api/my-waiting-list — cố tình rất hẹp (BR-08): không patientId người khác,
// không medicalPriority, không vị trí hàng đợi.
function patientSelect(where) {
  return `
    select
      w.id,
      w.doctor_id as "doctorId",
      d.name as "doctorName",
      coalesce(sp.name, dsp.name) as specialization,
      w.status,
      to_char(w.created_at, 'YYYY-MM-DD HH24:MI') as "createdAt"
    from waiting_list_entries w
    left join doctors d on d.id = w.doctor_id
    left join specializations sp on sp.id = w.specialization_id
    left join specializations dsp on dsp.id = d.specialization_id
    ${where}
  `;
}

async function create({
  patientId,
  doctorId,
  specializationId,
  medicalPriority,
  preferredType,
  desiredFrom,
  desiredTo,
  note,
  createdByUserId,
}) {
  const rows = await query(
    `insert into waiting_list_entries
       (patient_id, doctor_id, specialization_id, medical_priority, preferred_type,
        desired_from, desired_to, note, created_by_user_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning id`,
    [
      patientId,
      doctorId || null,
      specializationId || null,
      medicalPriority,
      preferredType,
      desiredFrom || null,
      desiredTo || null,
      note || null,
      createdByUserId || null,
    ],
  );
  return detailForStaffById(rows[0].id);
}

async function detailForStaffById(id) {
  const rows = await query(staffSelect("where w.id = $1"), [id]);
  return rows[0] || null;
}

async function findById(id) {
  const rows = await query(
    `select id, patient_id, doctor_id, specialization_id, status
     from waiting_list_entries where id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function listForStaff({ status, doctorId, specializationId } = {}) {
  const params = [];
  const filters = [];
  if (status) {
    params.push(status);
    filters.push(`w.status = $${params.length}`);
  }
  if (doctorId) {
    params.push(doctorId);
    filters.push(`w.doctor_id = $${params.length}`);
  }
  if (specializationId) {
    params.push(specializationId);
    filters.push(`w.specialization_id = $${params.length}`);
  }
  const where = filters.length ? `where ${filters.join(" and ")}` : "";
  return query(staffSelect(where) + " order by w.created_at desc", params);
}

async function listMineByPatient(patientId) {
  return query(
    patientSelect("where w.patient_id = $1 and w.status in ('waiting', 'offered')") +
      " order by w.created_at desc",
    [patientId],
  );
}

// PUT /api/waiting-list/:id — chỉ sửa medicalPriority/preferredType/desiredFrom/desiredTo/note.
// KHÔNG sửa patientId/doctorId/specializationId/status/createdAt (§5.4 ③).
async function updateEntry(id, { medicalPriority, preferredType, desiredFrom, desiredTo, note }) {
  const rows = await query(
    `update waiting_list_entries
     set medical_priority = coalesce($2, medical_priority),
         preferred_type = coalesce($3, preferred_type),
         desired_from = coalesce($4, desired_from),
         desired_to = coalesce($5, desired_to),
         note = coalesce($6, note),
         updated_at = now()
     where id = $1
     returning id`,
    [id, medicalPriority || null, preferredType || null, desiredFrom || null, desiredTo || null, note ?? null],
  );
  return rows[0] ? detailForStaffById(rows[0].id) : null;
}

async function updateStatus(client, id, status) {
  const runner = client || pool;
  await runner.query(
    `update waiting_list_entries set status = $2, updated_at = now() where id = $1`,
    [id, status],
  );
}

// doc/specs/04-data-model.md §4.5 — dịch trực tiếp BR-02 (thứ tự) + BR-03 (6 điều kiện).
// Không được nới lỏng bất kỳ điều kiện nào, không thêm tiêu chí ngoài 3 tiêu chí của BR-02.
async function findBestCandidateForSlot(client, slotId) {
  const runner = client || pool;
  const result = await runner.query(
    `
    select e.*
    from waiting_list_entries e
    join slots s   on s.id = $1
    join doctors d on d.id = s.doctor_id
    where e.status = 'waiting'                                          -- BR-03a
      and (e.doctor_id = s.doctor_id                                    -- BR-03b
           or (e.doctor_id is null and e.specialization_id = d.specialization_id))
      and not exists (                                                  -- BR-03c
        select 1 from appointment_offers o
        where o.patient_id = e.patient_id and o.status = 'sent')
      and not exists (                                                  -- BR-03d
        select 1 from appointments a
        join slots s2 on s2.id = a.slot_id
        where a.patient_id = e.patient_id
          and a.status in ('booked', 'confirmed')
          and s2.date = s.date
          and s2.start_time < s.end_time
          and s2.end_time   > s.start_time)
      and (e.desired_from is null or s.date >= e.desired_from)          -- BR-03e
      and (e.desired_to   is null or s.date <= e.desired_to)
      and not exists (                                                  -- BR-03f
        select 1 from appointment_offers o2
        where o2.waiting_list_entry_id = e.id
          and o2.slot_id = s.id
          and o2.status in ('declined', 'expired'))
    order by
      case e.medical_priority                                           -- BR-02.1
        when 'urgent' then 3 when 'high' then 2 else 1 end desc,
      e.created_at asc,                                                 -- BR-02.2
      e.id asc                                                          -- BR-02.3
    limit 1
    `,
    [slotId],
  );
  return result.rows[0] || null;
}

module.exports = {
  create,
  detailForStaffById,
  findById,
  listForStaff,
  listMineByPatient,
  updateEntry,
  updateStatus,
  findBestCandidateForSlot,
};
