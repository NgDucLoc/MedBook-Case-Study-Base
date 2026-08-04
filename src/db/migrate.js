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
