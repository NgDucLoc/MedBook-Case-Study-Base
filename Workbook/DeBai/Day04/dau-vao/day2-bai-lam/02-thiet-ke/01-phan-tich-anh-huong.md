# 02 · 01 — Phân tích tác động

> **Mã:** WB2-02-01 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human] · **Cổng:** CP-05
> **Nguồn:** `01-yeu-cau/` (US, BR, AC đã chọn lọc), `00-boi-canh/01-he-thong-hien-tai.md`, K-01 → K-10 · **Bước WB-1:** WF-06

> **Điều kiện nhận (HO-01):** phần thiết kế này được soạn nháp **trên giả định** các câu `Đề xuất` ở `01-yeu-cau/02-lam-ro.md` được xác nhận và R-17 được quyết. Nếu stakeholder đổi câu trả lời, sửa BR trước, rồi cập nhật các file thiết kế liên quan (NT-05).

**Nguyên tắc:** không thiết kế lại hệ thống. Ưu tiên tái sử dụng. Không thêm quy tắc mới ở tầng này (NT-04).

---

## 1. Ngữ cảnh chọn lọc cho nhiệm vụ này

Chỉ lấy phần liên quan trực tiếp (NT-06).

| Loại | Nội dung được nạp |
| --- | --- |
| Story liên quan | US-01, 02, 03, 04, 06, 07 (nhóm Must) |
| AC liên quan | AC-02.x (chọn), AC-04.x (chấp nhận), AC-06.x (hết hạn) |
| BR ảnh hưởng thiết kế | BR-01 (điểm kích hoạt) · BR-02/03 (truy vấn chọn) · BR-04/05 (ràng buộc duy nhất) · BR-06 (thời gian) · BR-09 (toàn vẹn) · BR-10 (bù trừ) · BR-14 (quyền) · BR-15 (nhật ký) |
| Thành phần hiện có liên quan | `appointmentService` (điểm hủy lịch), `slotService` (điểm mở slot), `authService` (không đổi) |
| API hiện có liên quan | Hủy lịch · sửa slot · đặt lịch · tạo slot |
| Thực thể hiện có | `slots`, `appointments`, `patients`, `doctors`, `specializations`, `users` |
| Ràng buộc kỹ thuật | K-01 → K-10 |
| Câu hỏi mở cần chừa chỗ | Q-07 (tạm dừng sau N lần từ chối), Q-13 (bệnh nhân tự đăng ký) — thiết kế dữ liệu phải chừa chỗ mà không cần migration phá vỡ |

---

## 2. Ma trận tác động

| Story | Thành phần bị ảnh hưởng | Loại | API / dữ liệu | Mức |
| --- | --- | :---: | --- | :---: |
| US-01 | `waitingListService`, `waitingListRepository` | **New** | API-01, 03; ENT-01 | High |
| US-02 | `appointmentService.cancelAppointment()` | **Extend** — thêm lời gọi Offer Engine **sau khi commit** | Hủy lịch (hành vi trả về **không đổi**) | **High** |
| US-02 | `slotService.updateSlot()` | **Extend** — thêm lời gọi khi slot đổi trạng thái | Sửa slot (không đổi) | **High** |
| US-02 | `offerEngineService` | **New** | Nội bộ | High |
| US-02 | `slotRepository` | **Reuse** — dùng nguyên `findForUpdate`, `updateStatus` | — | Low |
| US-03 | `offerRepository` | **New** | API-05, 06; ENT-02 | Medium |
| US-04 | `appointmentRepository.create()` | **Reuse** | bảng `appointments` | Low |
| US-04 | `offerEngineService.acceptOffer()` | **New** | API-07 | High |
| US-04 | `appointmentService.bookAppointment()` | **Extend** — sau khi đặt, hủy đề xuất đang chờ trên slot (BR-10) | Đặt lịch (không đổi) | Medium |
| US-06 | `offerExpirySweeper`, `server.js` | **New + Extend** — đăng ký tác vụ định kỳ khi khởi động | — | Medium |
| US-07 | `waitingListService.list()` | **New** | API-02, 09 | Low |
| Mọi US | `src/db/migrate.js` | **Extend** — thêm 4 bảng + index, idempotent | — | Medium |
| Mọi US | `src/db/seed.js` | **Extend** — thêm dữ liệu mẫu | — | Low |
| Mọi US | `offerEventRepository` | **New** | ENT-03 | Medium |
| US-03/04 | `public/js/views/patient.js` | **Extend** — thẻ đề xuất | — | Medium |
| US-07 | `public/js/views/staff.js` | **Extend** — panel danh sách chờ | — | Medium |
| — | `authService`, `userRepository`, `doctorRepository`, `demoAuth`, `requireRole` | **Reuse** — không đổi | — | — |

