> **Đây là 1 trong 9 file của Specification Package — Dynamic Appointment Rescheduling & Waiting List Management (MedBook).**
> File này là input đầu vào cho Day 3, ngang hàng với 8 file còn lại trong `spec/`. Xem `spec/README.md` để biết toàn cảnh và thứ tự đọc.
>
> **Khi file này mâu thuẫn với bất kỳ mô tả, slide, hội thoại hay tài liệu nào trước đó, file này là bản có hiệu lực.** Phiên bản: 1.0 — FROZEN · 2026-08-03.

---

# 8. Open Questions

> ⚠️ **Sáu vấn đề dưới đây CHƯA CHỐT và CỐ Ý NẰM NGOÀI PHẠM VI IMPLEMENT.**
>
> **AI Developer KHÔNG được tự lấp bất kỳ mục nào ở đây.** Không tự chọn giá trị mặc định, không tự suy ra luật, không "làm sẵn cho chắc". Nếu một task chạm tới một OQ, dừng lại và hỏi Human.
>
> **Không OQ nào chặn việc bắt đầu Day 3.** Cột cuối giải thích vì sao.

---

## OQ-01

**Bệnh nhân từ chối nhiều lần liên tiếp thì xử lý thế nào?**

Có nên tạm dừng entry sau N lần từ chối? N bằng bao nhiêu?

| | |
| --- | --- |
| **Vì sao quan trọng** | Một entry `urgent` từ chối liên tục sẽ luôn đứng đầu hàng đợi và làm chậm mọi slot |
| **Ai phải trả lời** | Ban giám đốc + Medical Staff — đây là quyết định **chính sách**, không phải kỹ thuật |
| **Phương án đề xuất** | Sau 3 lần từ chối liên tiếp, entry → `paused` và báo staff |
| **Vì sao không chặn Day 3** | Phiên bản 1 **không** tự pause. Từ chối nhiều lần vẫn giữ `waiting`. Nếu sau này chốt, chỉ cần thêm cột `consecutive_declines` + một điều kiện lọc — **không phá schema** |

---

## OQ-02

**Có nên đề xuất "dời lịch" cho bệnh nhân đang bận đúng giờ đó không?**

BR-03d hiện **loại** bệnh nhân có lịch hẹn chồng giờ khỏi danh sách ứng viên. Nhưng nếu slot mới tốt hơn lịch cũ của họ thì sao?

| | |
| --- | --- |
| **Vì sao quan trọng** | Có thể bỏ lỡ những ca đổi lịch mang lại giá trị cao |
| **Ai phải trả lời** | Medical Staff |
| **Vì sao không chặn Day 3** | Phần **an toàn** đã chốt (BR-03d loại khỏi ứng viên), đủ để hệ thống không tạo lịch chồng nhau. Phần "đề xuất dời lịch" là một feature riêng, cần cả API đổi lịch mà MedBook chưa có (Đính chính 2) |

---

## OQ-03

**Bệnh nhân có được tự đăng ký vào danh sách chờ không? Khi nào mở? Có cần staff duyệt?**

| | |
| --- | --- |
| **Vì sao quan trọng** | Ảnh hưởng thiết kế bảng, API và mô hình phân quyền |
| **Ai phải trả lời** | Ban giám đốc |
| **Vì sao không chặn Day 3** | BR-08 chốt phiên bản 1: **chỉ staff**. Schema đã **chừa sẵn** cột `created_by_user_id` để phân biệt nguồn tạo — trả lời sau không cần migration phá vỡ |

---

## OQ-04

**Có cần lọc theo GIỜ TRONG NGÀY, ngoài lọc theo ngày không?**

Hiện tại `desired_from`/`desired_to` chỉ lọc theo **ngày**. Bệnh nhân đi làm có thể chỉ nhận được slot buổi chiều.

