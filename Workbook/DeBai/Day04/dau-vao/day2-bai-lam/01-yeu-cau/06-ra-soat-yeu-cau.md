# 01 · 06 — Rà soát yêu cầu và phân tích khoảng trống

> **Mã:** WB2-01-06 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human] · **Cổng:** CP-04
> **Nguồn:** `01-boi-canh-nghiep-vu.md` → `05-tieu-chi-chap-nhan.md`, `00-boi-canh/01-he-thong-hien-tai.md` · **Bước WB-1:** WF-05

**Vai:** Business Analyst + Software Architect (do AI đảm nhận, Human quyết).
**Nguyên tắc:** chỉ **nêu vấn đề, phân tích tác động, đề xuất câu hỏi**. Không tự sửa quy tắc nghiệp vụ. Cột "Human quyết" để trống (`☐`) cho tới khi bạn duyệt.

---

## 1. Bảng vấn đề

| ID | Loại | Mô tả | Mức | Đề xuất xử lý | Human quyết |
| --- | --- | --- | :---: | --- | :---: |
| **R-01** | Thiếu | **Không có kênh báo ngoài app.** Đề bài loại trừ SMS/email/push. Bệnh nhân chỉ biết có đề xuất khi mở app. Với hạn 15 phút, xác suất bệnh nhân thấy kịp là thấp | **High** | Chấp nhận là giới hạn đã biết của phiên bản 1, ghi thành RISK-06. Thiết kế thông báo tách riêng để sau này gắn kênh ngoài mà không sửa luật nghiệp vụ | ☐ |
| **R-02** | Mâu thuẫn | **Hạn 15 phút (BR-06) mâu thuẫn với thời gian tối thiểu 30 phút (BR-16) ở biên**: slot bắt đầu sau 31 phút vẫn được đề xuất, nhưng hạn 15 phút cộng thời gian di chuyển là không thực tế | Medium | Đã cắt hạn theo giờ bắt đầu slot (BR-06). Việc thời gian tối thiểu có nên lớn hơn hạn hay không là quyết định vận hành, gắn Q-11 | ☐ |
| **R-03** | Mơ hồ | **"Bệnh nhân phù hợp nhất" không được định nghĩa.** Đề bài nêu ba tiêu chí, không nêu thứ tự áp dụng, không nêu cách phá hòa | **High** | Đã chuyển thành BR-02 với thứ tự tường minh và phá hòa xác định (Q-01, Q-02). **Đây là chỗ AI dễ tự bịa nhất** | ☐ |
| **R-04** | Thiếu | **Hồ sơ bệnh nhân không có trường nào mang mức ưu tiên y tế.** Không có ngày sinh, không có tình trạng bệnh | **High** | Không sửa bảng hồ sơ bệnh nhân (C4). Đặt mức ưu tiên trên **đăng ký chờ** — đúng ngữ nghĩa hơn vì gắn với lần chờ này, không phải thuộc tính vĩnh viễn của người | ☐ |
| **R-05** | Giả định | Giả định bệnh nhân chỉ chờ theo bác sĩ hoặc chuyên khoa, không theo **khung giờ trong ngày**. Bệnh nhân đi làm có thể chỉ nhận được buổi chiều | Medium | Đã thêm khoảng ngày mong muốn (BR-03 e). Lọc theo giờ trong ngày **chưa hỗ trợ** | ☐ |
| **R-06** | Ca biên | **Bệnh nhân chấp nhận đề xuất khi đang có lịch hẹn chồng giờ.** Nếu không lọc, hệ thống tạo hai lịch chồng nhau | **High** | Đã thành BR-03 (d): loại khỏi ứng viên. Phần "đề xuất dời lịch cũ" treo ở Q-09. **Lưu ý:** hệ thống hiện tại cũng không chặn bệnh nhân tự đặt hai lịch trùng giờ (đã tái hiện — `Workbooks/boi-canh-chung/` HT-GAP-03), nên BR-03 (d) là luật **mới**, không thừa hưởng | ☐ |
| **R-07** | Ca biên | **Không có luật cho từ chối liên tục.** Một đăng ký `urgent` từ chối mọi đề xuất sẽ luôn đứng đầu và làm chậm mọi slot | Medium | Phiên bản 1 **không** tự tạm dừng (Q-07 `Open`). Nói ra để không ai tưởng đã xử lý | ☐ |
| **R-08** | Không phù hợp hệ thống | **Hệ thống hiện tại không chặn slot chồng giờ của cùng bác sĩ.** BR-03 (d) so khoảng giờ, nếu dữ liệu slot đã chồng nhau thì kết quả lọc có thể lạ | Low | Ngoài phạm vi. Ghi nhận nợ kỹ thuật. Dữ liệu mẫu không có slot chồng | ☐ |
| **R-09** | NFR — độ tin cậy | **Tiến trình xử lý hết hạn chạy trong tiến trình ứng dụng.** Khởi động lại giữa chừng thì lượt đang dở mất; chạy nhiều instance thì chạy song song | **High** | Thiết kế **idempotent**, trạng thái nằm ở cơ sở dữ liệu, không ở bộ nhớ (RISK-04). Chấp nhận một instance ở phiên bản 1 (A-03) | ☐ |
| **R-10** | NFR — hiệu năng | **Không có yêu cầu về thời gian phản hồi.** "Tự động" là bao nhanh? | Medium | Đã cụ thể hóa: S1 (≤ 5 giây), S2 (≤ 60 giây); vào AC-02.1, AC-06.1 để kiểm thử được | ☐ |
| **R-11** | Bảo mật | **Đăng nhập demo giả mạo được.** Bất kỳ ai đoán được mã đề xuất và đổi header đều chấp nhận được đề xuất của người khác | **High** | Không sửa được cơ chế đăng nhập (ngoài phạm vi, sẽ phá test cũ). Bù bằng BR-14: kiểm chủ sở hữu ở tầng service; AC-04.5, AC-05.4 (RISK-01) | ☐ |
| **R-12** | Quyền riêng tư | **Danh sách chờ hiển thị mức ưu tiên y tế của mọi bệnh nhân cho staff.** Dữ liệu nhạy cảm | Medium | Chấp nhận: staff là vai trò nghiệp vụ được phép. Bệnh nhân tuyệt đối không thấy (BR-12). Không ghi mức ưu tiên vào nhật ký (BR-15) | ☐ |
| **R-13** | Công bằng | **`urgent` do staff gán tay, không có kiểm soát.** Nhân viên có thể gán `urgent` cho người quen | Medium | Không giải được bằng kỹ thuật — là kiểm soát quy trình. Bù một phần: ghi ai tạo đăng ký; nhật ký dựng lại được chuỗi quyết định | ☐ |
| **R-14** | Trùng lặp | US-03 và US-06 chồng lấn ở "hết hạn" | Low | Giữ tách; AC-03.x là hiển thị, AC-06.x là hành vi tự động | ☐ |
| **R-15** | Thiếu | **Không có yêu cầu về dữ liệu mẫu cho tính năng mới.** Không có đăng ký mẫu thì không demo được | Medium | Bổ sung dữ liệu mẫu: 3 đăng ký, 3 mức ưu tiên khác nhau, ngày tương đối. Thành TASK-09 | ☐ |
| **R-16** | Mơ hồ | **Hình thức khám (`in_person` / `online`) của lịch hẹn tạo từ đề xuất lấy từ đâu?** Bệnh nhân đặt chủ động thì tự chọn, nhưng đề xuất do hệ thống gửi | Medium | Lấy từ đăng ký chờ; staff nhập khi tạo, mặc định `in_person` (BR-09) | ☐ |
| **R-17** | **Không khớp hệ thống** ⚠️ | **Đề bài mô tả hiện trạng có những thứ hệ thống thật không có.** WB-2 liệt kê chức năng "Đổi lịch", "Thông báo lịch khám", "Quản lý bệnh nhân / bác sĩ", actor "Admin", và luật "Lịch đã xác nhận phải thông báo cho bác sĩ", "Nhân viên có thể đổi lịch". Đối chiếu code: **không có** endpoint đổi lịch, **không có** thông báo, **không có** vai trò Admin, bác sĩ không đăng nhập (bảng đối chiếu đầy đủ: `Workbooks/boi-canh-chung/08-khoang-trong.md` §2, HT-GAP-21) | **High** | Lấy **hệ thống thật** (code + tài liệu repo) làm chuẩn cho hiện trạng. Không coi "đổi lịch" và "thông báo" là thành phần có sẵn để tái sử dụng. Tên tính năng có chữ "Rescheduling" nhưng phạm vi chỉ xử lý slot đã trống (đã nêu ở Ngoài phạm vi) | ☐ |
| **R-18** | **Không khớp hệ thống thật** ⚠️ | **Múi giờ của dữ liệu chưa được quy ước.** Máy chủ và PostgreSQL chạy **UTC**; `date` và giờ của slot không kèm múi giờ (giờ do staff nhập là giờ địa phương). BR-06 (hạn = min(gửi + 15 phút, giờ bắt đầu slot)) và BR-16 (tối thiểu 30 phút trước giờ khám) đều so sánh `date + start_time` với thời điểm hiện tại ⇒ lệch bằng độ lệch múi giờ (UTC+7 ⇒ 7 giờ): slot 09:00 giờ địa phương bị hiểu là 09:00 UTC. Đã kiểm `show timezone` (`Workbooks/boi-canh-chung/` HT-GAP-23) | **High** | Cần quyết định trước WB-3: (a) đặt múi giờ chuẩn cho dữ liệu slot và tính toán (ví dụ đặt múi giờ của tiến trình / kết nối là múi giờ bệnh viện), hoặc (b) lưu slot kèm múi giờ. Đây là **quyết định của Human**, không phải chi tiết cài đặt; không được để AI tự chọn | ☐ |

