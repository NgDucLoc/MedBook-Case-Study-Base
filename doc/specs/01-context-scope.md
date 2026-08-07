> **Đây là 1 trong 9 file của Specification Package — Dynamic Appointment Rescheduling & Waiting List Management (MedBook).**
> File này là input đầu vào cho Day 3, ngang hàng với 8 file còn lại trong `spec/`. Xem `spec/README.md` để biết toàn cảnh và thứ tự đọc.
>
> **Khi file này mâu thuẫn với bất kỳ mô tả, slide, hội thoại hay tài liệu nào trước đó, file này là bản có hiệu lực.** Phiên bản: 1.0 — FROZEN · 2026-08-03.

---

# 1. Context & Scope

## 1.1. Bối cảnh hệ thống

MedBook là ứng dụng web quản lý lịch khám bệnh viện **đã xây dựng sẵn và chạy được**. Kiến trúc phân lớp một chiều:

```
Trình duyệt (HTML/CSS/Vanilla JS)
        │  HTTP + JSON, header X-Demo-User-Id
        ▼
   Express (server.js)
        │
   Routes  ──►  Services  ──►  Repositories  ──►  Pool
   (HTTP)      (nghiệp vụ)      (SQL thuần)      (kết nối)
                                                     │
                                                     ▼
                                               PostgreSQL 16
```

**6 bảng hiện có:** `users`, `patients`, `specializations`, `doctors`, `slots`, `appointments`
**16 endpoint hiện có** · **14 test tích hợp** (`tests/api.test.js`, không mock, dùng PostgreSQL thật)
**2 dependency runtime:** `express@^4.19.2`, `pg@^8.12.0`

### Vấn đề nghiệp vụ

Hệ thống **chưa có bất kỳ cơ chế nào** xử lý khi một khung giờ bị trống đột ngột. Nhân viên xử lý thủ công hoàn toàn: gọi điện cho từng bệnh nhân trong "danh sách chờ" — mà danh sách chờ hiện cũng không tồn tại trong hệ thống, nó nằm trên giấy.

Hậu quả: slot hủy sát giờ gần như chắc chắn bỏ phí; nhân viên tốn thời gian gọi điện; thứ tự ưu tiên phụ thuộc trí nhớ và thiện chí của người gọi, không giải trình được; và hai nhân viên cùng gọi cho hai người về một slot sẽ tạo đặt trùng.

### Ràng buộc quyết định thiết kế (ADR hiện có)

| ADR | Ràng buộc đặt lên feature này |
| --- | --- |
| **001** — Không dùng ORM | SQL thuần, parameterized (`$1`, `$2`) |
| **002** — Auth demo bằng header | `X-Demo-User-Id` **giả mạo được** ⇒ kiểm quyền sở hữu bắt buộc ở tầng service |
| **003** — `slots.status` denormalized | Mọi thay đổi `slots.status` phải nằm trong transaction |
| **004** — Transaction + `FOR UPDATE` + partial unique index | Luồng chấp nhận offer **sao chép nguyên mẫu này** |
| **005** — Migration không phiên bản, chạy mỗi lần khởi động | Mọi DDL phải **idempotent** (`if not exists`) |
| **006** — Kiến trúc phân lớp | Component mới nằm đúng tầng, không nhảy cóc |
| **007** — Frontend vanilla, không build step | UI mới viết JS thuần |

---

## 1.2. ⚠️ Đính chính so với codebase thật

> **Đọc kỹ mục này trước khi viết dòng code đầu tiên.** Tên feature và các mô tả trước đó gợi ý những thứ **không tồn tại** trong MedBook. Đây là nguồn hiểu nhầm nghiêm trọng nhất.

### Đính chính 1 — MedBook **KHÔNG có Notification Service**

Không có SMS, không có email, không có push, không có hàng đợi gửi tin, không có module `notification` nào trong repo. PRD hiện tại (`doc/prod.md` §3) liệt kê SMS/email/payment vào phần **Ngoài phạm vi**.

