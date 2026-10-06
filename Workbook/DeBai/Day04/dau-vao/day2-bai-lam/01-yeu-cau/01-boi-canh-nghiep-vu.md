# 01 · 01 — Bối cảnh nghiệp vụ

> **Mã:** WB2-01-01 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human] · **Cổng:** CP-01
> **Nguồn:** `de-bai/WB-2.docx` (Business Problem, Business Goal), `de-bai/MedBook_CaseStudy_5Days.pdf`, `00-boi-canh/01-he-thong-hien-tai.md` · **Bước WB-1:** WF-01

Tính năng: **Dynamic Appointment Rescheduling & Waiting List Management** — khi một khung giờ khám trở nên khả dụng, hệ thống tự chọn bệnh nhân phù hợp trong danh sách chờ, gửi đề xuất, chờ phản hồi trong một khoảng thời gian, hết hạn hoặc bị từ chối thì chuyển người kế tiếp.

---

## 1. Kiểm tra sẵn sàng — AI đã đủ ngữ cảnh để bắt đầu chưa?

| Loại thông tin | Mức | Căn cứ |
| --- | :---: | --- |
| Mục tiêu nghiệp vụ | ✅ Đã rõ | Business Goal của đề bài |
| Vấn đề cần giải quyết | ✅ Đã rõ | Business Problem của đề bài |
| Quy trình nghiệp vụ hiện tại | ⚠️ Một phần | Đề bài mô tả, nhưng **không khớp hệ thống thật** ở "đổi lịch", "thông báo lịch khám" → R-17 |
| Chức năng hiện có của MedBook | ✅ Đã rõ | Đã đối chiếu code (`00-boi-canh/01`) |
| API / service hiện có | ✅ Đã rõ | 16 endpoint, đã đối chiếu code |
| Các bên liên quan | ⚠️ Một phần | Nhóm vai trò rõ; **người cụ thể** chưa có |
| Quy tắc nghiệp vụ hiện có | ✅ Đã rõ | Đề bài + code |
| Quy tắc lựa chọn bệnh nhân trong danh sách chờ | ❌ Chưa rõ | Đề bài chỉ nêu ba tiêu chí, không nêu thứ tự áp dụng và cách phá hòa |
| Ràng buộc kỹ thuật | ✅ Đã rõ | K-01 → K-10 |
| Tiêu chí đánh giá thành công | ❌ Chưa rõ | Đề bài chỉ nêu mục tiêu định tính; số đo phải đề xuất (S1 → S5) |
| Tình huống ngoại lệ | ⚠️ Một phần | Đề bài chỉ nói "xử lý xung đột lịch" |

**Ba thông tin quan trọng nhất còn thiếu**

| # | Thông tin thiếu | Vì sao quan trọng | Xử lý ở |
| ---: | --- | --- | --- |
| 1 | Thứ tự áp dụng ba tiêu chí chọn bệnh nhân; cách phá hòa | AI có xu hướng tự đặt trọng số nghe thuyết phục nhưng không có nguồn | Q-01, Q-02 → BR-02 |
| 2 | Hạn trả lời, gửi tuần tự hay song song, một bệnh nhân giữ mấy đề xuất | Quyết định trải nghiệm bệnh nhân và độ phức tạp thiết kế | Q-04, Q-05, Q-06 → BR-04 → BR-06 |
| 3 | Tiêu chí thành công đo được | Không có số thì không viết được AC kiểm thử được | S1 → S5 bên dưới |

---

## 2. Business Problem Canvas

