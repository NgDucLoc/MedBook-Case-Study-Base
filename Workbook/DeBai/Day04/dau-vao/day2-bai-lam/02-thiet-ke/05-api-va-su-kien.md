# 02 · 05 — API và sự kiện

> **Mã:** WB2-02-05 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Tech Lead] · **Cổng:** CP-06
> **Nguồn:** `03-thanh-phan.md`, `04-luong-va-trang-thai.md`, `01-yeu-cau/05-tieu-chi-chap-nhan.md`, K-10 · **Bước WB-1:** WF-07

**Nguyên tắc:** ưu tiên tái sử dụng API hiện có; không sửa contract của 16 endpoint đang chạy (K-10). Thay đổi ở đây chỉ **thêm**.

| Loại | Số lượng |
| --- | ---: |
| API hiện có — giữ nguyên contract | 16 |
| API hiện có — **thêm tác dụng phụ nội bộ**, contract không đổi | 3 |
| API **mới** | 10 |
| Sự kiện ra ngoài hệ thống | **0** — mọi thứ là lời gọi hàm trong tiến trình (ADR-008) |

**Quy ước kế thừa:** thành công `{ "data": … }` · lỗi `{ "error": "…" }` · header `X-Demo-User-Id` · tạo mới `201`, còn lại `200` · thông báo lỗi tiếng Việt.

---

## 1. Ánh xạ "loại từ chối" của AC sang mã HTTP

AC viết theo loại từ chối (`01-yeu-cau/05`); bảng này là chỗ duy nhất gán mã HTTP.

| Loại từ chối trong AC | HTTP |
| --- | :---: |
| Dữ liệu không hợp lệ / thiếu | 400 |
| Không đủ quyền | 403 |
| Không tìm thấy | 404 |
| Xung đột | 409 |

## 2. API hiện có có thêm tác dụng phụ

| API | Contract | Tác dụng phụ thêm | BR |
| --- | --- | --- | --- |
| `POST /api/appointments/:id/cancel` | **Không đổi** | Sau commit: `offerEngine.onSlotBecameAvailable(slotId)` | BR-01 |
| `PUT /api/slots/:id` | **Không đổi** | Sang còn trống → `onSlotBecameAvailable`; sang đã đặt → `onSlotTaken` | BR-01, BR-10 |
| `POST /api/appointments` | **Không đổi** | Sau commit: `offerEngine.onSlotTaken(slotId)` | BR-10 |

Cả ba **phải** giữ nguyên request, response và mã lỗi; 14 test hiện có là hàng rào kiểm chứng.

---

## 3. API mới — danh sách chờ

### API-01 · `POST /api/waiting-list` — thêm bệnh nhân vào danh sách chờ
**Staff** · US-01 · BR-13, BR-15

