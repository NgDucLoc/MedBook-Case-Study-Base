# 00 · 02 — Thuật ngữ

> **Mã:** WB2-00-02 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Nguồn:** `00-boi-canh/01-he-thong-hien-tai.md`, `de-bai/WB-2.docx`

Mục đích: loại bỏ mơ hồ giữa người và AI. Khi một từ trong bộ tài liệu này xuất hiện, nó mang **đúng** nghĩa dưới đây.

---

## 1. Thuật ngữ nghiệp vụ

| Thuật ngữ | Định nghĩa chính xác | Đừng nhầm với |
| --- | --- | --- |
| **Slot** (khung giờ) | Một khung giờ khám của một bác sĩ, có ngày, giờ bắt đầu, giờ kết thúc, trạng thái. Tồn tại kể cả khi không ai đặt | "Lịch hẹn" |
| **Slot trở nên khả dụng** | Slot chuyển từ *đã đặt* sang *còn trống* vì một lịch hẹn bị hủy, hoặc staff mở lại slot. Chỉ hai trường hợp này (BR-01) | "Slot mới được tạo" — không tính |
| **Danh sách chờ** | Tập các đăng ký chờ của bệnh nhân muốn khám sớm hơn, kèm tiêu chí và mức ưu tiên y tế | Hàng đợi kỹ thuật (queue) |
| **Đăng ký chờ** (entry) | Một dòng đăng ký chờ của **một** bệnh nhân cho **một** tiêu chí (bác sĩ hoặc chuyên khoa). Một bệnh nhân có thể có nhiều đăng ký | "Bệnh nhân" |
| **Đề xuất** (offer) | Lời mời một bệnh nhân cụ thể nhận một slot cụ thể, có **hạn trả lời**. Chưa phải lịch hẹn | "Lịch hẹn" |
| **Hạn trả lời** | Khoảng thời gian từ lúc gửi đề xuất tới lúc hết hạn (BR-06) | Thời lượng của slot |
| **Chấp nhận đề xuất** | Hành động của bệnh nhân dẫn tới lịch hẹn mới được tạo, slot thành đã đặt, đăng ký chờ hoàn tất (BR-09) | "Xác nhận lịch" — đó là việc của staff trên lịch hẹn đã có |
| **Chuỗi đề xuất** | Các đề xuất liên tiếp cho **cùng một slot**, gửi lần lượt từng người, tới khi có người chấp nhận hoặc hết ứng viên | Nhiều đề xuất song song |
| **Mức ưu tiên y tế** | `urgent` / `high` / `normal`, do **staff** gán khi thêm vào danh sách chờ. Hệ thống không tự suy ra | Mức VIP; thứ tự đăng ký |
| **Thời gian chờ** | Thời điểm bệnh nhân được đưa vào danh sách chờ | Thời điểm tạo lịch hẹn |
| **Ứng viên** | Đăng ký chờ thỏa mọi điều kiện của BR-03 đối với một slot cụ thể | Mọi người trong danh sách chờ |
| **Thời gian tối thiểu trước giờ khám** | Khoảng cách tối thiểu giữa hiện tại và giờ bắt đầu slot để việc gửi đề xuất còn ý nghĩa (BR-16) | Hạn trả lời |

## 2. Trạng thái

**Đề xuất**

| Trạng thái | Nghĩa | Cuối? |
| --- | --- | :---: |
| `sent` | Đã gửi, đang chờ phản hồi, chưa quá hạn | Không |
| `accepted` | Đã chấp nhận, lịch hẹn đã được tạo | Có |
| `declined` | Bệnh nhân từ chối | Có |
| `expired` | Quá hạn không phản hồi | Có |
| `cancelled` | Hệ thống hủy vì slot không còn khả dụng, hoặc đăng ký chờ bị hủy | Có |

**Đăng ký chờ**

| Trạng thái | Nghĩa | Cuối? |
| --- | --- | :---: |
| `waiting` | Đang chờ, đủ điều kiện nhận đề xuất | Không |
| `offered` | Đang giữ một đề xuất `sent` | Không |
| `fulfilled` | Đã chấp nhận và có lịch hẹn | Có |
| `cancelled` | Bị rút khỏi danh sách chờ | Có |

**Đã có sẵn, không đổi:** `slots.status` = `available`, `booked` · `appointments.status` = `booked`, `confirmed`, `cancelled` · `appointments.type` = `in_person`, `online` · `users.role` = `patient`, `staff`.

## 3. Actor

| Actor | Là ai | Đăng nhập? |
| --- | --- | :---: |
| **Patient** (bệnh nhân) | `role = patient`, có hồ sơ | Có |
| **Medical Staff** (nhân viên điều phối) | `role = staff` | Có |
| **Doctor** (bác sĩ) | Dòng trong bảng bác sĩ — **là dữ liệu, không phải người dùng** | Không |
| **System Administrator** | **Chưa tồn tại** | Không |
| **System** (hệ thống) | Không phải người; hành động thay hệ thống (tự chọn ứng viên, tự xử lý hết hạn) | — |

Hệ quả: mọi story có actor là Doctor hoặc System Administrator **không thể thực thi** trong phạm vi hiện tại (US-09).

## 4. Thuật ngữ kỹ thuật xuất hiện trong phần thiết kế

| Thuật ngữ | Nghĩa trong MedBook |
| --- | --- |
| **Partial unique index** | Index duy nhất có mệnh đề `WHERE`; dùng để bảo đảm "một slot chỉ có một lịch hẹn hoạt động" mà vẫn cho đặt lại sau khi hủy |
| **`SELECT … FOR UPDATE`** | Khóa dòng trong transaction, request sau phải chờ; lớp chống race condition thứ nhất |
| **Conditional UPDATE** | `UPDATE … WHERE id = $1 AND status = 'sent' RETURNING id`; không có dòng trả về nghĩa là trạng thái đã đổi ⇒ báo xung đột |
| **Idempotency** | Gọi cùng một thao tác nhiều lần cho cùng kết quả |
| **Denormalized** | Lưu thêm dữ liệu suy ra được để truy vấn nhanh (`slots.status`); đổi lại có nguy cơ lệch |
| **Sweeper** | Tiến trình định kỳ trong app quét đề xuất quá hạn |

## 5. Ký hiệu trong bộ tài liệu

| Ký hiệu | Nghĩa |
| --- | --- |
| `[CẦN XÁC NHẬN]` | Chưa đủ căn cứ. AI **không** tự lấp; cần Human trả lời (NT-03) |
| `[ĐỀ XUẤT]` | Giá trị AI đề xuất, chờ stakeholder xác nhận. Chưa phải quyết định |
| `[BỎ]` | Mục bị bỏ nhưng giữ mã để không phá truy vết (NT-02) |
| `Reuse / Extend / New` | Loại thay đổi với thành phần hệ thống |
| `Must / Should / Could / Won't` | Mức ưu tiên MoSCoW |
| `Case` / `Repo` / `Suy ra` | Loại nguồn: đề bài / đã kiểm chứng trong repo / suy luận chưa xác nhận |
