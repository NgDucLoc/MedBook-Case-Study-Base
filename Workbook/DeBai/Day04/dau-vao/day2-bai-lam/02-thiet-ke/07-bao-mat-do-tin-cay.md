# 02 · 07 — Bảo mật và độ tin cậy

> **Mã:** WB2-02-07 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Tech Lead] · **Cổng:** CP-06
> **Nguồn:** toàn bộ `02-thiet-ke/01` → `06`, `01-yeu-cau/06-ra-soat-yeu-cau.md` (R-xx) · **Bước WB-1:** WF-07 (RSP-10)

**Bốn góc nhìn:** bảo mật và riêng tư · đồng thời và nhất quán dữ liệu · xử lý lỗi và phục hồi · rủi ro nghiệp vụ.
**Phân vai (RSP-10):** AI phát hiện rủi ro và đề xuất biện pháp; **Human xác nhận mức độ, chấp nhận hoặc từ chối, chọn cách xử lý.** Cột "Human quyết" để trống (`☐`) tới khi bạn duyệt.

---

## 1. Top Risk Review

| ID | Rủi ro | Thành phần / luồng | Mức | Biện pháp giảm thiểu | Đề xuất của AI | Human quyết |
| --- | --- | --- | :---: | --- | --- | :---: |
| **RISK-01** | **Chiếm quyền đề xuất của người khác.** Header đăng nhập giả mạo được bằng một dòng `curl`; kẻ tấn công đoán mã đề xuất và chấp nhận đề xuất của bệnh nhân khác | API-07, API-08, CMP-03 | **High** | BR-14: kiểm chủ sở hữu **ở tầng service** trước mọi thao tác, không dựa vào `requireRole`. Test bắt buộc AC-04.5, AC-05.4 | **Chấp nhận rủi ro còn lại.** Không sửa cơ chế đăng nhập (K-02, ngoài phạm vi, sẽ phá test cũ). Ghi trong tài liệu bàn giao QA | ☐ |
| **RISK-02** | **Thông báo tạo thất bại nhưng đề xuất vẫn đếm giờ.** Bệnh nhân không biết mình có đề xuất; đề xuất hết hạn vô ích | CMP-03 bước 12, ENT-04 | **High** | Thông báo **không phải nguồn sự thật**; API-06 đọc thẳng bảng đề xuất. Tạo thông báo bọc try/catch riêng. Ghi nhật ký **trước** khi tạo thông báo | **Chấp nhận.** Hệ thống suy giảm dần, không hỏng | ☐ |
| **RISK-03** | **Offer Engine lỗi làm hỏng luồng hủy lịch.** Nếu gọi trong giao dịch, lỗi khi chọn ứng viên rollback việc hủy lịch | CMP-09, CMP-10 | **High** | Ba ràng buộc: gọi **sau `commit`** · try/catch nuốt lỗi + log · không `await` trong giao dịch. Công tắc `OFFER_ENGINE_ENABLED=false` | **Xử lý triệt để** bằng ràng buộc kiến trúc — vi phạm là reject ở review | ☐ |
| **RISK-04** | **Tác vụ quét chạy song song nhiều instance** sinh hai đề xuất cho cùng slot hoặc xử lý một đề xuất hai lần | CMP-04 | Medium | Conditional UPDATE idempotent; ràng buộc duy nhất từng phần chặn đề xuất trùng. Nhiều instance thật: thêm `pg_advisory_lock` | **Chấp nhận ở phiên bản 1** (một instance, A-03); ghi giới hạn vào bàn giao và ADR-008 §6 | ☐ |
| **RISK-05** | **Lạm dụng mức ưu tiên y tế.** Staff gán `urgent` cho người quen; hệ thống không kiểm soát | CMP-05, ENT-01 | Medium | Không giải được bằng kỹ thuật. Bù một phần: ghi người tạo đăng ký; nhật ký dựng lại chuỗi quyết định | **Chuyển cho bệnh viện** — cần quy trình duyệt hoặc kiểm toán định kỳ (R-13) | ☐ |
| **RISK-06** | **Không có kênh báo ngoài app.** Với hạn 15 phút, xác suất kịp thấy thấp — tính năng có thể không tạo giá trị thật | Toàn tính năng | **High** | Không giải được trong phạm vi (đề bài loại trừ SMS/email). Thiết kế `notifications` để gắn kênh sau mà không sửa Offer Engine | **Chấp nhận là giới hạn đã biết.** **Phải** ghi rõ trong tài liệu bàn giao để QA không đánh giá sai mức hoàn thành | ☐ |
| **RISK-07** | **Rò rỉ dữ liệu y tế qua response.** Nếu repository dùng `SELECT *`, mức ưu tiên và ghi chú lọt xuống client | CMP-02, API-05, API-06 | Medium | Không `SELECT *` trong repository phục vụ bệnh nhân; liệt kê cột tường minh; AC-03.2 kiểm tra response **không chứa** khóa cấm | **Xử lý.** Thành mục bắt buộc trong định nghĩa "xong" | ☐ |
| **RISK-08** | **Chuỗi đề xuất vô hạn** nếu điều kiện dừng sai: tạo–hủy liên tục | CMP-03 | Medium | Bốn điều kiện dừng: hết ứng viên · slot không còn trống · BR-16 không thỏa · BR-03 (f) loại người đã từ chối. Tập ứng viên **hữu hạn và giảm dần** nên chuỗi chắc chắn kết thúc | **Xử lý.** BR-03 (f) là điều kiện bảo đảm kết thúc — không được nới lỏng | ☐ |
| **RISK-09** | **Đề xuất treo mãi nếu tác vụ quét chết.** Exception không bắt làm tác vụ dừng vĩnh viễn mà không ai biết | CMP-04 | Medium | try/catch **bên trong** mỗi lượt để một đề xuất lỗi không giết cả vòng; log mỗi lượt; truy vấn kiểm tra sức khỏe (`04-luong-va-trang-thai.md` §9) | **Chấp nhận.** Không thêm hạ tầng giám sát (ngoài phạm vi) | ☐ |
| **RISK-10** | **Deadlock** giữa giao dịch chấp nhận và giao dịch đặt lịch chủ động | CMP-03, `appointmentService` | Low | Cả hai khóa theo **cùng thứ tự**: `slots` trước, rồi `appointments` (thứ tự của `bookAppointment()` hiện có) | **Xử lý** bằng quy ước thứ tự khóa; ghi vào quy ước code | ☐ |
| **RISK-11** | **14 test hiện có gãy** do tác dụng phụ mới | CMP-09, CMP-10 | Medium | Tác dụng phụ chỉ kích hoạt khi có đăng ký chờ; test cũ không tạo. `OFFER_ENGINE_ENABLED=false` với test không liên quan | **Xử lý.** Chạy lại toàn bộ test cũ là mục bắt buộc | ☐ |
| **RISK-12** | **Truy vấn chọn ứng viên chậm** khi danh sách lớn (3 subquery `NOT EXISTS`) | CMP-01 | Low | Chỉ mục ở ENT-01, ENT-02 | **Chấp nhận.** Tối ưu khi đo được bằng `EXPLAIN ANALYZE`, không tối ưu sớm | ☐ |

