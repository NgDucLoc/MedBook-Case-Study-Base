> **Đây là 1 trong 9 file của Specification Package — Dynamic Appointment Rescheduling & Waiting List Management (MedBook).**
> File này là input đầu vào cho Day 3, ngang hàng với 8 file còn lại trong `spec/`. Xem `spec/README.md` để biết toàn cảnh và thứ tự đọc.
>
> **Khi file này mâu thuẫn với bất kỳ mô tả, slide, hội thoại hay tài liệu nào trước đó, file này là bản có hiệu lực.** Phiên bản: 1.0 — FROZEN · 2026-08-03.

---

# 6. Component → File Mapping & Convention

> **Đây là mục AI Developer đọc khi được prompt "implement theo mục 6".**

## 6.1. Bảng ánh xạ component → file thật trong repo

| Component | File trong repo | Loại | Trách nhiệm | BR chịu trách nhiệm |
| --- | --- | --- | --- | --- |
| `waitingListRepository` | `src/repositories/waitingListRepository.js` | **New** | Toàn bộ SQL trên `waiting_list_entries`, **kèm truy vấn chọn ứng viên** ([§4.5](04-data-model.md#45-truy-vấn-chọn-ứng-viên)) | thực thi BR-02, BR-03 |
| `offerRepository` | `src/repositories/offerRepository.js` | **New** | Toàn bộ SQL trên `appointment_offers`; các conditional UPDATE; chọn cột tường minh cho endpoint bệnh nhân | BR-08 (phần chọn cột) |
| `offerEventRepository` | `src/repositories/offerEventRepository.js` | **New** | Ghi/đọc `offer_events`. **Append-only** — chỉ có `append()` và `list()` | BR-08 (truy vết) |
| `offerEngineService` | `src/services/offerEngineService.js` | **New** | **Trái tim feature.** Toàn bộ vòng đời offer | **BR-01 → BR-07**, BR-08 (quyền sở hữu) |
| `offerExpirySweeper` | `src/services/offerExpirySweeper.js` | **New** | Quét định kỳ offer quá hạn. Có `start()`/`stop()`/`sweepOnce()` | cơ chế của BR-05, BR-06 |
| `waitingListService` | `src/services/waitingListService.js` | **New** | Nghiệp vụ danh sách chờ: thêm, sửa, hủy, liệt kê | BR-08 (phân quyền) |
| `waiting-list.routes.js` | `src/routes/waiting-list.routes.js` | **New** | Endpoint ①→⑤ | — |
| `offers.routes.js` | `src/routes/offers.routes.js` | **New** | Endpoint ⑥→⑩ | — |
| `appointmentService` | `src/services/appointmentService.js` | **Extend** | Giữ nguyên mọi thứ. **Thêm đúng 2 lời gọi** tới Offer Engine | không nhận thêm BR |
| `slotService` | `src/services/slotService.js` | **Extend** | Giữ nguyên. **Thêm 2 lời gọi** tùy chiều đổi trạng thái | không nhận thêm BR |
| `migrate.js` | `src/db/migrate.js` | **Extend** | Thêm khối DDL ở [§4.2](04-data-model.md#42-ddl--sẵn-sàng-đưa-vào-migration) | BR-04 (2 index) |
| `seed.js` | `src/db/seed.js` | **Extend** | Thêm 3 entry mẫu ([§4.7](04-data-model.md#47-seed-data-bổ-sung)) | — |
| `server.js` | `server.js` | **Extend** | Đăng ký 2 router mới; khởi động sweeper | — |
| Frontend — bệnh nhân | `public/js/views/patient.js` | **Extend** | Thẻ đề xuất + đếm ngược + 2 nút | BR-08 (hiển thị) |
| Frontend — staff | `public/js/views/staff.js`, `public/js/views/waitingList.js` | **Extend + New** | Panel danh sách chờ | BR-08 |
| Frontend — API | `public/js/api.js` | **Extend** | Thêm hàm gọi 10 endpoint mới | — |
| `slotRepository` | `src/repositories/slotRepository.js` | **Reuse — KHÔNG SỬA** | `findForUpdate`, `updateStatus` dùng nguyên | — |
| `appointmentRepository` | `src/repositories/appointmentRepository.js` | **Reuse — KHÔNG SỬA** | `create`, `countActiveBySlot` dùng nguyên | — |
| `demoAuth`, `requireRole` | `src/middleware/` | **Reuse — KHÔNG SỬA** | — | — |
| `errors.js`, `utils/validate.js` | `src/` | **Reuse — KHÔNG SỬA** | `httpError`, `toInt`, `required` | — |

**Tổng: 8 file mới · 8 file sửa · 6 thành phần dùng lại nguyên vẹn.**

---

## 6.2. Bề mặt công khai của `offerEngineService`

Cố tình **rất hẹp**. Đây là toàn bộ những gì service khác được gọi:

```js
// ── Điểm móc sự kiện — gọi từ appointmentService / slotService, SAU commit ──
async function onSlotBecameAvailable(slotId)   // BR-01 → BR-03 → BR-02 → tạo offer
async function onSlotTaken(slotId)             // BR-07 — hủy offer đang treo

// ── Hành động của bệnh nhân — gọi từ routes/offers ──
async function acceptOffer({ offerId, user })  // BR-07, BR-08
async function declineOffer({ offerId, user }) // BR-06, BR-08
async function listMyOffers(patientId)         // BR-08

// ── Dùng bởi sweeper ──
async function expireOffer(offerId)            // BR-05, BR-06

// ── Dùng bởi waitingListService khi hủy entry đang giữ offer ──
async function cancelOfferForEntry(entryId, reason)  // BR-07
```

**KHÔNG xuất ra ngoài:** hàm chọn ứng viên, hàm tính `expires_at`, hàm `advanceChain`, hàm ghi log. Chúng là nội bộ. Nếu lộ ra, service khác sẽ gọi và luật nghiệp vụ bắt đầu phân tán.

---

## 6.3. Bốn điểm móc — vị trí chính xác

| File | Hàm | Điều kiện | Gọi |
| --- | --- | --- | --- |
| `appointmentService.js` | `cancelAppointment()` | luôn | `onSlotBecameAvailable(slotId)` |
| `appointmentService.js` | `bookAppointment()` | luôn | `onSlotTaken(slotId)` |
| `slotService.js` | `updateSlot()` | `status === 'available'` | `onSlotBecameAvailable(slotId)` |
| `slotService.js` | `updateSlot()` | `status === 'booked'` | `onSlotTaken(slotId)` |

### Khuôn gọi bắt buộc

```js
// appointmentService.cancelAppointment()
// ... khối try/catch/finally của transaction đã kết thúc, client đã release ...

// NGOÀI transaction, KHÔNG để lỗi lan ra client:
try {
  await offerEngineService.onSlotBecameAvailable(appointment.slot_id);
} catch (error) {
  console.error("[offer-engine] onSlotBecameAvailable thất bại", { slotId: appointment.slot_id, error });
}

return appointmentRepository.findDetailedById(id);
```

**Ba điều bắt buộc:**

1. Nằm **sau `commit`**, ngoài khối transaction.
2. Bọc `try/catch`, **nuốt** lỗi, ghi log. Người dùng hủy lịch **không được** nhận lỗi vì Offer Engine hỏng.
3. **Không** `await` bên trong transaction — làm vậy là kéo dài thời gian giữ khóa dòng.

---

## 6.4. Quy ước code bắt buộc

### Ngôn ngữ và module

- **CommonJS**, không ESM. `require` / `module.exports` ở **cuối file**, liệt kê tường minh.
- Node 20, `async/await`, không callback, không chuỗi `.then()` dài.
- Không TypeScript, không JSDoc type annotation.
- **Không thêm dependency runtime** (C1).

### ESLint — `npm run lint` phải sạch, không warning

| Rule | Giá trị |
| --- | --- |
| `extends` | `eslint:recommended` |
| `semi` | `["error", "always"]` — dấu `;` bắt buộc |
| `no-unused-vars` | `error`, bỏ qua tham số bắt đầu bằng `_` |
| `no-undef` | `error` |

### Đặt tên

| Đối tượng | Quy ước | Ví dụ có thật trong repo |
| --- | --- | --- |
| File service | `<domain>Service.js` | `appointmentService.js` |
| File repository | `<domain>Repository.js` | `slotRepository.js` |
| File route | `<domain>.routes.js` | `appointments.routes.js` |
| Hàm | `camelCase`, động từ trước | `bookAppointment`, `countActiveBySlot` |
| Cột DB | `snake_case` | `slot_id`, `start_time` |
| Trường JSON | `camelCase` | `slotId`, `startTime` |
| Hằng trạng thái | chuỗi thường | `'in_person'`, `'available'` |

### Tầng Repository — chỉ SQL, không luật nghiệp vụ

- **Luôn** parameterized query. **Nối chuỗi vào SQL bị reject ngay ở review.**
- Chuyển `snake_case` → `camelCase` bằng **SQL alias**, không bằng hàm map trong service. Chú ý dấu nháy kép:

```sql
select s.doctor_id as "doctorId",
       to_char(s.date, 'YYYY-MM-DD') as date,
       to_char(s.start_time, 'HH24:MI') as "startTime"
```

- Xây `WHERE` động theo mẫu `slotRepository.listAllUpcoming()`:

```js
const params = [];
let where = "where s.date >= current_date";
if (date) { params.push(date); where += ` and s.date = $${params.length}`; }
```

- Hàm nằm trong transaction nhận `client` làm **tham số đầu tiên**: `findForUpdate(client, slotId)`.
- Truy vấn một dòng trả `rows[0] || null`, **không** ném lỗi.
- SQL viết **chữ thường**, khớp phong cách repo.
- **Không `SELECT *`** trong repository phục vụ endpoint của bệnh nhân (BR-08).

### Tầng Service — luật nghiệp vụ và transaction

- Ném lỗi bằng `httpError(status, "Thông báo tiếng Việt")`. **Không** đụng `req`/`res`.
- Chuẩn hóa input bằng `toInt()` / `required()` từ `src/utils/validate.js`.

**Khuôn transaction — dùng lại nguyên vẹn từ `bookAppointment()`:**

```js
const client = await getClient();
try {
  await client.query("begin");
  // 1. SELECT ... FOR UPDATE trên dòng sẽ đổi
  // 2. Kiểm tra điều kiện nghiệp vụ, throw nếu vi phạm
  // 3. Ghi
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
}
```

Ba lỗi hay gặp: quên `rollback` trong `catch`; quên `client.release()` trong `finally`; đọc dữ liệu chi tiết để trả về **bên trong** transaction — repo hiện tại làm việc đó **sau** khi commit.

**Thứ tự khóa thống nhất:** `slots` trước, `appointments` sau. Đây là thứ tự của `bookAppointment()` hiện có — làm khác sẽ tạo deadlock.

### Tầng Route — mỏng

```js
router.post("/offers/:id/accept", demoAuth, requireRole("patient"), async (req, res, next) => {
  try {
    const appointment = await offerEngineService.acceptOffer({
      offerId: req.params.id,
      user: req.user,
    });
    res.status(201).json({ data: appointment });
  } catch (error) {
    next(error);
  }
});
```

- **Luôn** `try/catch` + `next(error)`. Không `res.status(500)` tại chỗ — error handler tập trung ở `server.js` lo.
- Truyền **tường minh** từng trường từ `req.body`, không `...req.body`.

### Chống phụ thuộc vòng

```
appointmentService ──► offerEngineService   ✅ hợp lệ
offerEngineService ──► appointmentService   ❌ CẤM — vòng require
```

`offerEngineService` **chỉ được `require` các repository**, không `require` service nào khác. Khi cần tạo appointment, gọi thẳng `appointmentRepository.create(client, {...})` trong transaction của chính nó — **không** gọi `appointmentService.bookAppointment()` (sẽ tạo transaction lồng).

### Migration

- `create table if not exists`, `create index if not exists`, `alter table ... add column if not exists`.
- `CHECK` constraint cho **mọi** cột enum.
- Không sửa/xóa cột của 6 bảng hiện có.

### Seed

- Idempotent bằng `on conflict (id) do update set ...`
- Ngày **tương đối**: `current_date + interval '1 day'`
- Không ghi đè dữ liệu người dùng vừa tạo
- `setval` lại sequence sau khi chèn ID cứng

### Comment

Repo gần như không có comment. Chỗ **có** comment là chỗ giải thích **vì sao**, như trong `slotService.updateSlot()`. Giữ đúng tinh thần: **không** mô tả lại code, **có** comment ở chỗ người đọc sau sẽ hỏi "sao lại làm thế".

### Test

- `node --test`, file `tests/*.test.js`, dùng `node:test` + `node:assert/strict`.
- **Test tích hợp thật**: HTTP thật, PostgreSQL thật, **không mock DB**.
- Mỗi ca tự reset dữ liệu trước khi chạy.
- Tên ca test bằng tiếng Việt, mô tả **hành vi nghiệp vụ**.

**Ba kỹ thuật bắt buộc cho feature này:**

```js
// ① Làm offer hết hạn — PHẢI lùi CẢ sent_at (vì check (expires_at > sent_at))
await query(
  `update appointment_offers
   set sent_at = now() - interval '20 minutes', expires_at = now() - interval '1 minute'
   where id = $1`, [offerId]);

// ② Gọi sweeper trực tiếp — KHÔNG BAO GIỜ await sleep(30000)
await sweeper.sweepOnce();

// ③ Test đồng thời — mẫu ca test số 3 hiện có
const [r1, r2] = await Promise.allSettled([acceptRequest(), bookRequest()]);
assert.deepEqual([r1.value.status, r2.value.status].sort(), [201, 409]);
```

### Frontend

- Vanilla JS, **không** framework, **không** build step (ADR-007).
- Gọi API qua `public/js/api.js`, không `fetch` rải rác trong view.
- Text hiển thị **tiếng Việt đầy đủ**.
- Thẻ đề xuất phải ghi rõ **"Đề xuất — cần xác nhận trong X phút"**, không để bệnh nhân tưởng đã có lịch.
- `remainingSeconds <= 0` ⇒ vô hiệu hóa nút, chuyển sang trạng thái hết hạn.

---

## 6.5. Thứ tự implement đề xuất

```
① migrate.js (DDL)
      │
      ├──► ② waitingListRepository + offerEventRepository
      │            │
      │            ├──► ③ waitingListService + waiting-list.routes  (US-01, US-07)
      │            │
      └──► ④ offerRepository + truy vấn chọn ứng viên  (US-02) ⭐
                   │
                   └──► ⑤ offerEngineService: tạo offer + 4 điểm móc  (US-02)
                              │
                              ├──► ⑥ accept/decline + offers.routes  (US-03,04,05) ⭐
                              │
                              └──► ⑦ offerExpirySweeper  (US-06)
                                         │
                                         └──► ⑧ Frontend  (US-03,04,05,07)
                                                    │
                                                    └──► ⑨ seed.js
```

**Đường găng:** ① → ④ → ⑤ → ⑥.

**Nếu chỉ làm một bước trong workshop:** chọn **④** (truy vấn chọn ứng viên — nhiều BR nhất, dễ thấy AI tự bịa) hoặc **⑥** (accept/decline — concurrency, transaction 7 bước).

### Năm điểm AI hay làm sai ở bước ⑥

| # | Lỗi | Hậu quả |
| ---: | --- | --- |
| 1 | Quên `and expires_at > now()` trong conditional UPDATE | Chấp nhận được offer quá hạn khi sweeper chậm |
| 2 | Quên kiểm quyền sở hữu (BR-08), chỉ dùng `requireRole('patient')` | Ai cũng accept được offer của người khác |
| 3 | Gộp ba lỗi 409 thành một message chung | Mất thông tin cho người dùng |
| 4 | Gọi `appointmentService.bookAppointment()` thay vì `appointmentRepository.create()` | Transaction lồng + vòng `require` |
| 5 | Nhận `type` từ request body thay vì từ `offer.appointment_type` | Client sửa được dữ liệu đã chốt |

---

---

[← API Contract](05-api-contract.md) · [Mục lục](README.md) · [Non-Functional Requirements (NFR-01 → NFR-08) →](07-non-functional-requirements.md)
