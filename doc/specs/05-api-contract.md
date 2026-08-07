> **Đây là 1 trong 9 file của Specification Package — Dynamic Appointment Rescheduling & Waiting List Management (MedBook).**
> File này là input đầu vào cho Day 3, ngang hàng với 8 file còn lại trong `spec/`. Xem `spec/README.md` để biết toàn cảnh và thứ tự đọc.
>
> **Khi file này mâu thuẫn với bất kỳ mô tả, slide, hội thoại hay tài liệu nào trước đó, file này là bản có hiệu lực.** Phiên bản: 1.0 — FROZEN · 2026-08-03.

---

# 5. API Contract

## 5.1. Quy ước chung

Kế thừa nguyên từ hệ thống hiện có:

- Thành công `{ "data": ... }` · Lỗi `{ "error": "..." }`
- Header bắt buộc: `X-Demo-User-Id: <users.id>`
- Tạo mới → `201`; còn lại → `200`
- Thông báo lỗi **tiếng Việt**, ngắn, không dấu chấm cuối câu, không lộ SQL/tên bảng/stack

## 5.2. API hiện có — thêm side effect, **contract KHÔNG đổi**

| API | Side effect thêm | BR |
| --- | --- | --- |
| `POST /api/appointments/:id/cancel` | Sau `commit`: `offerEngine.onSlotBecameAvailable(slotId)` | BR-01 |
| `PUT /api/slots/:id` | `status:'available'` → `onSlotBecameAvailable`; `status:'booked'` → `onSlotTaken` | BR-01, BR-07 |
| `POST /api/appointments` | Sau `commit`: `offerEngine.onSlotTaken(slotId)` | BR-07 |

> Request, response và mã lỗi của cả ba **phải giữ nguyên**. 14 test tích hợp hiện có là hàng rào kiểm chứng.

## 5.3. Bảng endpoint mới

| # | Method | Path | Role | Request | Response | Error codes |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `POST` | `/api/waiting-list` | staff | body: entry | `201` entry | `400`, `403`, `404`, `409` |
| 2 | `GET` | `/api/waiting-list` | staff | query: `status`, `doctorId`, `specializationId` | `200` entry[] | `403` |
| 3 | `PUT` | `/api/waiting-list/:id` | staff | body: các trường sửa được | `200` entry | `400`, `403`, `404`, `409` |
| 4 | `DELETE` | `/api/waiting-list/:id` | staff | — | `200` `{id, status, cancelledOfferId}` | `403`, `404`, `409` |
| 5 | `GET` | `/api/my-waiting-list` | patient | — | `200` entry rút gọn[] | — |
| 6 | `GET` | `/api/my-offers` | patient | query: `includeHistory` | `200` offer[] | — |
| 7 | `POST` | `/api/offers/:id/accept` | patient | **không body** | `201` appointment | `403`, `404`, `409` ×3 |
| 8 | `POST` | `/api/offers/:id/decline` | patient | body: `{reason?}` | `200` `{id, status, respondedAt}` | `403`, `404`, `409` |
| 9 | `GET` | `/api/offers` | staff | query: `slotId`, `patientId`, `status` | `200` offer đầy đủ[] | `403` |
| 10 | `GET` | `/api/offer-events` | staff | query: `slotId`, `patientId`, `limit` | `200` event[] | `403` |

---

## 5.4. Chi tiết và ví dụ payload

### ① `POST /api/waiting-list` — staff · US-01

**Request**