**Thống kê:** 12 rủi ro — High: 4 (RISK-01, 02, 03, 06) · Medium: 6 · Low: 2.

---

## 2. Ba tình huống bắt buộc

| # | Tình huống | Xử lý | Chi tiết ở |
| ---: | --- | --- | --- |
| 1 | Hai bệnh nhân chấp nhận cùng một slot gần như đồng thời | Ba lớp: khóa dòng → đọc thấy slot đã đặt → ràng buộc duy nhất. Kết quả: đúng một người có lịch hẹn; người còn lại nhận thông báo rõ ràng, không mất lượt | `04-luong-va-trang-thai.md` §3 mục E · AC-04.6 |
| 2 | Thông báo thất bại nhưng đề xuất vẫn đếm giờ | Thông báo là kênh phụ; nguồn sự thật là bảng đề xuất; lỗi thông báo bị nuốt; không retry ở phiên bản 1 (chỉ có nghĩa khi có kênh ngoài) | mục F · RISK-02 |
| 3 | Chấp nhận sau khi đề xuất đã hết hạn | Conditional UPDATE có cả `status='sent'` và `expires_at > now()`; service đọc lại để phân biệt "đã hết hạn" với "không còn hiệu lực"; giao diện vô hiệu hóa nút khi hết giờ | mục G · AC-04.3 |

