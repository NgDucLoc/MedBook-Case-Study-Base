# 01 · 02 — Làm rõ yêu cầu

> **Mã:** WB2-01-02 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human] · **Cổng:** CP-02
> **Nguồn:** `01-boi-canh-nghiep-vu.md`, `de-bai/WB-2.docx` (gợi ý 11 khía cạnh cần làm rõ) · **Bước WB-1:** WF-02

Mỗi câu hỏi nêu **thiếu gì, vì sao quan trọng, ai nên trả lời**. AI **không** tự trả lời thay stakeholder (NT-03); cột trả lời chỉ là **đề xuất** trừ khi ghi nguồn khác.

**Trạng thái**

| Trạng thái | Nghĩa |
| --- | --- |
| `Case` | Câu trả lời có sẵn trong đề bài — đã có căn cứ |
| `Đề xuất` | AI đề xuất, **chờ stakeholder xác nhận**. Đã thành BR ở trạng thái chờ duyệt; nếu stakeholder đổi thì sửa BR (NT-05) |
| `Open` | Chưa có câu trả lời và AI không đề xuất giá trị. **Không được tự lấp** |

---

## 1. Bảng làm rõ

| ID | Thông tin còn thiếu | Câu hỏi cần làm rõ | Vì sao quan trọng | Stakeholder | Câu trả lời / đề xuất | Trạng thái | → BR |
| --- | --- | --- | --- | --- | --- | :---: | :---: |
| **Q-01** | Quy tắc chọn bệnh nhân khi nhiều người cùng đủ điều kiện | Ưu tiên theo tiêu chí nào, thứ tự ra sao? | Đề bài có ba tiêu chí nhưng không có thứ tự; sai luật này là sai toàn bộ tính công bằng | Medical Staff, Ban giám đốc | Ưu tiên **mức độ khẩn cấp y tế** trước, sau đó **thời gian đăng ký chờ** (vào trước được trước) — trùng ví dụ của đề bài WB-2 | **Case** | BR-02 |
| **Q-02** | Cách phá hòa khi cùng mức ưu tiên và cùng thời điểm đăng ký | Chọn ai? Ngẫu nhiên? | Không có phá hòa xác định thì không lặp lại được ⇒ không test được, không giải thích được với bệnh nhân | Tech Lead | Phá hòa bằng thứ tự tạo đăng ký (mã tăng dần). **Không dùng ngẫu nhiên** | Đề xuất | BR-02 |
| **Q-03** | Điều kiện để một bệnh nhân "phù hợp" với slot | Phải đúng bác sĩ, hay đúng chuyên khoa là đủ? | Quyết định phạm vi ứng viên và tỷ lệ lấp slot | Medical Staff | Đăng ký chờ theo **một trong hai** kiểu: theo bác sĩ cụ thể (chỉ khớp slot của bác sĩ đó), hoặc theo chuyên khoa (khớp mọi bác sĩ trong chuyên khoa) | Đề xuất | BR-03 |
| **Q-04** | Hạn trả lời của bệnh nhân | Bao nhiêu phút? Cố định hay đổi theo khoảng cách tới giờ khám? | Quá dài thì slot chết; quá ngắn thì bệnh nhân không kịp thấy | Medical Staff, Tech Lead | **15 phút**, cấu hình được; không đổi động ở phiên bản 1 | Đề xuất | BR-06 |
| **Q-05** | Số bệnh nhân nhận đề xuất cùng lúc cho một slot | Gửi song song hay tuần tự? | Song song lấp nhanh hơn nhưng tạo "hứa rồi rút lại" — rất xấu trong bối cảnh y tế | Ban giám đốc | **Tuần tự**: mỗi slot tại một thời điểm chỉ có một đề xuất đang chờ | Đề xuất | BR-04 |
| **Q-06** | Một bệnh nhân giữ nhiều đề xuất cùng lúc? | Nếu chờ ở 3 chuyên khoa và cả 3 cùng có slot? | Nếu cho phép, có thể chấp nhận cả 3 rồi hủy 2 — quay lại bài toán slot chết | Medical Staff | **Không**: mỗi bệnh nhân tối đa một đề xuất đang chờ | Đề xuất | BR-05 |
| **Q-07** | Bệnh nhân từ chối nhiều lần liên tiếp | Có tạm dừng đăng ký sau N lần từ chối không? N bằng mấy? | Nếu không có luật, một đăng ký từ chối liên tục sẽ chặn đầu hàng đợi | Ban giám đốc, Medical Staff | **Chưa có quyết định.** Gợi ý để cân nhắc: tạm dừng sau 3 lần từ chối liên tiếp. Đây là **chính sách**, không phải kỹ thuật | **Open** | *(chừa BR-17)* |
| **Q-08** | Slot bị chặn/đặt trong lúc đang có đề xuất chờ | Đề xuất xử lý thế nào? Bệnh nhân được báo gì? | Không xử lý thì bệnh nhân bấm chấp nhận và nhận lỗi khó hiểu | Medical Staff | Đề xuất chuyển sang hủy; đăng ký chờ quay lại chờ **không mất lượt**; bệnh nhân thấy "Khung giờ không còn khả dụng" | Đề xuất | BR-10 |
| **Q-09** | Bệnh nhân đã có lịch hẹn trùng khung giờ với slot được đề xuất | Có nhận đề xuất không? Có tự hủy lịch cũ khi chấp nhận không? | Chấp nhận đề xuất trùng giờ tạo hai lịch chồng nhau | Medical Staff | **Phần an toàn** (đề xuất): loại đăng ký đó khỏi ứng viên. **Phần "đề xuất dời lịch" / tự hủy lịch cũ: chưa có quyết định** | Đề xuất *(phần loại)* · **Open** *(phần dời lịch)* | BR-03 (d) |
| **Q-10** | Nội dung thông báo gửi cho bệnh nhân | Được ghi những gì? | Đây là dữ liệu y tế; lộ lý do khám hay chuyên khoa nhạy cảm là vi phạm quyền riêng tư | Ban giám đốc, IT | Chỉ: tên bác sĩ, chức danh, chuyên khoa, phòng, ngày, giờ bắt đầu–kết thúc, hạn trả lời. **Không** lý do khám, chẩn đoán, mức ưu tiên y tế | Đề xuất | BR-11 |
| **Q-11** | Slot quá sát giờ có nên đề xuất không | Ngưỡng tối thiểu là bao nhiêu? | Đề xuất slot còn 10 phút là làm phiền vô ích; ngưỡng quá lớn thì bỏ phí slot cuối ngày | Medical Staff | **30 phút**, cấu hình được; bệnh viện cần xác nhận theo thực tế di chuyển | Đề xuất | BR-16 |
| **Q-12** | Ai được thêm/xóa bệnh nhân khỏi danh sách chờ | Bệnh nhân tự làm được không? | Ảnh hưởng phạm vi giao diện và phân quyền | Medical Staff | Phiên bản 1: **chỉ staff**. Bệnh nhân xem và trả lời đề xuất của mình | Đề xuất | BR-13 |
| **Q-13** | Bệnh nhân tự đăng ký chờ ở phiên bản sau | Khi nào mở? Có cần duyệt không? | Biết trước thì thiết kế dữ liệu chừa được chỗ | Ban giám đốc | **Chưa có quyết định.** Thiết kế nên chừa khả năng ghi nhận ai tạo đăng ký | **Open** | — |
| **Q-14** | Bệnh nhân có xem được mình đứng thứ mấy không | Hiện vị trí, hay chỉ "đang chờ"? | Hiện vị trí lộ thông tin về bệnh nhân khác (bao nhiêu người khẩn cấp hơn) | Ban giám đốc | **Không hiện vị trí.** Chỉ "Đang trong danh sách chờ" | Đề xuất | BR-12 |
| **Q-15** | Lưu nhật ký đề xuất bao lâu | Chính sách lưu giữ? | Dữ liệu y tế có ràng buộc lưu giữ | IT | Phiên bản 1: giữ vô thời hạn (dữ liệu demo, khối lượng nhỏ); chính sách xóa thật vào backlog kỹ thuật | Đề xuất | BR-15 |
| **Q-16** | Nếu không còn ứng viên nào cho slot | Hệ thống làm gì? | Không định nghĩa thì slot rơi vào trạng thái mập mờ | Medical Staff | Slot giữ nguyên còn trống (bệnh nhân vẫn đặt chủ động được); staff thấy ghi nhận "hết ứng viên" trong nhật ký | Đề xuất | BR-08 |