---

## 3. Ba module bị ảnh hưởng nhiều nhất

### 1. `appointmentService` — Extend, tác động cao nhất
Service **quan trọng và rủi ro nhất**: nó giữ giao dịch chống đặt trùng (K-04).

| Hàm | Thay đổi | Rủi ro |
| --- | --- | --- |
| `cancelAppointment()` | Sau `commit`, gọi Offer Engine báo slot trống | Gọi **bên trong** giao dịch thì lỗi của Offer Engine làm rollback việc hủy lịch — bệnh nhân bấm hủy mà lịch không hủy |
| `bookAppointment()` | Sau `commit`, gọi Offer Engine báo slot đã bị chiếm (BR-10) | Tương tự |

> **Ràng buộc thiết kế bắt buộc:** lời gọi Offer Engine đặt **sau `commit`, ngoài giao dịch**, và **lỗi của nó không lan ra client**. Hủy lịch phải thành công kể cả khi Offer Engine hỏng (RISK-03).

### 2. `slotService` — Extend
`updateSlot()` đã có logic chặn mở lại slot đang có lịch hẹn. Thêm hai nhánh: chuyển sang còn trống ⇒ báo slot trống (BR-01); chuyển sang đã đặt ⇒ báo slot bị chiếm (BR-10).

### 3. `src/db/migrate.js` — Extend
Bốn bảng mới. Migration chạy mỗi lần khởi động (K-05) nên mọi câu lệnh phải idempotent. Vì chỉ **thêm** bảng, rollback = xóa bảng mới, không sửa dữ liệu cũ.

---

## 4. Thành phần tái sử dụng nguyên vẹn

| Thành phần | Dùng lại thế nào |
| --- | --- |
| `slotRepository.findForUpdate(client, slotId)` | Khóa slot khi bệnh nhân chấp nhận — **đúng hàm** đang dùng cho đặt lịch |
| `slotRepository.updateStatus(client, slotId, status)` | Đổi slot sang đã đặt trong giao dịch chấp nhận |
| `appointmentRepository.create(client, {…})` | Tạo lịch hẹn từ đề xuất — không viết hàm tạo mới |
| `appointmentRepository.countActiveBySlot(slotId)` | Kiểm tra slot còn trống trước khi gửi đề xuất |
| `demoAuth` + `requireRole` | Mọi endpoint mới |
| `httpError` + error handler ở `server.js` | Mọi lỗi mới |
| `toInt` / `required` | Kiểm tra đầu vào |
| Khuôn giao dịch của `bookAppointment` | Sao chép cho `acceptOffer` |
| Khuôn conditional UPDATE của `confirmBooked` | Sao chép cho mọi phép chuyển trạng thái đề xuất |
| Partial unique index của `one_active_appointment_per_slot` | Sao chép mô hình cho hai ràng buộc mới của BR-04, BR-05 |

Tổng: 4 repository, 2 middleware, 1 helper lỗi, 2 khuôn đồng thời — **không viết lại cơ chế nền tảng nào**.

---

## 5. Thành phần mới

| Loại | Tên | Tầng |
| --- | --- | --- |
| Bảng | `waiting_list_entries`, `appointment_offers`, `offer_events`, `notifications` | DB |
| Repository | `waitingListRepository`, `offerRepository`, `offerEventRepository`, `notificationRepository` | Repository |
| Service | `waitingListService`, `offerEngineService` | Service |
| Nền | `offerExpirySweeper` | Service (khởi động từ `server.js`) |
| Route | `waiting-list.routes.js`, `offers.routes.js` | Route |
| View | `public/js/views/waitingList.js` + phần đề xuất trong `patient.js` | Frontend |