> **R-17 và R-18 là phát hiện mới** của lần soạn này, không có trong bản mẫu; cả hai có bằng chứng ở `Workbooks/boi-canh-chung/`. R-17: nếu AI đọc mô tả đề bài mà không đối chiếu code, nó sẽ thiết kế dựa trên chức năng không tồn tại. R-18: hai quy tắc thời gian (BR-06, BR-16) sẽ sai lệch nếu không chốt múi giờ.

**Thống kê:** 18 vấn đề — High: 8 (R-01, 03, 04, 06, 09, 11, 17, 18) · Medium: 8 · Low: 2.

---

## 2. Ba vấn đề quan trọng nhất

### R-03 — "Bệnh nhân phù hợp nhất" không được định nghĩa
Đề bài viết ba tiêu chí nhưng không nói thứ tự. Đưa nguyên văn cho AI, kết quả dễ là một hàm chấm điểm có trọng số **do AI tự đặt** — nghe rất thuyết phục và hoàn toàn không có nguồn từ bệnh viện. **Xử lý:** biến thành Q-01/Q-02, chọn thứ tự từ điển thay vì chấm điểm: đơn giản, giải thích được với bệnh nhân, test được (AC-02.7 chạy 10 lần ra cùng kết quả).

### R-11 — Đăng nhập demo giả mạo được
Hệ thống nền cố ý dùng đăng nhập yếu (ADR-002). Tính năng mới thao tác trên dữ liệu y tế cá nhân; nếu chỉ kiểm vai trò như các endpoint hiện có, bệnh nhân nào cũng chấp nhận được đề xuất của người khác. **Xử lý:** nâng thành luật nghiệp vụ BR-14 và ép có test AC-04.5, AC-05.4; rủi ro còn lại ghi ở RISK-01.