**Hệ quả bắt buộc:**

- **KHÔNG** tạo bảng `notifications`. **KHÔNG** viết `notificationService`, `notificationRepository`, `mailer`, `smsAdapter`, hay bất kỳ biến thể nào.
- **KHÔNG** thêm dependency gửi tin (`nodemailer`, `twilio`, `web-push`…).
- Kênh giao đề xuất tới bệnh nhân là **duy nhất một**: bệnh nhân gọi `GET /api/my-offers` khi mở app (polling từ frontend).
- Nguồn sự thật về "bệnh nhân có đề xuất nào" là bảng `appointment_offers`, không phải một bảng thông báo nào khác.

**Rủi ro đã biết, đã chấp nhận:** với hạn trả lời 15 phút và không có kênh đánh thức, xác suất bệnh nhân thấy kịp là thấp. Đây là **giới hạn của phạm vi phiên bản 1**, không phải thiếu sót của thiết kế. Phải ghi lại trong `development-handoff.md` để QA không đánh giá sai mức độ hoàn thành. Hướng mở rộng ở [OQ-05](08-open-questions.md#oq-05).

### Đính chính 2 — MedBook **KHÔNG có API đổi lịch (reschedule)**

Dù tên feature có chữ *Rescheduling*, hệ thống hiện tại **không có** endpoint nào dời một `appointment` từ slot này sang slot khác. Chỉ có:

- `POST /api/appointments` — đặt mới
- `POST /api/appointments/:id/cancel` — hủy (trạng thái `cancelled` là **trạng thái chết**, không quay lại được)
- `POST /api/appointments/:id/confirm` — staff xác nhận

**Hệ quả bắt buộc:**

- **KHÔNG** thêm `PATCH /api/appointments/:id` hay `POST /api/appointments/:id/reschedule`.
- **KHÔNG** thêm cột `slot_id` mới hay sửa `slot_id` của một `appointment` đang tồn tại.
- "Đổi lịch" trong feature này được hiện thực **gián tiếp**: bệnh nhân A hủy lịch → slot trở nên trống → hệ thống đề xuất cho bệnh nhân B → B chấp nhận → **một `appointment` MỚI** được tạo. Không có bản ghi nào bị "dời".

### Đính chính 3 — Bác sĩ **KHÔNG phải người dùng**

`doctors` là bảng dữ liệu. Bác sĩ không có tài khoản đăng nhập, `users.role` chỉ nhận `patient` hoặc `staff`. Mọi User Story có actor là bác sĩ đều **không thực thi được** và đã bị loại khỏi phạm vi.

### Đính chính 4 — `patients` **KHÔNG có** trường mức ưu tiên y tế

Bảng `patients` chỉ có `id`, `name`, `phone`. Không có ngày sinh, không có tình trạng bệnh, không có mức độ khẩn cấp. Hệ thống **không thể tự suy ra** mức ưu tiên y tế từ dữ liệu hiện có.

**Hệ quả:** `medical_priority` do **staff gán tay**, lưu trên `waiting_list_entries` (gắn với *lần chờ này*), **không** thêm cột vào `patients`.

---

## 1.3. In Scope

| # | Nội dung |
| --- | --- |
| 1 | Danh sách chờ có cấu trúc trong DB, do staff quản trị |
| 2 | Tự động phát hiện khi một slot trở nên khả dụng |
| 3 | Chọn ứng viên phù hợp nhất theo luật xác định ([BR-02](02-frozen-business-rules.md#br-02), [BR-03](02-frozen-business-rules.md#br-03)) |
| 4 | Gửi đề xuất (offer) có hạn trả lời; xử lý chấp nhận / từ chối / hết hạn |
| 5 | Tự động chuyển sang ứng viên kế tiếp |
| 6 | Xử lý xung đột khi slot bị chiếm trong lúc đề xuất đang chờ |
| 7 | Màn hình bệnh nhân: xem và trả lời đề xuất |
| 8 | Màn hình staff: quản trị danh sách chờ, quan sát đề xuất đang diễn ra |
| 9 | Nhật ký sự kiện đầy đủ, truy vết được |

## 1.4. Out of Scope

| # | Nội dung | Lý do |
| --- | --- | --- |
| 1 | SMS / email / push notification | Không có Notification Service (Đính chính 1) |
| 2 | API đổi lịch trực tiếp | Không tồn tại (Đính chính 2) |
| 3 | Tài khoản đăng nhập cho bác sĩ | Ngoài mô hình phân quyền (Đính chính 3) |
| 4 | Bệnh nhân tự đăng ký vào danh sách chờ | [OQ-03](08-open-questions.md#oq-03) |
| 5 | Thuật toán tối ưu lịch nâng cao, chấm điểm bằng ML | Luật chọn là quy tắc sắp xếp xác định, không phải scoring model |
| 6 | Dashboard thống kê hiệu quả waiting list | Không thuộc MVP |
| 7 | Đa ngôn ngữ, đa cơ sở y tế, multi-tenant | Ngoài phạm vi PRD |
| 8 | Sửa cơ chế xác thực (JWT, bcrypt) | ADR-002, sẽ phá 14 test hiện có |

## 1.5. Ràng buộc bắt buộc

| ID | Ràng buộc | Hậu quả nếu vi phạm |
| --- | --- | --- |
| **C1** | `package.json` **không đổi** — không thêm dependency runtime | Phá ADR-001; CI phải sửa |
| **C2** | `docker-compose.yml` **không đổi** — vẫn chạy được bằng một lệnh | Mất tính chất "chạy trong 2 phút" của case study |
| **C3** | 16 endpoint hiện có **giữ nguyên** request / response / mã lỗi | Phá frontend và 14 test hiện có |
| **C4** | 6 bảng hiện có **không sửa cấu trúc** — chỉ được **thêm bảng mới** | Migration không rollback được (ADR-005) |
| **C5** | Kiến trúc phân lớp Route → Service → Repository | Phá ADR-006 |
| **C6** | 14 test tích hợp hiện có **phải vẫn xanh** | Feature mới đánh đổi bằng chức năng đang chạy |
| **C7** | Nội dung đề xuất **không chứa** lý do khám, chẩn đoán, mức ưu tiên | Vi phạm quyền riêng tư dữ liệu y tế |
| **C8** | Mọi kiểm quyền sở hữu ở **tầng service**, không tin `X-Demo-User-Id` | Bất kỳ ai cũng thao tác được trên dữ liệu người khác |

## 1.6. Thuật ngữ

| Thuật ngữ | Định nghĩa chính xác trong tài liệu này |
| --- | --- |
| **Slot** | Một khung giờ khám của một bác sĩ (`slots`). Tồn tại độc lập với lịch hẹn |
| **Slot trở nên khả dụng** | `slots.status` chuyển `booked → available`. **Chỉ** qua hai đường ở [BR-01](02-frozen-business-rules.md#br-01) |
| **Waiting List Entry** | Một đăng ký chờ của **một** bệnh nhân cho **một** tiêu chí (bác sĩ hoặc chuyên khoa) |
| **Offer** (Đề xuất) | Lời mời một bệnh nhân nhận một slot, có hạn trả lời. Entity độc lập, **không phải** appointment |
| **Ứng viên** (Candidate) | Một entry thỏa **đủ** 6 điều kiện của [BR-03](02-frozen-business-rules.md#br-03) đối với một slot cụ thể |
| **Offer chain** | Chuỗi offer **tuần tự** cho cùng một slot, cho tới khi có người nhận hoặc hết ứng viên |
| **Sweeper** | `setInterval` trong tiến trình Express, quét offer quá hạn. **Không** phải cron, **không** phải worker riêng |
| **Lead time** | Khoảng cách tối thiểu từ hiện tại tới giờ bắt đầu slot để việc đề xuất còn có nghĩa |

---

---

[Mục lục](README.md) · [Frozen Business Rules (BR-01 → BR-08) →](02-frozen-business-rules.md)