**Thống kê:** 16 câu — `Case`: 1 (Q-01) · `Đề xuất`: 12 câu (Q-02, 03, 04, 05, 06, 08, 10, 11, 12, 14, 15, 16) · `Open`: 2 câu (Q-07, Q-13) · **hỗn hợp**: Q-09 (phần loại ứng viên là `Đề xuất`, phần dời lịch là `Open`).

---

## 2. Ba câu quan trọng nhất

1. **Q-01 + Q-02 — quy tắc chọn và cách phá hòa.** Nếu để AI tự quyết, nó dễ dựng hàm chấm điểm có trọng số do nó tự đặt. Đề bài cho sẵn ví dụ "khẩn cấp trước, rồi thời gian đăng ký" nên chọn thứ tự từ điển: đơn giản, giải thích được, test được.
2. **Q-05 — tuần tự hay song song.** AI không trả lời đúng được: đây là đánh đổi giữa tốc độ lấp slot và trải nghiệm bị hứa rồi rút lại — giá trị nghiệp vụ của bệnh viện.
3. **Q-09 — xung đột lịch của chính bệnh nhân.** Edge case dễ bị bỏ sót; nếu bỏ sót, hệ thống tạo hai lịch chồng nhau.

---

## 3. Ba câu `Open` — không chặn WB-3

| ID | Chặn task nào | Cách đi tiếp khi chưa có câu trả lời |
| --- | --- | --- |
| Q-07 | Không | Phiên bản 1 **không** tự tạm dừng đăng ký; từ chối nhiều lần vẫn giữ trạng thái chờ. Nếu sau này chốt, chỉ thêm một cột đếm và một điều kiện lọc |
| Q-09 (phần dời lịch) | Không | Phần loại ứng viên đã đủ an toàn. "Đề xuất dời lịch" là tính năng riêng |
| Q-13 | Không | Thiết kế dữ liệu chừa sẵn cột ghi nhận người tạo |

**Mọi `Open` đều có chủ và cách đi tiếp.** AI không được điền giá trị vào chỗ này (NT-03).

---

## 4. Việc Human cần làm

| # | Việc |
| ---: | --- |
| 1 | Xác nhận hoặc đổi từng câu `Đề xuất`. **Đặc biệt** Q-04 (15 phút), Q-05 (tuần tự), Q-11 (30 phút) — ba giá trị số/chính sách ảnh hưởng nhiều nhất |
| 2 | Xác nhận ba câu `Open` được để trống có chủ đích ở phiên bản 1 |
| 3 | Nếu đổi một câu trả lời, sửa BR tương ứng (`03-quy-tac-nghiep-vu.md`) **trước**, rồi mới sửa các file sau (NT-05) |
