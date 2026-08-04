const { pool } = require("./pool");

async function resetData() {
  await pool.query(`
    truncate table
      appointments,
      slots,
      doctors,
      specializations,
      users,
      patients
    restart identity cascade;
  `);
}

async function seed(options = {}) {
  if (options.reset) {
    await resetData();
  }

  await pool.query(`
    insert into patients (id, name, phone) values
      (1, 'Nguyễn Minh An', '0901 000 001'),
      (2, 'Trần Hà Linh', '0901 000 002'),
      (3, 'Lê Quang Huy', '0901 000 003'),
      (4, 'Phạm Thảo Nhi', '0901 000 004'),
      (5, 'Đỗ Hoàng Nam', '0901 000 005')
    on conflict (id) do update set name = excluded.name, phone = excluded.phone;

    insert into users (id, name, email, demo_password, role, patient_id) values
      (1, 'Nguyễn Minh An', 'an@medbook.local', 'demo123', 'patient', 1),
      (2, 'Điều phối viên Mai', 'mai.staff@medbook.local', 'demo123', 'staff', null),
      (3, 'Trần Hà Linh', 'linh@medbook.local', 'demo123', 'patient', 2),
      (4, 'Lê Quang Huy', 'huy@medbook.local', 'demo123', 'patient', 3),
      (5, 'Phạm Thảo Nhi', 'nhi@medbook.local', 'demo123', 'patient', 4),
      (6, 'Đỗ Hoàng Nam', 'nam@medbook.local', 'demo123', 'patient', 5),
      (7, 'Trưởng ca Khánh', 'khanh.staff@medbook.local', 'demo123', 'staff', null),
      (8, 'Lễ tân Lan', 'lan.staff@medbook.local', 'demo123', 'staff', null)
    on conflict (id) do update set
      name = excluded.name,
      email = excluded.email,
      demo_password = excluded.demo_password,
      role = excluded.role,
      patient_id = excluded.patient_id;

    insert into specializations (id, name) values
      (1, 'Tim mạch'),
      (2, 'Da liễu'),
      (3, 'Nhi khoa'),
      (4, 'Tai mũi họng'),
      (5, 'Cơ xương khớp')
    on conflict (id) do update set name = excluded.name;

    insert into doctors (id, name, title, room, specialization_id) values
      (1, 'BS. Phạm Mạnh Hùng', 'Chuyên khoa Tim mạch', 'A-201', 1),
      (2, 'BS. Nguyễn Thu Mai', 'Chuyên khoa Da liễu', 'B-105', 2),
      (3, 'BS. Lê Minh Quân', 'Chuyên khoa Nhi khoa', 'C-302', 3),
      (4, 'BS. Hoàng Anh Tuấn', 'Tư vấn Tim mạch', 'A-204', 1),
      (5, 'BS. Vũ Ngọc Hà', 'Tai mũi họng', 'B-210', 4),
      (6, 'BS. Đặng Quốc Bảo', 'Cơ xương khớp', 'C-118', 5)
    on conflict (id) do update set
      name = excluded.name,
      title = excluded.title,
      room = excluded.room,
      specialization_id = excluded.specialization_id;
  `);

  await pool.query(`
    insert into slots (id, doctor_id, date, start_time, end_time, status) values
      (1, 1, current_date, '08:00', '08:30', 'available'),
      (2, 1, current_date, '08:30', '09:00', 'booked'),
      (3, 1, current_date + interval '1 day', '09:00', '09:30', 'available'),
      (4, 2, current_date, '10:00', '10:30', 'available'),
      (5, 2, current_date + interval '1 day', '10:30', '11:00', 'available'),
      (6, 3, current_date, '14:00', '14:30', 'available'),
      (7, 4, current_date, '15:00', '15:30', 'booked'),
      (8, 4, current_date + interval '1 day', '15:30', '16:00', 'available'),
      (9, 5, current_date, '09:30', '10:00', 'available'),
      (10, 5, current_date + interval '1 day', '13:30', '14:00', 'available'),
      (11, 6, current_date, '16:00', '16:30', 'available'),
      (12, 6, current_date + interval '2 days', '08:00', '08:30', 'available')
    on conflict (id) do update set
      doctor_id = excluded.doctor_id,
      date = excluded.date,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      status = case
        when exists (
          select 1 from appointments a
          where a.slot_id = slots.id and a.status in ('booked', 'confirmed')
        ) then 'booked'
        else excluded.status
      end;
  `);

  await pool.query(`
    insert into appointments (id, patient_id, slot_id, status, type) values
      (1, 1, 2, 'booked', 'in_person'),
      (2, 2, 7, 'confirmed', 'online')
    on conflict (id) do update set
      patient_id = excluded.patient_id,
      slot_id = excluded.slot_id,
      status = excluded.status,
      type = excluded.type;

    select setval('patients_id_seq', coalesce((select max(id) from patients), 1));
    select setval('users_id_seq', coalesce((select max(id) from users), 1));
    select setval('specializations_id_seq', coalesce((select max(id) from specializations), 1));
    select setval('doctors_id_seq', coalesce((select max(id) from doctors), 1));
    select setval('slots_id_seq', coalesce((select max(id) from slots), 1));
    select setval('appointments_id_seq', coalesce((select max(id) from appointments), 1));
  `);
}

if (require.main === module) {
  seed({ reset: process.argv.includes("--reset") })
    .then(() => pool.end())
    .catch((error) => {
      console.error(error);
      pool.end().finally(() => process.exit(1));
    });
}

module.exports = { seed, resetData };
