# 01 · 04 — User story

> **Mã:** WB2-01-04 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human] · **Cổng:** CP-03
> **Nguồn:** `01-boi-canh-nghiep-vu.md`, `02-lam-ro.md`, `03-quy-tac-nghiep-vu.md` · **Bước WB-1:** WF-04

Mỗi story có một actor cụ thể, một mục tiêu, một giá trị, phát triển và kiểm thử độc lập được, và **không chứa quy tắc chưa xác nhận** — quy tắc nằm ở BR, story chỉ trỏ tới.

---

## 1. Backlog

| ID | Actor | User story | Giá trị nghiệp vụ | Phụ thuộc giả định / câu hỏi | BR |
| --- | --- | --- | --- | --- | --- |
| **US-01** | Medical Staff | Là nhân viên điều phối, tôi muốn **thêm một bệnh nhân vào danh sách chờ** kèm bác sĩ hoặc chuyên khoa mong muốn và mức ưu tiên y tế, để hệ thống có dữ liệu chọn người khi có slot trống | Biến danh sách chờ từ giấy tờ / trí nhớ thành dữ liệu có cấu trúc — điều kiện tiên quyết của mọi story còn lại | A-02, Q-13 | BR-13, BR-15 |
| **US-02** | System | Là hệ thống, tôi muốn **tự phát hiện khi một slot trở nên khả dụng** và chọn ứng viên phù hợp nhất theo luật ưu tiên, để slot trống được lấp mà không cần ai gọi điện | Xóa P1 và P2; giá trị lõi của tính năng | — | BR-01, BR-02, BR-03, BR-08, BR-16 |
| **US-03** | Patient | Là bệnh nhân trong danh sách chờ, tôi muốn **nhận đề xuất khung giờ trống kèm hạn trả lời**, để biết mình có cơ hội khám sớm hơn và có bao lâu để quyết định | Xóa P3 | A-01 | BR-05, BR-06, BR-11, BR-12 |
| **US-04** | Patient | Là bệnh nhân nhận được đề xuất, tôi muốn **chấp nhận và có ngay lịch hẹn**, để không phải đặt lại thủ công và không sợ mất chỗ | Chuyển đề xuất thành giá trị thật; bước duy nhất tạo lịch hẹn mới | — | BR-09, BR-14 |
| **US-05** | Patient | Là bệnh nhân nhận được đề xuất, tôi muốn **từ chối**, để khung giờ được chuyển ngay cho người khác thay vì chờ hết hạn | Rút ngắn thời gian slot chết | Q-07 | BR-07, BR-14 |
| **US-06** | System | Là hệ thống, tôi muốn **tự đánh dấu hết hạn các đề xuất quá thời gian và chuyển sang người kế tiếp**, để một người không phản hồi không làm kẹt cả khung giờ | Bảo đảm chuỗi đề xuất luôn tiến; đây là nhánh xảy ra nhiều nhất trong thực tế | — | BR-06, BR-07, BR-08 |
| **US-07** | Medical Staff | Là nhân viên điều phối, tôi muốn **xem toàn bộ danh sách chờ và trạng thái các đề xuất đang diễn ra**, để biết slot nào đang được xử lý và không gọi điện chồng chéo | Xóa P5; cho staff kiểm soát mà không phải can thiệp thủ công | — | BR-13 |
| **US-08** | Medical Staff | Là nhân viên điều phối, tôi muốn **hủy một đăng ký chờ**, để danh sách phản ánh đúng thực tế khi bệnh nhân đã khám nơi khác hoặc không còn nhu cầu | Giữ chất lượng dữ liệu; tránh gửi đề xuất vô ích | — | BR-10, BR-13, BR-15 |
| **US-09** | Doctor | Là bác sĩ, tôi muốn xem những bệnh nhân đang chờ khám với mình, để chủ động mở thêm khung giờ | Có giá trị nhưng **không thực thi được**: bác sĩ không có tài khoản | **Bị chặn bởi hệ thống hiện tại** | — |
| **US-10** | Patient | Là bệnh nhân, tôi muốn **tự đăng ký vào danh sách chờ**, để không phải gọi cho nhân viên | Giảm tải staff | **Phụ thuộc Q-13 (`Open`)** | — |
| **US-11** | Medical Staff | Là nhân viên điều phối, tôi muốn **xem nhật ký các đề xuất đã gửi và kết quả**, để trả lời được khi bệnh nhân hỏi vì sao mình không được mời | Xóa P4; trách nhiệm giải trình | — | BR-15 |

---

## 2. Bản đồ story → luồng nghiệp vụ

```
   US-01 ──► danh sách chờ
   (staff thêm)     │
                    │      Hủy lịch / mở lại slot
                    │           │
                    ▼           ▼
                 US-02 ──► chọn ứng viên (BR-02, BR-03)
                              │
                              ▼
                     US-03 (gửi đề xuất, có hạn)
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    US-04 chấp nhận     US-05 từ chối       US-06 hết hạn
          │                   └─────────┬─────────┘
          ▼                             ▼
   lịch hẹn mới             quay lại US-02 (BR-07)

   US-07 / US-08 / US-11: staff quan sát và can thiệp, ngoài chuỗi tự động
```

---

## 3. Kiểm tra chất lượng (theo tiêu chí của cổng CP-03)

| Tiêu chí | US-01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 11 |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Actor rõ ràng | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Không trộn giải pháp kỹ thuật | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| Có giá trị nghiệp vụ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Không chứa quy tắc chưa xác nhận (chỉ trỏ BR) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Phát triển và kiểm thử độc lập được | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Không trùng lặp | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |

**Ghi chú ⚠️**

- **US-02, US-06 có actor là System** — về hình thức không phải user story chuẩn. **Đề xuất giữ lại có chủ ý** `[CẦN XÁC NHẬN — HR2-03]`: đây là hai hành vi tự động mang giá trị lớn nhất của tính năng. Nếu ép viết theo góc nhìn người dùng, hành vi hết hạn sẽ bị chôn trong US-03 và dễ bị bỏ sót khi viết test — chính là điểm đứt gãy DR-02 của WB-1.
- **US-03 và US-06 chồng lấn ở "hết hạn"**: US-03 nói bệnh nhân *thấy* hạn, US-06 nói hệ thống *xử lý* hạn. Giữ tách; AC phân định rõ (AC-03.x là hiển thị, AC-06.x là hành vi tự động) — xem R-14.

---

## 4. Story bị loại khỏi phạm vi hiện tại

| ID | Lý do | Điều kiện đưa vào lại |
| --- | --- | --- |
| **US-09** | Bác sĩ không có tài khoản; thêm vai trò bác sĩ là thay đổi mô hình phân quyền, vượt xa phạm vi | Hệ thống bổ sung vai trò bác sĩ và liên kết tài khoản với hồ sơ bác sĩ |
| **US-10** | Phụ thuộc Q-13 chưa có quyết định | Q-13 được trả lời |

Hai story này **giữ mã**, không xóa, để truy vết không đứt khi quay lại (NT-02).
