const { pool } = require("./pool");

async function migrate() {
  await pool.query(`
    create table if not exists patients (
      id serial primary key,
      name varchar(150) not null,
      phone varchar(30) not null
    );

    create table if not exists users (
      id serial primary key,
      name varchar(150) not null,
      email varchar(150) unique not null,
      demo_password varchar(80) not null default 'demo123',
      role varchar(20) not null check (role in ('patient', 'staff')),
      patient_id integer references patients(id)
    );

    alter table users add column if not exists demo_password varchar(80) not null default 'demo123';

    create table if not exists specializations (
      id serial primary key,
      name varchar(120) unique not null
    );

    create table if not exists doctors (
      id serial primary key,
      name varchar(150) not null,
      title varchar(150) not null,
      room varchar(50) not null,
      specialization_id integer not null references specializations(id)
    );

    create table if not exists slots (
      id serial primary key,
      doctor_id integer not null references doctors(id),
      date date not null,
      start_time time not null,
      end_time time not null,
      status varchar(20) not null default 'available' check (status in ('available', 'booked'))
    );

    create table if not exists appointments (
      id serial primary key,
      patient_id integer not null references patients(id),
      slot_id integer not null references slots(id),
      status varchar(20) not null default 'booked' check (status in ('booked', 'confirmed', 'cancelled')),
      type varchar(20) not null default 'in_person' check (type in ('in_person', 'online')),
      created_at timestamptz not null default now()
    );

    create unique index if not exists one_active_appointment_per_slot
      on appointments(slot_id)
      where status in ('booked', 'confirmed');

    -- ===== Dynamic Appointment Rescheduling & Waiting List (Day 3) =====
    -- Nguồn: doc/specs/04-data-model.md §4.2 (Specification Package v1.0 FROZEN · 2026-08-03)

    create table if not exists waiting_list_entries (
      id serial primary key,
      patient_id integer not null references patients(id),
      doctor_id integer references doctors(id),
      specialization_id integer references specializations(id),
      medical_priority varchar(10) not null default 'normal'
        check (medical_priority in ('urgent','high','normal')),
      preferred_type varchar(20) not null default 'in_person'
        check (preferred_type in ('in_person','online')),
      status varchar(20) not null default 'waiting'
        check (status in ('waiting','offered','fulfilled','cancelled')),
      desired_from date,
      desired_to date,
      note varchar(255),
      created_by_user_id integer references users(id),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      check (doctor_id is not null or specialization_id is not null),
      check (desired_to is null or desired_from is null or desired_to >= desired_from)
    );

    create table if not exists appointment_offers (
      id serial primary key,
      waiting_list_entry_id integer not null references waiting_list_entries(id),
      patient_id integer not null references patients(id),
      slot_id integer not null references slots(id),
      appointment_type varchar(20) not null default 'in_person'
        check (appointment_type in ('in_person','online')),
      status varchar(20) not null default 'sent'
        check (status in ('sent','accepted','declined','expired','cancelled')),
      sent_at timestamptz not null default now(),
      expires_at timestamptz not null,
      responded_at timestamptz,
      appointment_id integer references appointments(id),
      cancel_reason varchar(50),
      decline_reason varchar(255),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      check (expires_at > sent_at),
      check ((status = 'accepted') = (appointment_id is not null))
    );

    create table if not exists offer_events (
      id bigserial primary key,
      occurred_at timestamptz not null default now(),
      event_type varchar(30) not null check (event_type in (
        'offer_sent','offer_accepted','offer_declined','offer_expired','offer_cancelled',
        'no_candidate','entry_created','entry_cancelled','entry_fulfilled')),
      offer_id integer references appointment_offers(id),
      waiting_list_entry_id integer references waiting_list_entries(id),
      slot_id integer references slots(id),
      patient_id integer references patients(id),
      from_status varchar(20),
      to_status varchar(20),
      actor varchar(10) not null default 'system'
        check (actor in ('patient','staff','system')),
      actor_user_id integer references users(id),
      reason varchar(100)
    );

    -- AC-01.5: một bệnh nhân chỉ có một entry đang hoạt động cho mỗi tiêu chí
    create unique index if not exists uniq_active_entry_per_patient_target
      on waiting_list_entries(patient_id, coalesce(doctor_id, 0), coalesce(specialization_id, 0))
      where status in ('waiting','offered');

    -- Phục vụ truy vấn chọn ứng viên (BR-02 + BR-03)
    create index if not exists idx_wle_selection
      on waiting_list_entries(status, medical_priority, created_at);
    create index if not exists idx_wle_patient
      on waiting_list_entries(patient_id);

    -- BR-04: hai partial unique index BẮT BUỘC
    create unique index if not exists one_pending_offer_per_slot
      on appointment_offers(slot_id) where status = 'sent';
    create unique index if not exists one_pending_offer_per_patient
      on appointment_offers(patient_id) where status = 'sent';

    -- Phục vụ sweeper (AC-06.1)
    create index if not exists idx_offers_expiry
      on appointment_offers(expires_at) where status = 'sent';

    -- Phục vụ BR-03f: không mời lại người đã từ chối chính slot đó
    create index if not exists idx_offers_entry_slot
      on appointment_offers(waiting_list_entry_id, slot_id, status);

    create index if not exists idx_events_slot
      on offer_events(slot_id, occurred_at);
    create index if not exists idx_events_patient
      on offer_events(patient_id, occurred_at);

    -- Đính chính 1 (doc/specs/01-context-scope.md §1.2): MedBook KHÔNG có Notification
    -- Service. Bảng notifications của bản nháp trước bị cấm tuyệt đối — dọn khỏi các
    -- DB dev đã chạy bản cũ. Không đụng 6 bảng gốc (C4).
    drop table if exists notifications cascade;
  `);
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch((error) => {
      console.error(error);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { migrate };
