> **Đây là 1 trong 9 file của Specification Package — Dynamic Appointment Rescheduling & Waiting List Management (MedBook).**
> File này là input đầu vào cho Day 3, ngang hàng với 8 file còn lại trong `spec/`. Xem `spec/README.md` để biết toàn cảnh và thứ tự đọc.
>
> **Khi file này mâu thuẫn với bất kỳ mô tả, slide, hội thoại hay tài liệu nào trước đó, file này là bản có hiệu lực.** Phiên bản: 1.0 — FROZEN · 2026-08-03.

---

# 4. Data Model

## 4.1. Quyết định mô hình dữ liệu

| # | Quyết định | Lý do |
| --- | --- | --- |
| **1** | **`AppointmentOffer` là entity ĐỘC LẬP**, không phải một trạng thái của `appointments`, không phải bảng mở rộng 1-1 | Phần lớn offer **không bao giờ** trở thành appointment (bị từ chối, hết hạn). Nhét vào `appointments` sẽ tạo hàng loạt dòng "lịch hẹn" chưa từng là lịch hẹn, và buộc partial unique index `one_active_appointment_per_slot` phải bao gồm cả trạng thái `offered` — ràng buộc sai bản chất. **Kết quả: bảng `appointments` không thêm một cột nào.** |
| **2** | **Không tạo bảng `notifications`** | MedBook không có Notification Service (Đính chính 1). Kênh giao đề xuất là `GET /api/my-offers`. Thêm bảng thông báo mà không có gì gửi đi là code chết |
| **3** | `medical_priority` đặt trên `waiting_list_entries`, **không** thêm cột vào `patients` | Mức ưu tiên gắn với **lần chờ này**, không phải thuộc tính vĩnh viễn của một người. Ngoài ra C4 cấm sửa bảng cũ |
| **4** | `expires_at` kiểu **`timestamptz`**, không dùng `date`+`time` như `slots` | `slots` tách `date`/`time` và hiểu theo giờ server, không mang múi giờ. So sánh với `now()` sẽ sai |
| **5** | `patient_id` được **denormalize** vào `appointment_offers` | Cần cho partial unique index `one_pending_offer_per_patient` (BR-04). Index không truy được qua bảng khác |
| **6** | `offer_events` là bảng **append-only**, có `bigserial` | Nhật ký bất biến; ghi nhiều hơn đọc rất nhiều |
| **7** | Truy vết offer ↔ appointment **chỉ một chiều**: `appointment_offers.appointment_id` | Chiều ngược lại sẽ phải thêm cột nullable vào `appointments` — vi phạm C4 và làm bẩn bảng quan trọng nhất |
| **8** | Chừa sẵn `created_by_user_id` trên entry | Cho phép trả lời [OQ-03](08-open-questions.md#oq-03) sau này mà không phải migration phá vỡ; đồng thời truy được ai gán `urgent` |
| **9** | Xóa entry là **xóa mềm** (`status='cancelled'`), không `DELETE` | Giữ nguyên truy vết; `offer_events` vẫn tham chiếu được |

---

## 4.2. DDL — sẵn sàng đưa vào migration

> Thêm nguyên khối này vào cuối template SQL trong `src/db/migrate.js`. **Toàn bộ idempotent** (ADR-005 — migration chạy lại mỗi lần app khởi động).
>
> ✅ **Đã kiểm chứng:** chạy 3 lần liên tiếp trên PostgreSQL 16.13 với schema MedBook thật, không lỗi.

```sql
-- ─────────────────────────────────────────────────────────────
-- Waiting List & Appointment Offers
-- ─────────────────────────────────────────────────────────────

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

-- ── Index ────────────────────────────────────────────────────

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
```

**Rollback:**

```sql
drop table if exists offer_events, appointment_offers, waiting_list_entries cascade;
```

Không đụng một dòng dữ liệu nào của 6 bảng cũ.

---

## 4.3. Từ điển dữ liệu

### `waiting_list_entries`

| Cột | Kiểu | NULL | Mặc định | Ý nghĩa |
| --- | --- | :---: | --- | --- |
| `id` | `serial` | ✗ | tự tăng | PK |
| `patient_id` | `integer` | ✗ | | FK → `patients.id` |
| `doctor_id` | `integer` | ✓ | NULL | Chờ đúng bác sĩ này. NULL ⇒ chờ theo chuyên khoa |
| `specialization_id` | `integer` | ✓ | NULL | Dùng khi `doctor_id` NULL (BR-03b) |
| `medical_priority` | `varchar(10)` | ✗ | `'normal'` | **Tiêu chí 1 của BR-02.** Staff gán tay |
| `preferred_type` | `varchar(20)` | ✗ | `'in_person'` | Trở thành `appointments.type` khi chấp nhận |
| `status` | `varchar(20)` | ✗ | `'waiting'` | `waiting`\|`offered`\|`fulfilled`\|`cancelled` |
| `desired_from` / `desired_to` | `date` | ✓ | NULL | Khoảng ngày chấp nhận (BR-03e) |
| `note` | `varchar(255)` | ✓ | NULL | Ghi chú điều phối. **Cấm** thông tin y tế |
| `created_by_user_id` | `integer` | ✓ | NULL | Ai tạo entry — truy vết ai gán `urgent` |
| `created_at` | `timestamptz` | ✗ | `now()` | **Tiêu chí 2 của BR-02. KHÔNG BAO GIỜ cập nhật** |
| `updated_at` | `timestamptz` | ✗ | `now()` | Cập nhật mỗi lần đổi trạng thái |

### `appointment_offers`

| Cột | Kiểu | NULL | Mặc định | Ý nghĩa |
| --- | --- | :---: | --- | --- |
| `id` | `serial` | ✗ | tự tăng | PK |
| `waiting_list_entry_id` | `integer` | ✗ | | FK → entry sinh ra offer này |
| `patient_id` | `integer` | ✗ | | Denormalized, cần cho index BR-04 |
| `slot_id` | `integer` | ✗ | | FK → `slots.id` |
| `appointment_type` | `varchar(20)` | ✗ | `'in_person'` | Chốt lúc gửi offer, copy từ `entry.preferred_type` |
| `status` | `varchar(20)` | ✗ | `'sent'` | `sent`\|`accepted`\|`declined`\|`expired`\|`cancelled` |
| `sent_at` | `timestamptz` | ✗ | `now()` | |
| `expires_at` | `timestamptz` | ✗ | | BR-05. **`timestamptz`**, không phải `date`+`time` |
| `responded_at` | `timestamptz` | ✓ | NULL | Thời điểm accept/decline |
| `appointment_id` | `integer` | ✓ | NULL | Chỉ có giá trị khi `status='accepted'` |
| `cancel_reason` | `varchar(50)` | ✓ | NULL | `slot_unavailable`\|`entry_cancelled`\|`staff_blocked` |
| `decline_reason` | `varchar(255)` | ✓ | NULL | Bệnh nhân nhập, tùy chọn. **Cấm** thông tin y tế |

### `offer_events`

Append-only. `actor ∈ {patient, staff, system}`; `actor_user_id` NULL khi `actor='system'`.
`reason ∈ {no_match, lead_time, slot_unavailable, entry_cancelled, staff_blocked}` hoặc NULL.

---

## 4.4. Vòng đời trạng thái

### `appointment_offers`

```
[*] ──► sent ──┬──► accepted   (trạng thái cuối)
               ├──► declined   (trạng thái cuối)
               ├──► expired    (trạng thái cuối)
               └──► cancelled  (trạng thái cuối)
```

| Từ | Sang | Ai | Điều kiện |
| --- | --- | --- | --- |
| (mới) | `sent` | System | BR-01 ✓ · slot `available` ✓ · có ứng viên (BR-03) ✓ · BR-04 ✓ |
| `sent` | `accepted` | Patient | Kiểm quyền sở hữu ✓ · `status='sent'` ✓ · `expires_at > now()` ✓ · `slot.status='available'` ✓ |
| `sent` | `declined` | Patient | Kiểm quyền sở hữu ✓ · `status='sent'` ✓ |
| `sent` | `expired` | System (Sweeper) | `expires_at < now()` ✓ · `status='sent'` ✓ |
| `sent` | `cancelled` | System | Slot chuyển `booked`, hoặc entry bị hủy |
| 4 trạng thái cuối | bất kỳ | **Không ai** | ⇒ `409 "Đề xuất không còn hiệu lực"` |

### `waiting_list_entries`

```
[*] ──► waiting ⇄ offered ──► fulfilled   (trạng thái cuối)
          │          │
          └──────────┴──────► cancelled   (trạng thái cuối)
```

> **Bất biến quan trọng nhất:** phép chuyển `offered → waiting` **KHÔNG BAO GIỜ** cập nhật `created_at`. Nếu cập nhật, bệnh nhân từ chối một đề xuất bị đẩy xuống cuối hàng đợi — sai BR-07 và biến việc từ chối thành hình phạt ngầm.

### Mẫu chuyển trạng thái bắt buộc

**Cho `declined` / `expired` / `cancelled`:**

```sql
update appointment_offers
set status = $2, responded_at = now(), updated_at = now()
where id = $1 and status = 'sent'
returning id
```

**Cho `accepted` — KHÁC, không dùng mẫu trên:**

```sql
update appointment_offers
set status = 'accepted', appointment_id = $2, responded_at = now(), updated_at = now()
where id = $1 and status = 'sent' and expires_at > now()
returning id
```

Không có dòng trả về ⇒ ném `409`. Không đọc-rồi-ghi, không có khe hở thời gian.

---

## 4.5. Truy vấn chọn ứng viên

> Đây là câu SQL quan trọng nhất của feature — bản dịch trực tiếp của [BR-02](02-frozen-business-rules.md#br-02) + [BR-03](02-frozen-business-rules.md#br-03).
> ✅ **Đã kiểm chứng trên PostgreSQL 16.13:** cả 6 mệnh đề BR-03 và thứ tự BR-02 cho kết quả đúng như đặc tả.

```sql
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
      and a.status in ('booked','confirmed')
      and s2.date = s.date
      and s2.start_time < s.end_time
      and s2.end_time   > s.start_time)
  and (e.desired_from is null or s.date >= e.desired_from)          -- BR-03e
  and (e.desired_to   is null or s.date <= e.desired_to)
  and not exists (                                                  -- BR-03f
    select 1 from appointment_offers o2
    where o2.waiting_list_entry_id = e.id
      and o2.slot_id = s.id
      and o2.status in ('declined','expired'))
order by
  case e.medical_priority                                           -- BR-02.1
    when 'urgent' then 3 when 'high' then 2 else 1 end desc,
  e.created_at asc,                                                 -- BR-02.2
  e.id asc                                                          -- BR-02.3
limit 1;
```

---

## 4.6. Bất biến dữ liệu và truy vấn kiểm tra lệch

Bốn truy vấn sau **phải trả về 0 dòng**. Dùng khi debug và khi QA kiểm chứng.

```sql
-- entry và offer nói khác nhau
select e.id, e.status as entry_status, count(o.id) as pending_offers
from waiting_list_entries e
left join appointment_offers o on o.waiting_list_entry_id = e.id and o.status = 'sent'
group by e.id, e.status
having (e.status = 'offered' and count(o.id) <> 1)
    or (e.status = 'waiting' and count(o.id) > 0);

-- offer accepted nhưng slot chưa booked
select o.id, o.slot_id, s.status
from appointment_offers o join slots s on s.id = o.slot_id
where o.status = 'accepted' and s.status <> 'booked';

-- bất biến: accepted ⟺ có appointment_id
select id, status, appointment_id from appointment_offers
where (status = 'accepted') <> (appointment_id is not null);

-- CHỈ BÁO SỨC KHỎE SWEEPER: offer quá hạn mà chưa được dọn > 5 phút
select id, expires_at, now() - expires_at as overdue
from appointment_offers
where status = 'sent' and expires_at < now() - interval '5 minutes';
```

Câu cuối trả về dòng trong vận hành bình thường ⇒ **sweeper đã dừng hoặc đang lỗi**.

---

## 4.7. Seed data bổ sung

Thêm vào `src/db/seed.js`, idempotent (`on conflict do update`), ngày tương đối, `setval` lại sequence.

| Entry | Bệnh nhân | Tiêu chí | `medical_priority` | Mục đích |
| --- | --- | --- | --- | --- |
| 1 | Linh (id 2) | Bác sĩ id 1 | `normal` | Ứng viên cơ bản, vào **sớm nhất** |
| 2 | Huy (id 3) | Bác sĩ id 1 | `urgent` | **Chứng minh BR-02** — vào sau Linh nhưng được chọn trước |
| 3 | Nhi (id 4) | Chuyên khoa id 1 | `high` | Chứng minh BR-03b — khớp theo chuyên khoa |

**Không seed sẵn `appointment_offers`** — offer phải do hệ thống sinh ra, để demo chứng minh Offer Engine thật sự chạy.

---

---

[← User Stories & Acceptance Criteria (US-01 → US-07)](03-user-stories-acceptance-criteria.md) · [Mục lục](README.md) · [API Contract →](05-api-contract.md)