| | |
| --- | --- |
| **Vì sao quan trọng** | Đề xuất slot 08:00 cho người chỉ rảnh buổi chiều là làm phiền vô ích, và làm chậm chuỗi offer |
| **Ai phải trả lời** | Bệnh viện (dựa trên phản hồi thực tế của bệnh nhân) |
| **Vì sao không chặn Day 3** | Lọc theo ngày đã đủ cho MVP. Nếu chốt thêm, chỉ cần 2 cột `desired_time_from`/`desired_time_to` + 2 mệnh đề trong truy vấn chọn ứng viên |

---

## OQ-05

**Khi nào MedBook có kênh thông báo ngoài app (SMS / email / push)?**

Đây là **rủi ro nghiệp vụ lớn nhất** của feature: với hạn 15 phút và không có kênh đánh thức, xác suất bệnh nhân thấy đề xuất kịp là thấp.

| | |
| --- | --- |
| **Vì sao quan trọng** | Quyết định feature có tạo ra giá trị thật trong vận hành hay không |
| **Ai phải trả lời** | Ban giám đốc + Phòng IT |
| **Trạng thái hiện tại** | MedBook **không có** Notification Service (Đính chính 1). PRD loại trừ SMS/email |
| **Vì sao không chặn Day 3** | Kênh giao đề xuất là `GET /api/my-offers` (polling in-app). Đây là **giới hạn đã biết, đã chấp nhận**, **bắt buộc ghi vào `development-handoff.md`** để QA không đánh giá sai mức độ hoàn thành. Khi có kênh ngoài, chỉ cần thêm một consumer đọc `offer_events` — **không sửa Offer Engine** |

---

## OQ-06

**Chính sách lưu trữ nhật ký và kiểm soát việc gán mức ưu tiên y tế?**

Hai vấn đề đi cùng nhau: (a) `offer_events` giữ dữ liệu bao lâu? (b) `medical_priority` do staff gán tay, không có cơ chế kiểm soát — một nhân viên có thể gán `urgent` cho người quen.

| | |
| --- | --- |
| **Vì sao quan trọng** | (a) Dữ liệu y tế có ràng buộc lưu trữ pháp lý. (b) Đây là rủi ro **công bằng**, ảnh hưởng trực tiếp tới Business Goal |
| **Ai phải trả lời** | Phòng IT (a) · Ban giám đốc (b) |
| **Vì sao không chặn Day 3** | (a) Phiên bản 1 giữ vô thời hạn — khối lượng dữ liệu demo rất nhỏ. (b) **Không giải được bằng kỹ thuật** — cần quy trình duyệt hoặc audit định kỳ. Đã bù một phần: `created_by_user_id` cho phép truy được ai gán, và `offer_events` cho phép dựng lại toàn bộ chuỗi quyết định |

---

## Bảng tra nhanh Open Questions

| OQ | Vấn đề | Ai quyết | Chặn Day 3? | Đã chừa chỗ sẵn |
| --- | --- | --- | :---: | --- |
| OQ-01 | Từ chối liên tiếp → pause? | Ban giám đốc | ❌ | Thêm cột `consecutive_declines` |
| OQ-02 | Đề xuất dời lịch cũ? | Medical Staff | ❌ | Cần API đổi lịch (chưa có) |
| OQ-03 | Bệnh nhân tự đăng ký? | Ban giám đốc | ❌ | Cột `created_by_user_id` |
| OQ-04 | Lọc theo giờ trong ngày? | Bệnh viện | ❌ | Thêm 2 cột time |
| OQ-05 | Kênh thông báo ngoài app? | Ban giám đốc + IT | ❌ | Consumer đọc `offer_events` |
| OQ-06 | Retention nhật ký + kiểm soát ưu tiên | IT + Ban giám đốc | ❌ | `created_by_user_id`, `offer_events` |

---

---

[← Non-Functional Requirements (NFR-01 → NFR-08)](07-non-functional-requirements.md) · [Mục lục](README.md) · [Handoff Checklist →](09-handoff-checklist.md)