| Nội dung | Kết quả |
| --- | --- |
| **Vấn đề nghiệp vụ** | Khi một khung giờ khám bị trống đột ngột (bệnh nhân hủy lịch, staff mở lại slot), MedBook **không có cơ chế nào** xử lý. Nhân viên rà danh sách chờ, so sánh, gọi điện từng người, xử lý phản hồi, cập nhật lịch — thủ công. "Danh sách chờ" hiện cũng chưa tồn tại trong hệ thống, nằm trên giấy hoặc trong đầu nhân viên |
| **Pain points** | **P1** — Slot trống không được lấp, đặc biệt slot hủy sát giờ.<br>**P2** — Nhân viên tốn thời gian gọi điện thủ công.<br>**P3** — Bệnh nhân đang chờ không biết có cơ hội khám sớm.<br>**P4** — Không công bằng và không truy vết được: ai được gọi trước phụ thuộc trí nhớ và thiện chí của nhân viên.<br>**P5** — Rủi ro đặt trùng khi làm thủ công: hai nhân viên cùng hứa một slot cho hai bệnh nhân |
| **Mục tiêu nghiệp vụ** | Rút ngắn thời gian slot bị bỏ trống; giảm công gọi điện thủ công; làm cho thứ tự ưu tiên **rõ ràng, nhất quán và truy vết được** |
| **Stakeholder** | Bệnh nhân đang chờ · Nhân viên điều phối (staff) · Bác sĩ *(không có tài khoản trong hệ thống)* · Ban giám đốc bệnh viện · Tech Lead / phòng IT |
| **Giá trị kỳ vọng** | Slot trống được đề xuất tự động trong vài giây thay vì vài chục phút gọi điện. Thứ tự ưu tiên do luật nghiệp vụ quyết định. Mọi đề xuất và phản hồi được ghi lại |
| **Trong phạm vi** | • Danh sách chờ có cấu trúc<br>• Tự phát hiện slot trở nên khả dụng<br>• Chọn ứng viên theo luật xác định<br>• Gửi đề xuất có hạn trả lời; xử lý chấp nhận / từ chối / hết hạn<br>• Tự chuyển sang ứng viên kế tiếp<br>• Xử lý xung đột khi nhiều người cùng muốn một slot<br>• Màn hình bệnh nhân xem và trả lời đề xuất; màn hình staff quản lý danh sách chờ<br>• Nhật ký sự kiện |
| **Ngoài phạm vi** | • SMS / email / push thật *(đề bài loại trừ)*<br>• Thuật toán tối ưu nâng cao, chấm điểm bằng ML<br>• Bệnh nhân tự đăng ký vào danh sách chờ (**phiên bản 1**)<br>• Tài khoản đăng nhập cho bác sĩ<br>• Dashboard thống kê hiệu quả<br>• Tự dời lịch của bệnh nhân khác (chỉ xử lý slot **đã** trống)<br>• Đa ngôn ngữ, đa cơ sở |
| **Ràng buộc** | **C1** Không thêm dependency runtime (K-08) · **C2** Chạy được bằng một lệnh `docker compose up` (K-09) · **C3** Không đổi hành vi endpoint hiện có (K-10) · **C4** Không sửa cấu trúc 6 bảng hiện có; chỉ thêm bảng mới (K-05) · **C5** Giữ kiến trúc phân lớp (K-06) · **C6** Không có kênh liên lạc ngoài app · **C7** Dữ liệu y tế nhạy cảm: nội dung đề xuất không chứa lý do khám hay chẩn đoán · **C8** Auth demo giả mạo được ⇒ kiểm quyền sở hữu ở tầng service (K-02) |
| **Tiêu chí thành công** | **S1** Khi một lịch hẹn bị hủy, một đề xuất được gửi cho ứng viên đủ điều kiện trong **≤ 5 giây** `[ĐỀ XUẤT]`.<br>**S2** Đề xuất hết hạn được chuyển cho ứng viên kế tiếp trong **≤ 60 giây** sau khi hết hạn `[ĐỀ XUẤT]`.<br>**S3** Khi hai bệnh nhân cùng chấp nhận một slot: **đúng một** thành công, người còn lại nhận thông báo rõ ràng, **không có** dữ liệu lệch.<br>**S4** Mọi chuyển trạng thái của đề xuất đều được ghi nhật ký.<br>**S5** 14 test tích hợp hiện có vẫn xanh |

---

## 3. Vì sao đây là vấn đề của hệ thống, không phải của con người

Câu hỏi kiểm chứng: *có phải chỉ cần nhân viên chăm chỉ hơn?* Không, vì ba lý do:

1. **Cửa sổ thời gian quá hẹp.** Slot hủy trước giờ khám 40 phút chỉ có giá trị nếu tìm được người nhận trong khoảng đó; gọi điện tuần tự không đủ nhanh.
2. **Tiêu chí ưu tiên là luật nghiệp vụ, không phải thói quen.** Khi nhân viên tự chọn, bệnh viện không trả lời được "vì sao người này được gọi trước" — đây là rủi ro công bằng.
3. **Xung đột dữ liệu là bản chất.** Hai người gọi hai bệnh nhân cho cùng một slot sẽ tạo đặt trùng; hệ thống hiện có chặn ở cơ sở dữ liệu, nhưng người thứ hai đã bị hứa rồi mất.

---

## 4. Ranh giới với hệ thống hiện tại

| Việc | Hệ thống hiện tại | Tính năng mới |
| --- | --- | --- |
| Giữ danh sách người chờ | Không có | Có, có cấu trúc, có mức ưu tiên |
| Phát hiện slot trống | Không có | Tự động khi hủy lịch hoặc mở lại slot |
| Chọn người | Nhân viên tự quyết | Theo luật xác định (BR-02, BR-03) |
| Liên hệ bệnh nhân | Gọi điện | Đề xuất trong app |
| Xử lý im lặng / từ chối | Gọi tiếp bằng tay | Tự chuyển người kế tiếp |
| Truy vết | Không | Nhật ký sự kiện |
| Đặt lịch, hủy lịch, xác nhận lịch, quản lý slot | Đang chạy | **Giữ nguyên** contract |

---

## 5. Giả định

| ID | Giả định | Ảnh hưởng nếu sai | Trạng thái |
| --- | --- | --- | --- |
| A-01 | Thông báo chỉ trong app (bệnh nhân mở app thì thấy), không SMS/email | Nếu bệnh viện yêu cầu kênh ngoài, phải thêm nhà cung cấp và xét lại phương án kiến trúc | `[ĐỀ XUẤT]` — theo đề bài loại trừ SMS |
| A-02 | Staff gán mức ưu tiên y tế bằng tay; hệ thống không tự suy ra | Nếu cần tự suy từ dữ liệu y tế, phải có nguồn dữ liệu mà hệ thống hiện không có | `[ĐỀ XUẤT]` |
| A-03 | Chạy một instance ứng dụng | Nếu chạy nhiều instance, tiến trình quét hết hạn cần khóa phối hợp (RISK-04) | `[ĐỀ XUẤT]` |