**Rủi ro còn lại của tình huống 2:** nếu bệnh nhân không mở app, họ không biết. Đó là RISK-06 — giới hạn của **phạm vi**, không phải của thiết kế.

---

## 3. Đánh giá theo bốn góc nhìn

**Bảo mật và riêng tư**

| Khía cạnh | Đánh giá |
| --- | --- |
| Xác thực | ⚠️ Yếu do K-02. Không sửa trong phạm vi; bù bằng BR-14 |
| Phân quyền | ✅ `requireRole` + kiểm chủ sở hữu ở service |
| SQL injection | ✅ Toàn bộ parameterized (K-01) |
| Rò rỉ dữ liệu y tế | ✅ BR-11, BR-12; liệt kê cột tường minh; AC-03.2 |
| Nhật ký chứa dữ liệu nhạy cảm | ✅ Không ghi mức ưu tiên vào nhật ký |
| Thông báo lỗi lộ nội bộ | ✅ Thông báo tiếng Việt ngắn, không SQL/stack |

**Đồng thời và nhất quán:** race khi chấp nhận ✅ (ba lớp) · quét chồng nhau ✅ (conditional UPDATE) · deadlock ✅ (thứ tự khóa) · lệch `slots.status` với đề xuất ✅ (đọc lại trong giao dịch) · lost update ✅ (không có đọc-rồi-ghi ở phép chuyển trạng thái nào).

**Xử lý lỗi và phục hồi**

| Kịch bản hỏng | Hệ thống làm gì | Mất gì |
| --- | --- | --- |
| Offer Engine ném lỗi khi hủy lịch | Hủy lịch vẫn thành công, ghi log | Slot không được đề xuất lần này |
| Ứng dụng khởi động lại giữa lúc đề xuất đang treo | Lượt quét sau dọn bình thường (trạng thái ở DB) | Tối đa một chu kỳ quét |
| DB mất kết nối | Request lỗi, không dữ liệu bẩn (rollback) | Không |
| Tác vụ quét chết | Đề xuất treo ở `sent` | Phát hiện bằng truy vấn sức khỏe — RISK-09 |
| Tạo thông báo lỗi | Đề xuất vẫn hợp lệ | Thông báo chủ động |
| Tạo lịch hẹn lỗi trong giao dịch chấp nhận | Rollback toàn bộ, đề xuất giữ `sent`, bệnh nhân thử lại được | Không |

**Rủi ro nghiệp vụ:** bệnh nhân không thấy đề xuất kịp — **High**, RISK-06 · lạm dụng mức ưu tiên — Medium, RISK-05 · từ chối liên tục chặn hàng đợi — Medium, Q-07 `Open` · bệnh nhân hiểu nhầm đề xuất là lịch đã đặt — Medium: giao diện phải ghi rõ **"Đề xuất — cần xác nhận trong X phút"**, thành mục của định nghĩa "xong".

---

## 4. Kết luận

**Không có rủi ro nào ở mức chặn việc chuyển sang Development** — với điều kiện Human xử lý ba rủi ro High có quyết định đề xuất:
- **RISK-01** — chấp nhận rủi ro còn lại, bù bằng BR-14 và hai test bắt buộc.
- **RISK-03** — xử lý triệt để bằng ràng buộc kiến trúc.
- **RISK-06** — chấp nhận là giới hạn đã biết; **bắt buộc** ghi vào bàn giao.

Hai vấn đề **ngoài phạm vi kỹ thuật** cần bệnh viện quyết: **RISK-05** (kiểm soát mức ưu tiên) và **Q-07** (chính sách từ chối liên tiếp).