### R-17 — Đề bài mô tả hiện trạng không khớp hệ thống thật
Xem bảng. **Xử lý:** đối chiếu code làm chuẩn và ghi rõ nguồn ở `00-boi-canh/01-he-thong-hien-tai.md`.

---

## 3. Kiểm tra theo tiêu chí của cổng CP-04

Cột "AI đánh giá" là nhận định của AI; **cổng chỉ qua khi Human xác nhận**.

| Tiêu chí | AI đánh giá | Ghi chú |
| --- | :---: | --- |
| Không còn yêu cầu mơ hồ hoặc mâu thuẫn | ⚠️ | R-02, R-03, R-16 đã chốt thành BR (đề xuất); R-17 cần Human quyết |
| Assumption và Open Question được xử lý hoặc ghi nhận rõ | ✅ | 3 câu `Open` (Q-07, Q-09-phần dời lịch, Q-13) và R-05, R-13 có chủ, không chặn |
| Story và AC nhất quán | ✅ | Kiểm chéo ở `02-thiet-ke/08-truy-vet.md` |
| Yêu cầu phi chức năng quan trọng đã xem xét | ✅ | Hiệu năng R-10, độ tin cậy R-09, bảo mật R-11, riêng tư R-12 |
| Rủi ro bảo mật / riêng tư / công bằng đã đánh giá | ✅ | R-11, R-12, R-13 → RISK-01, RISK-05 |
| Yêu cầu phù hợp hệ thống và API hiện có | ⚠️ | Không endpoint hiện có nào bị đổi; nhưng xem R-17, R-18 |
| Sẵn sàng cho thiết kế | ⚠️ **Có điều kiện** | Sau khi Human quyết R-17, R-18 và xác nhận các câu `Đề xuất` ở `02-lam-ro.md` |
