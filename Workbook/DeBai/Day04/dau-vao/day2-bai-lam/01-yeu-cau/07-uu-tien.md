# 01 · 07 — Ưu tiên và phạm vi MVP

> **Mã:** WB2-01-07 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human] · **Cổng:** CP-04
> **Nguồn:** `04-user-story.md`, `05-tieu-chi-chap-nhan.md`, `06-ra-soat-yeu-cau.md` · **Bước WB-1:** WF-05

**Nguyên tắc:** AI đề xuất, **Human quyết**. Cột "Human quyết" chỉ có hiệu lực khi được điền; hiện để trống (`☐`). Tiêu chí xếp: giá trị nghiệp vụ · độ cần thiết với luồng chính · phụ thuộc giữa story · **hậu quả nếu thiếu** · khả năng tái sử dụng cái đã có.

**Nguyên tắc cắt phạm vi được đề xuất:** *khi phải cắt, cắt cái làm hệ thống **chậm hơn**, không cắt cái làm hệ thống **sai**.*

---

## 1. Bảng ưu tiên

| Story | Đề xuất | Lý do | Human quyết |
| --- | :---: | --- | :---: |
| **US-01** Staff thêm vào danh sách chờ | **Must** | Không có dữ liệu danh sách chờ thì mọi story còn lại không chạy được | ☐ |
| **US-02** Phát hiện slot khả dụng, chọn ứng viên | **Must** | Giá trị lõi. Nếu chỉ làm được một story thì làm story này | ☐ |
| **US-03** Bệnh nhân nhận đề xuất | **Must** | Không có đầu ra thì US-02 vô nghĩa | ☐ |
| **US-04** Bệnh nhân chấp nhận | **Must** | Bước duy nhất tạo giá trị thật (lịch hẹn mới) | ☐ |
| **US-06** Xử lý hết hạn và chuyển tiếp | **Must** ⚠️ | **Điểm cần Human cân nhắc.** Dễ bị xem là "nhánh phụ" vì không có nút bấm. Nhưng trong thực tế, hết hạn là nhánh xảy ra nhiều nhất — phần lớn bệnh nhân sẽ không mở app trong 15 phút (R-01). Thiếu US-06, mỗi slot kẹt ở người đầu tiên và hệ thống rơi về đúng hiện trạng: staff gọi điện tay. Bỏ US-06 là bỏ lý do tồn tại của tính năng | ☐ |
| **US-07** Staff xem danh sách chờ và đề xuất | **Must** ⚠️ | **Điểm cần Human cân nhắc.** Dễ bị xếp Should. Không có màn hình này thì staff không kiểm chứng được hệ thống đang làm gì; không demo được, không gỡ lỗi được | ☐ |
| **US-05** Bệnh nhân từ chối | **Should** ⚠️ | **Điểm cần Human cân nhắc.** Dễ bị xếp Must vì là hành động hiển nhiên của người dùng. Nhưng từ chối chỉ là **tối ưu tốc độ**: không có nút từ chối, bệnh nhân chỉ cần không bấm gì, đề xuất hết hạn sau 15 phút và chuỗi vẫn tiến đúng (BR-07). Hệ thống chậm hơn, không sai | ☐ |
| **US-08** Staff hủy đăng ký chờ | **Should** | Cần cho chất lượng dữ liệu nhưng không chặn luồng chính | ☐ |
| **US-11** Staff xem nhật ký | **Should** | Bằng chứng cho P4 (công bằng, giải trình) và công cụ gỡ lỗi chính. **Việc ghi nhật ký (BR-15) vẫn nằm trong Must**; chỉ màn hình đọc là Should | ☐ |
| **US-10** Bệnh nhân tự đăng ký chờ | **Won't** (phiên bản này) | Phụ thuộc Q-13 chưa có quyết định | ☐ |
| **US-09** Bác sĩ xem người đang chờ | **Won't** (phiên bản này) | Bác sĩ không có tài khoản; thêm vai trò là thay đổi mô hình phân quyền, chi phí gấp nhiều lần bản thân story. Dễ bị xếp Should vì giá trị nghiệp vụ rõ, nhưng ràng buộc nằm rải trong tài liệu hệ thống (R-17) | ☐ |

---

## 2. Phạm vi MVP đề xuất — nhóm Must

| # | Story | Task |
| ---: | --- | --- |
| 1 | US-01 — Staff thêm đăng ký | TASK-01, 02, 03 |
| 2 | US-02 — Phát hiện slot và chọn ứng viên | TASK-04, 05 |
| 3 | US-03 — Bệnh nhân nhận đề xuất | TASK-06, 08 |
| 4 | US-04 — Bệnh nhân chấp nhận | TASK-06 |
| 5 | US-06 — Xử lý hết hạn | TASK-07 |
| 6 | US-07 — Staff xem danh sách chờ | TASK-03, 08 |

**MVP đạt khi:** một slot bị hủy ⇒ đề xuất tự gửi cho đúng người theo BR-02 ⇒ bệnh nhân thấy và chấp nhận được ⇒ có lịch hẹn mới; nếu không phản hồi thì sau 15 phút tự chuyển người kế tiếp; staff nhìn thấy toàn bộ quá trình.

**Ngoài MVP** (Should, làm nếu còn thời gian): US-05, US-08, US-11.

**Việc chưa chốt trong Must:** vì US-05 là Should nhưng dùng chung phần lớn logic với luồng hết hạn, việc hạ US-05 **không tiết kiệm nhiều công** — mục đích chính là làm rõ thứ tự phải đúng nếu hết giờ. Human cân nhắc có giữ US-05 trong MVP không.

---

## 3. Ma trận phụ thuộc

```
US-01 (dữ liệu danh sách chờ)
  └─► US-02 (chọn ứng viên)
        ├─► US-03 (bệnh nhân xem đề xuất)
        │     ├─► US-04 (chấp nhận) ──► kết thúc chuỗi
        │     └─► US-05 (từ chối)   ──┐
        └─► US-06 (hết hạn)         ──┴─► quay lại US-02

US-07 / US-08 / US-11: phụ thuộc US-01, độc lập với chuỗi đề xuất
```

**Hệ quả cho thứ tự làm việc ở WB-3:** không task nào chạm chuỗi đề xuất được trước khi dữ liệu và truy vấn danh sách chờ xong. Đường găng: **TASK-01 → TASK-04 → TASK-05 → TASK-06**.

---

## 4. Câu hỏi thảo luận (WB-2 Bước 6) — chờ Human

Các câu này chỉ trả lời được đầy đủ sau khi Human quyết ở cột cuối bảng §1. Phần dưới là **giả thuyết của AI** để Human đối chiếu.

| Câu hỏi | Giả thuyết của AI |
| --- | --- |
| AI và Human có chọn khác nhau không? | Khả năng cao khác ở US-05, US-06, US-09 — ba chỗ được đánh dấu ⚠️ |
| Nguyên nhân khác biệt? | AI dễ xếp ưu tiên theo **mức độ hiển nhiên của hành động** (nút bấm rõ ràng ⇒ quan trọng); người xếp theo **hậu quả nếu thiếu**. Đây là khác biệt về khung tư duy, không phải thiếu thông tin |
| Quyết định nào phụ thuộc giá trị nghiệp vụ AI khó xác định? | Việc hạ US-05: đòi hỏi phán đoán "chậm được, sai thì không" — đánh đổi thuộc về bệnh viện |
| Story nào AI đánh giá cao nhưng nên hoãn? | US-09: giá trị rõ, nhưng bị chặn bởi ràng buộc mô hình phân quyền |