```json
{
  "patientId": 3,
  "doctorId": 2,
  "specializationId": null,
  "medicalPriority": "high",
  "preferredType": "in_person",
  "desiredFrom": "2026-08-04",
  "desiredTo": "2026-08-10",
  "note": "Bệnh nhân muốn khám sớm"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
| --- | --- | :---: | --- |
| `patientId` | int | ✅ | Phải tồn tại trong `patients` |
| `doctorId` | int\|null | ⚠️ | **Một trong hai** `doctorId`/`specializationId` phải có |
| `specializationId` | int\|null | ⚠️ | Bỏ qua nếu đã có `doctorId` |
| `medicalPriority` | enum | ❌ | `urgent`\|`high`\|`normal`, mặc định `normal` |
| `preferredType` | enum | ❌ | `in_person`\|`online`, mặc định `in_person` |
| `desiredFrom`/`desiredTo` | date\|null | ❌ | BR-03e |
| `note` | string ≤255 | ❌ | **Cấm** thông tin y tế (BR-08) |

**Response `201`**

```json
{ "data": {
  "id": 12, "patientId": 3, "patientName": "Nguyễn Minh An", "patientPhone": "0901234567",
  "doctorId": 2, "doctorName": "BS. Phạm Mạnh Hùng",
  "specializationId": 1, "specialization": "Tim mạch",
  "medicalPriority": "high", "preferredType": "in_person", "status": "waiting",
  "desiredFrom": "2026-08-04", "desiredTo": "2026-08-10", "note": "Bệnh nhân muốn khám sớm",
  "createdAt": "2026-08-03 14:20", "updatedAt": "2026-08-03 14:20"
} }
```

**Error codes**

| Status | Message | Khi nào | AC |
| --- | --- | --- | --- |
| `400` | `Thiếu patientId` | Không có `patientId` | — |
| `400` | `Cần chọn bác sĩ hoặc chuyên khoa` | Cả hai đều rỗng | AC-01.3 |
| `400` | `Mức ưu tiên không hợp lệ` | `medicalPriority` ngoài enum | AC-01.4 |
| `403` | `Không đủ quyền` | Vai trò `patient` | AC-07.6 |
| `404` | `Không tìm thấy bệnh nhân` | `patientId` không tồn tại | — |
| `409` | `Bệnh nhân đã có trong danh sách chờ` | Đã có entry `waiting` cùng tiêu chí | AC-01.5 |

---

### ② `GET /api/waiting-list` — staff · US-07

Query đều không bắt buộc. `status ∈ waiting|offered|fulfilled|cancelled`.

**Response `200`** — mảng entry theo shape của ①, cộng thêm:

```json
{ "pendingOffer": { "id": 44, "slotId": 7, "status": "sent", "expiresAt": "2026-08-03T14:35:00+07:00" } }
```

`pendingOffer` là `null` nếu entry không giữ offer. Error: `403 Không đủ quyền` (AC-07.6).

---

### ③ `PUT /api/waiting-list/:id` — staff

Sửa được: `medicalPriority`, `preferredType`, `desiredFrom`, `desiredTo`, `note`.

**Không** sửa được `patientId`, `doctorId`, `specializationId`, `status`, `createdAt`. Đổi tiêu chí ⇒ hủy entry và tạo mới, để `created_at` phản ánh đúng thời điểm bắt đầu chờ của tiêu chí đó (BR-02).

Error: `400` enum sai · `403` · `404 Không tìm thấy đăng ký chờ` · `409 Không thể sửa đăng ký đã kết thúc`.

---

### ④ `DELETE /api/waiting-list/:id` — staff · US-07

Xóa mềm: `status → 'cancelled'`. Nếu entry đang `offered`, offer liên quan cũng `cancelled` và hệ thống tìm ứng viên kế tiếp (AC-07.4).

**Response `200`**

```json
{ "data": { "id": 12, "status": "cancelled", "cancelledOfferId": 44 } }
```

`cancelledOfferId` là `null` nếu entry không giữ offer. Error: `403` · `404` · `409 Đăng ký chờ đã kết thúc`.

---

### ⑤ `GET /api/my-waiting-list` — patient

Response cố tình **rất hẹp** để tuân thủ BR-08:

```json
{ "data": [ {
  "id": 12, "doctorName": "BS. Phạm Mạnh Hùng", "specialization": "Tim mạch",
  "status": "waiting", "createdAt": "2026-08-03 14:20"
} ] }
```

**Không** trả `medicalPriority`, vị trí hàng đợi, tổng số người chờ, `note`, thông tin bệnh nhân khác.

---

### ⑥ `GET /api/my-offers` — patient · US-03

Mặc định chỉ trả offer `status='sent'` chưa quá hạn. `?includeHistory=true` trả thêm offer đã kết thúc trong 7 ngày gần nhất.

**Response `200`**

```json
{ "data": [ {
  "id": 44, "slotId": 7,
  "doctorName": "BS. Phạm Mạnh Hùng", "doctorTitle": "Chuyên khoa Tim mạch",
  "specialization": "Tim mạch", "room": "A-201",
  "date": "2026-08-04", "startTime": "09:00", "endTime": "09:30",
  "appointmentType": "in_person", "status": "sent",
  "expiresAt": "2026-08-03T14:35:00+07:00", "remainingSeconds": 842
} ] }
```

**Cấm xuất hiện (BR-08, AC-03.2):** `medicalPriority`, `queuePosition`, `totalWaiting`, `note`, lý do khám, chẩn đoán, thông tin bệnh nhân khác.

Không có offer ⇒ `200` với **mảng rỗng**, không phải `404` (AC-03.4).

---

### ⑦ `POST /api/offers/:id/accept` — patient · US-04 ⭐

**Request: KHÔNG có body.** `type` của lịch hẹn lấy từ `offer.appointment_type`, **không** nhận từ client — tránh việc client sửa được dữ liệu đã chốt khi tạo entry.

**Response `201`** — trả về appointment theo **đúng shape** của `POST /api/appointments`, để frontend tái sử dụng được component hiển thị:

```json
{ "data": {
  "id": 21, "patientId": 3, "patientName": "Nguyễn Minh An", "patientPhone": "0901234567",
  "slotId": 7, "status": "booked", "type": "in_person", "createdAt": "2026-08-03 14:26",
  "doctorId": 2, "doctorName": "BS. Phạm Mạnh Hùng", "specialization": "Tim mạch", "room": "A-201",
  "date": "2026-08-04", "startTime": "09:00", "endTime": "09:30"
} }
```

**Error codes — ba mã 409 phân biệt là BẮT BUỘC**

| Status | Message | Khi nào | AC |
| --- | --- | --- | --- |
| `403` | `Không đủ quyền` | `offer.patient_id ≠ user.patientId` | AC-04.5 |
| `404` | `Không tìm thấy đề xuất` | `offerId` không tồn tại | — |
| `409` | `Đề xuất đã hết hạn` | `expires_at < now()` | AC-04.3 |
| `409` | `Đề xuất không còn hiệu lực` | Offer không ở `sent` | AC-04.4 |
| `409` | `Khung giờ đã được đặt` | Slot không còn `available` | AC-04.2 |

---

### ⑧ `POST /api/offers/:id/decline` — patient · US-05

**Request** (body tùy chọn)

```json
{ "reason": "Bận công việc" }
```

`reason` ≤255 ký tự, không bắt buộc, **cấm** thông tin y tế.

**Response `200`**

```json
{ "data": { "id": 44, "status": "declined", "respondedAt": "2026-08-03 14:28" } }
```

Việc chuyển tiếp cho ứng viên kế tiếp xảy ra **sau khi** response đã trả — bệnh nhân không phải chờ.

Error: `403 Không đủ quyền` (AC-05.4) · `404 Không tìm thấy đề xuất` · `409 Đề xuất không còn hiệu lực` (AC-05.3).

---

### ⑨ `GET /api/offers` — staff · US-07

Trả đầy đủ hơn ⑥: thêm `patientName`, `patientPhone`, `waitingListEntryId`, `sentAt`, `respondedAt`, `cancelReason`, `declineReason`.

Error: `403 Không đủ quyền`.

---

### ⑩ `GET /api/offer-events` — staff · US-07

`limit` mặc định 100, tối đa 500. Sắp xếp theo `occurred_at` **tăng dần**.

**Response `200`**

```json
{ "data": [ {
  "id": 301, "occurredAt": "2026-08-03 14:20", "eventType": "offer_sent",
  "offerId": 44, "slotId": 7, "patientId": 3, "waitingListEntryId": 12,
  "fromStatus": null, "toStatus": "sent",
  "actor": "system", "actorUserId": null, "reason": null
} ] }
```

**Không** ghi `medicalPriority` vào nhật ký. Error: `403 Không đủ quyền` (AC-07.6).

---

## 5.5. Biến môi trường mới

Thêm vào `.env.example` kèm giá trị mặc định và một dòng giải thích.

| Biến | Mặc định | Ý nghĩa | BR |
| --- | --- | --- | --- |
| `OFFER_RESPONSE_TIMEOUT_MINUTES` | `15` | Hạn trả lời của một offer | BR-05 |
| `OFFER_MIN_LEAD_MINUTES` | `30` | Khoảng cách tối thiểu tới giờ slot để còn gửi offer | BR-01 |
| `OFFER_SWEEP_INTERVAL_SECONDS` | `30` | Chu kỳ quét offer quá hạn | BR-06 |
| `OFFER_ENGINE_ENABLED` | `true` | **Công tắc an toàn** — tắt toàn bộ Offer Engine | NFR-08 |

> `OFFER_ENGINE_ENABLED=false` đưa hệ thống trở về **đúng hành vi trước feature**, không cần rollback code. Dùng khi cần cô lập sự cố hoặc khi chạy test không liên quan.

---

---

[← Data Model](04-data-model.md) · [Mục lục](README.md) · [Component → File Mapping & Convention →](06-component-file-mapping-convention.md)