```json
{ "patientId": 3, "doctorId": 2, "specializationId": null, "medicalPriority": "high",
  "preferredType": "in_person", "desiredFrom": "2026-08-04", "desiredTo": "2026-08-10", "note": "…" }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
| --- | --- | :---: | --- |
| `patientId` | int | ✅ | Phải tồn tại |
| `doctorId` / `specializationId` | int \| null | ⚠️ | **Một trong hai** phải có |
| `medicalPriority` | enum | ❌ | `urgent` \| `high` \| `normal`; mặc định `normal` |
| `preferredType` | enum | ❌ | `in_person` \| `online`; mặc định `in_person` (R-16) |
| `desiredFrom` / `desiredTo` | date \| null | ❌ | BR-03 (e) |
| `note` | string \| null | ❌ | ≤ 255 ký tự; **không** ghi thông tin y tế (BR-11) |

Phản hồi `201`: đăng ký với `status: "waiting"`, `createdAt`, `updatedAt`, kèm tên bệnh nhân, số điện thoại, bác sĩ / chuyên khoa.

| HTTP | Thông báo | Khi nào | AC |
| :---: | --- | --- | --- |
| 400 | `Thiếu patientId` | Không có `patientId` | — |
| 400 | `Cần chọn bác sĩ hoặc chuyên khoa` | Cả hai rỗng | AC-01.3 |
| 400 | `Mức ưu tiên không hợp lệ` | Ngoài enum | AC-01.4 |
| 403 | `Không đủ quyền` | Vai trò bệnh nhân | AC-08.4 |
| 404 | `Không tìm thấy bệnh nhân` | `patientId` không tồn tại | — |
| 409 | `Bệnh nhân đã có trong danh sách chờ` | Đã có đăng ký đang hoạt động cùng tiêu chí | AC-01.5 |

### API-02 · `GET /api/waiting-list?status=&doctorId=&specializationId=`
**Staff** · US-07 · BR-13. Query đều không bắt buộc. Trả mảng đăng ký như API-01 kèm `pendingOffer` (`{ id, slotId, expiresAt, status }` hoặc `null`). `403` với bệnh nhân (AC-08.3).

### API-03 · `PUT /api/waiting-list/:id`
**Staff** · US-01 · BR-13. Sửa được: `medicalPriority`, `preferredType`, `desiredFrom`, `desiredTo`, `note`. **Không** sửa `patientId`, `doctorId`, `specializationId`, `status`, thời điểm đăng ký — đổi tiêu chí thì hủy và tạo mới để thời điểm chờ phản ánh đúng (BR-02). Lỗi: `400` enum sai · `403` · `404 Không tìm thấy đăng ký chờ` · `409 Không thể sửa đăng ký đã kết thúc`.

### API-04 · `DELETE /api/waiting-list/:id`
**Staff** · US-08 · BR-13, BR-15. Xóa mềm: `status = 'cancelled'`. Nếu đang `offered`, đề xuất liên quan cũng `cancelled` và tìm ứng viên kế tiếp (AC-08.2). Phản hồi `200`: `{ id, status: "cancelled", cancelledOfferId }`. Lỗi: `403` · `404` · `409 Đăng ký chờ đã kết thúc`.

### API-05 · `GET /api/my-waiting-list`
**Bệnh nhân** · US-03 · BR-12. Trả đăng ký của **chính** người đăng nhập, phản hồi cố tình **rất hẹp**: `{ id, doctorName, specialization, status, createdAt }`. **Không** trả mức ưu tiên, vị trí, tổng số người chờ, thông tin người khác. Hàng rào ở tầng repository, không ở giao diện (AC-03.2).

---

## 4. API mới — đề xuất

### API-06 · `GET /api/my-offers`
**Bệnh nhân** · US-03 · BR-11, BR-12. Mặc định chỉ trả đề xuất `sent` chưa quá hạn; `?includeHistory=true` trả thêm đề xuất đã kết thúc trong 7 ngày.

```json
{ "id": 44, "slotId": 7, "doctorName": "…", "doctorTitle": "…", "specialization": "…", "room": "A-201",
  "date": "2026-08-04", "startTime": "09:00", "endTime": "09:30", "appointmentType": "in_person",
  "status": "sent", "expiresAt": "2026-08-03T14:35:00+07:00", "remainingSeconds": 842 }