## 6. API thêm — không sửa API cũ

10 endpoint mới, danh sách đầy đủ ở `05-api-va-su-kien.md`. **16 endpoint hiện có: 0 thay đổi contract.** Ba trong số đó (hủy lịch, sửa slot, đặt lịch) có **thêm tác dụng phụ nội bộ** nhưng request/response giữ nguyên — 14 test hiện có vẫn phải xanh (K-10).

## 7. Dữ liệu

| Bảng | Loại | Ghi chú |
| --- | :---: | --- |
| `waiting_list_entries` | New | Đăng ký chờ + mức ưu tiên + hình thức khám |
| `appointment_offers` | New | Vòng đời đề xuất + hạn tuyệt đối |
| `offer_events` | New | Nhật ký chỉ thêm |
| `notifications` | New | Thông báo trong app; tách riêng để sau này gắn kênh ngoài |
| `slots`, `appointments`, `patients` | **Reuse — không sửa** | Mức ưu tiên y tế đặt ở đăng ký chờ, không ở `patients` (R-04) |

## 8. Luồng nghiệp vụ hiện có bị ảnh hưởng

| Luồng | Ảnh hưởng |
| --- | --- |
| Bệnh nhân đặt lịch | **Có** — sau khi đặt phải hủy đề xuất đang chờ trên slot (BR-10) |
| Bệnh nhân hủy lịch | **Có** — điểm kích hoạt chính |
| Staff xác nhận / hủy lịch | Hủy: có (dùng chung). Xác nhận: **không** |
| Staff quản lý slot | **Có** — cả hai chiều đổi trạng thái |
| Đăng nhập, tìm bác sĩ, xem slot | **Không** |

**Điểm tích hợp mới: duy nhất một** — `offerEngineService` được gọi từ hai service hiện có. Không có tích hợp ngoài hệ thống.

## 9. Phụ thuộc giữa thành phần

```
routes/waiting-list ──► waitingListService ──► waitingListRepository ─┐
routes/offers ────────► offerEngineService ──► offerRepository ───────┤
                            │                  waitingListRepository  ├──► pool ──► PostgreSQL
                            │                  slotRepository (reuse) │
                            │                  appointmentRepository  │
                            │                  offerEventRepository ──┘
                            ▲
   appointmentService ──────┤ (gọi sau commit)
   slotService ─────────────┤
   offerExpirySweeper ──────┘
```

`appointmentService → offerEngineService → appointmentRepository` an toàn (gọi xuống). Nhưng nếu `offerEngineService` gọi ngược lên `appointmentService` sẽ tạo vòng `require` — **cấm** (xem `03-thanh-phan.md` §5).

## 10. Rủi ro do thay đổi

| # | Rủi ro | Mức | Giảm thiểu |
| ---: | --- | :---: | --- |
| 1 | Offer Engine lỗi làm hỏng luồng hủy lịch đang chạy | **High** | Gọi sau commit, bọc try/catch, nuốt lỗi và ghi log — RISK-03 |
| 2 | Vòng lặp vô hạn: hủy đề xuất → tạo đề xuất → hủy… | **High** | Offer Engine **không bao giờ** tự đổi `slots.status`, trừ trong giao dịch chấp nhận (trạng thái cuối); BR-03 (f) bảo đảm chuỗi kết thúc — RISK-08 |
| 3 | Tác vụ định kỳ chạy song song nhiều instance sinh đề xuất trùng | Medium | Conditional UPDATE + ràng buộc duy nhất — RISK-04 |
| 4 | Truy vấn chọn ứng viên chậm khi danh sách lớn | Low | Index — RISK-12 |
| 5 | 14 test hiện có gãy do tác dụng phụ mới | Medium | Tác dụng phụ chỉ kích hoạt khi **có** đăng ký chờ; test cũ không tạo — RISK-11 |
| 6 | Lệch giữa `slots.status` và đề xuất đang treo | Medium | Offer Engine đọc lại `slots.status` trong giao dịch, không tin bộ nhớ đệm |