```

**Cấm xuất hiện:** mức ưu tiên, mã đăng ký chờ của người khác, lý do khám, chẩn đoán, số người đang chờ, vị trí hàng đợi, thông tin bệnh nhân khác (BR-11, BR-12). Không có đề xuất ⇒ `200` với mảng rỗng (AC-03.4).

### API-07 · `POST /api/offers/:id/accept` ⭐
**Bệnh nhân** · US-04 · BR-09, BR-14. **Không có body**; hình thức khám lấy từ đề xuất, không nhận từ client — tránh client sửa được dữ liệu đã chốt. Phản hồi `201`: lịch hẹn mới theo **đúng shape** của `POST /api/appointments` để giao diện dùng lại được.

| HTTP | Thông báo | Khi nào | AC |
| :---: | --- | --- | --- |
| 403 | `Không đủ quyền` | `offer.patient_id ≠ user.patientId` (BR-14) | AC-04.5 |
| 404 | `Không tìm thấy đề xuất` | Không tồn tại | — |
| 409 | `Đề xuất đã hết hạn` | `expires_at < now()` | AC-04.3 |
| 409 | `Đề xuất không còn hiệu lực` | Không còn ở `sent` | AC-04.4 |
| 409 | `Khung giờ đã được đặt` | Slot không còn trống | AC-04.2 |

> **Ba mã 409 khác nhau là cố ý:** bệnh nhân cần biết mình lỡ vì hết giờ hay vì người khác nhanh hơn — hai tình huống dẫn tới hai hành động khác nhau.

### API-08 · `POST /api/offers/:id/decline`
**Bệnh nhân** · US-05 · BR-07, BR-14. Body tùy chọn `{ "reason": "…" }` (≤ 255 ký tự, không thông tin y tế). Phản hồi `200`: `{ id, status: "declined", respondedAt }`. Lỗi: `403` (AC-05.4) · `404` · `409 Đề xuất không còn hiệu lực` (AC-05.3). Việc chuyển tiếp xảy ra **sau** khi response đã trả — bệnh nhân không phải chờ.

### API-09 · `GET /api/offers?slotId=&patientId=&status=`
**Staff** · US-07 · BR-13. Đầy đủ hơn API-06: thêm `patientName`, `patientPhone`, `waitingListEntryId`, `sentAt`, `respondedAt`, `cancelReason`. `403` với bệnh nhân.

### API-10 · `GET /api/offer-events?slotId=&patientId=&limit=`
**Staff** · US-11 · BR-15. `limit` mặc định 100, tối đa 500; sắp xếp theo thời điểm tăng dần. Mỗi dòng: `occurredAt`, `eventType`, `offerId`, `slotId`, `patientId`, `waitingListEntryId`, `fromStatus`, `toStatus`, `actor` (`patient` \| `staff` \| `system`), `actorUserId` (null khi hệ thống), `reason`. **Không** ghi mức ưu tiên y tế (R-12). `403` với bệnh nhân (AC-09.2).

---

## 5. Bảng tổng hợp API mới

| ID | Method | Đường dẫn | Vai trò | US |
| --- | --- | --- | --- | --- |
| API-01 | POST | `/api/waiting-list` | staff | US-01 |
| API-02 | GET | `/api/waiting-list` | staff | US-07 |
| API-03 | PUT | `/api/waiting-list/:id` | staff | US-01 |
| API-04 | DELETE | `/api/waiting-list/:id` | staff | US-08 |
| API-05 | GET | `/api/my-waiting-list` | patient | US-03 |
| API-06 | GET | `/api/my-offers` | patient | US-03 |
| API-07 | POST | `/api/offers/:id/accept` | patient | US-04 |
| API-08 | POST | `/api/offers/:id/decline` | patient | US-05 |
| API-09 | GET | `/api/offers` | staff | US-07 |
| API-10 | GET | `/api/offer-events` | staff | US-11 |

---

## 6. Sự kiện nội bộ (không phải hàng đợi thông điệp)

ADR-008 chọn gọi hàm trong tiến trình. "Sự kiện" ở đây là **lời gọi hàm trực tiếp**, không broker, không serialize.

| Tên | Bên phát | Bên nhận | Payload | Nghĩa |
| --- | --- | --- | --- | --- |
| `onSlotBecameAvailable` | `appointmentService.cancelAppointment()`, `slotService.updateSlot()` | CMP-03 | `slotId` | Slot vừa trống, cân nhắc tạo đề xuất |
| `onSlotTaken` | `appointmentService.bookAppointment()`, `slotService.updateSlot()` | CMP-03 | `slotId` | Slot vừa bị chiếm, hủy đề xuất đang treo |
| `expireOffer` | CMP-04 | CMP-03 | `offerId` | Đề xuất quá hạn, xử lý và chuyển tiếp |

**Ba ràng buộc bắt buộc:** gọi **sau `commit`**, ngoài giao dịch của bên phát · bọc `try/catch`, nuốt lỗi, ghi log · một chiều, bên nhận không gọi ngược lên bên phát.

## 7. Biến môi trường mới

| Biến | Mặc định | Ý nghĩa | BR / nguồn |
| --- | :---: | --- | --- |
| `OFFER_RESPONSE_TIMEOUT_MINUTES` | `15` | Hạn trả lời | BR-06 |
| `OFFER_MIN_LEAD_MINUTES` | `30` | Thời gian tối thiểu trước giờ khám | BR-16 |
| `OFFER_SWEEP_INTERVAL_SECONDS` | `30` | Chu kỳ quét đề xuất quá hạn | S2 |
| `OFFER_ENGINE_ENABLED` | `true` | Tắt toàn bộ Offer Engine (khi chạy test hoặc cô lập sự cố) | RISK-03 |

Cả bốn phải thêm vào `.env.example` với giá trị mặc định và một dòng giải thích.

> `OFFER_ENGINE_ENABLED=false` là **công tắc an toàn**: nếu Offer Engine gây sự cố, tắt nó thì hệ thống trở về đúng hành vi trước tính năng, không cần rollback code.
