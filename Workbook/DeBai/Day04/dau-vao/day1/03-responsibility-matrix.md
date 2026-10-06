# WB-1 · 03 — Human–AI Responsibility Matrix

> **Mã:** WB1-03 · **Phiên bản:** v0.1 (bản đầu — WB-5 sẽ chốt bằng bằng chứng) · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Nguồn:** `02-ai-opportunity-matrix.md` (OPP-xx), IN-01 · **Đáp ứng:** Activity 3

Mục tiêu: xác định ranh giới — việc nào **Human quyết**, việc nào **AI làm**, việc nào **AI đề xuất, Human duyệt** — và cổng duyệt (checkpoint) đặt ở đâu.

Ma trận này là **bản đầu, dựa trên giả định**. Các WB sau sẽ đối chiếu với thực tế và WB-5 cập nhật thành bản chốt; mỗi thay đổi ở bản chốt phải có bằng chứng (mã FAIL/HR/TASK).

---

## 1. Ba loại trách nhiệm

| Ký hiệu | Nghĩa | Ai chịu trách nhiệm cuối |
| :---: | --- | --- |
| **H** | Human quyết. AI có thể cung cấp thông tin nhưng không đề xuất phương án thay Human | Human |
| **A→H** | AI đề xuất, Human duyệt trước khi thành nguồn đúng (sản phẩm chưa có hiệu lực cho tới khi duyệt) | Human duyệt |
| **A** | AI làm, Human kiểm tra mẫu. Kết quả tự kiểm chứng được (lint, test chạy, đối chiếu mã) | Người sở hữu task |

---

## 2. Danh sách cổng duyệt (checkpoint)

| ID | Cổng | Người duyệt | Điều kiện qua cổng |
| --- | --- | --- | --- |
| **CP-01** | Business Problem và phạm vi | BA + stakeholder nghiệp vụ `[OQ-03]` | Vấn đề, mục tiêu, In/Out scope, ràng buộc, tiêu chí thành công đã được xác nhận |
| **CP-02** | Làm rõ và quy tắc nghiệp vụ | BA + stakeholder | Mỗi câu hỏi có trạng thái; mỗi quy tắc có mã BR và nguồn quyết định; câu `Open` có chủ và không chặn |
| **CP-03** | User story và AC | BA + QA | Mỗi AC quan sát và kiểm thử được; mỗi AC trỏ ít nhất một BR; không AC nào phụ thuộc câu `Open` |
| **CP-04** | Rà soát yêu cầu và ưu tiên MVP | BA + Tech Lead | Không còn mâu thuẫn; gap có chủ; MVP chốt |
| **CP-05** | Quyết định kiến trúc | Tech Lead | Có ≥ 2 phương án, có phản biện, có lý do chọn và rủi ro chấp nhận |
| **CP-06** | Thiết kế chi tiết, rủi ro, truy vết | Tech Lead + BA | Mỗi BR có đúng một thành phần chịu trách nhiệm; mỗi AC truy được tới thiết kế |
| **CP-07** | Danh sách task | Tech Lead + Dev | Mỗi task trỏ BR/AC, có ranh giới file, có định nghĩa "xong" |
| **CP-08** | Review code | Dev khác + Tech Lead | Đối chiếu code với BR/AC và quy ước; không có việc ngoài task |
| **CP-09** | Kết quả test và kiểm tra lệch | QA + BA | Mỗi AC có test; test đạt; lệch giữa tài liệu và code đã xử lý hoặc ghi nhận |
| **CP-10** | Phát hành | Tech Lead + Dev `[OQ-02]` | Định nghĩa "xong" đủ; runbook và cấu hình cập nhật |
| **CP-11** | Phản hồi vận hành | BA + stakeholder | Số đo được xem; mục backlog mới có mã và trỏ về BR/US bị ảnh hưởng |

---

## 3. Ma trận theo phase

| ID | Phase | Việc | Loại | Ai duyệt / quyết | Cổng | Vì sao chia như vậy |
| --- | --- | --- | :---: | --- | :---: | --- |
| **RSP-01** | PH-1 | Chốt mục tiêu, phạm vi In/Out, ưu tiên MVP | **H** | BA, stakeholder | CP-01, CP-04 | Đánh đổi giá trị nghiệp vụ; AI không biết hành vi thực của bệnh nhân hay chính sách bệnh viện |
| **RSP-02** | PH-1 | Trả lời câu hỏi làm rõ, **chốt quy tắc nghiệp vụ** (tiêu chí chọn, thời hạn, quyền riêng tư) | **H** | BA, stakeholder | CP-02 | Đây là chỗ AI dễ tự bịa nhất; quy tắc không có người chịu trách nhiệm thì không được vào tài liệu |
| **RSP-03** | PH-1 | Đặt câu hỏi làm rõ, tìm mơ hồ và thiếu | **A→H** | BA | CP-02 | AI duyệt rộng rất tốt (OPP-01); BA loại câu không phù hợp và bổ sung |
| **RSP-04** | PH-1 | Soạn story và AC nháp, gán mã | **A→H** | BA, QA | CP-03 | AI soạn nhanh nhưng phải sửa số đo và ca biên |
| **RSP-05** | PH-1 | Rà soát nhất quán và gap | **A→H** | BA, Tech Lead | CP-04 | AI tìm; người quyết xử lý từng gap |
| **RSP-06** | PH-2 | Phân tích tác động lên hệ thống hiện có | **A** | Tech Lead kiểm tra mẫu | — | Đọc ADR và code là việc duyệt rộng, kiểm chứng được bằng đối chiếu file |
| **RSP-07** | PH-2 | Đề xuất phương án kiến trúc và phản biện | **A→H** | Tech Lead | CP-05 | AI cho ≥ 2 phương án; không chọn thay người |
| **RSP-08** | PH-2 | **Chọn kiến trúc, chấp nhận trade-off và rủi ro còn lại** | **H** | Tech Lead | CP-05 | Quyết định gắn với nguồn lực, thời gian, chiến lược — không có trong tài liệu |
| **RSP-09** | PH-2 | Soạn thiết kế chi tiết (thành phần, API, dữ liệu, trạng thái) | **A→H** | Tech Lead | CP-06 | Nhiều chi tiết, dễ lệch quy tắc nếu không duyệt |
| **RSP-10** | PH-2 | Rà soát bảo mật và độ tin cậy; **quyết chấp nhận rủi ro** | Rà soát: **A→H** · Chấp nhận: **H** | Tech Lead | CP-06 | AI liệt kê rủi ro; chấp nhận hay không là quyết định của người |
| **RSP-11** | PH-3 | Chia task từ thiết kế, mỗi task trỏ BR/AC | **A→H** | Tech Lead, Dev | CP-07 | Ranh giới task quyết định phạm vi của AI |
| **RSP-12** | PH-3 | Hiện thực code cho task | **A** | Dev sở hữu task | CP-08 | AI sinh; Dev chịu trách nhiệm; kiểm chứng bằng lint, test |
| **RSP-13** | PH-3 | Review code đối chiếu BR/AC và quy ước | **H** (AI hỗ trợ đọc) | Dev khác, Tech Lead | CP-08 | Người review phải độc lập với người/AI viết |
| **RSP-14** | PH-3 | **Đổi hành vi** (sửa BR/AC) khi phát hiện tài liệu sai hoặc thiếu | **H** | BA + Tech Lead | CP-02/03 (mở lại) | Sửa tài liệu **trước**, code sau (NT-05) |
| **RSP-15** | PH-4 | Sinh test từ AC, mỗi test trỏ AC | **A→H** | QA | CP-09 | Test nhanh nhưng phải kiểm tra có đúng AC không |
| **RSP-16** | PH-4 | Chạy test, kiểm tra lệch giữa tài liệu và code | Chạy: **A** · Kết luận: **H** | QA, BA | CP-09 | Chạy là cơ học; "lệch này chấp nhận được không" là phán đoán |
| **RSP-17** | PH-4 | **Quyết định đủ chất lượng để phát hành** | **H** | Tech Lead, QA | CP-10 | Trách nhiệm giải trình |
| **RSP-18** | PH-5 | Cập nhật runbook, cấu hình, mô tả CI | **A→H** | Tech Lead, Dev | CP-10 | Từ coding-log; người duyệt đối chiếu với code |
| **RSP-19** | PH-5 | Triển khai và theo dõi | **H** (AI hỗ trợ phân tích log: **A**) | Tech Lead, Dev | CP-10 | Chạm môi trường thật |
| **RSP-20** | PH-5 → PH-1 | Đưa phản hồi và số đo vào backlog | **A→H** | BA, stakeholder | CP-11 | AI tổng hợp; người quyết mục nào đáng làm |

**Thống kê:** 20 việc — thuần **H**: 6 (RSP-01, 02, 08, 13, 14, 17) · thuần **A→H**: 9 (RSP-03, 04, 05, 07, 09, 11, 15, 18, 20) · thuần **A**: 2 (RSP-06, 12) · hỗn hợp: 3 (RSP-10, 16, 19 — từng phần được ghi trong cột Loại).

**Checkpoint review có ở cả 5 phase** (yêu cầu tối thiểu của Day 1 là 2 phase).

---

## 4. Rủi ro lớn nhất nếu để AI tự chạy hoàn toàn qua một phase

| Phase | Rủi ro lớn nhất | Ví dụ cụ thể trong case | Chặn bằng |
| --- | --- | --- | --- |
| **PH-1 Requirements** | AI **tự bịa quy tắc nghiệp vụ** rồi trình bày như dữ kiện | Đề bài nêu ba tiêu chí chọn bệnh nhân (ưu tiên y tế, thời gian chờ, chuyên khoa) mà không nói thứ tự áp dụng; AI dễ tự đặt trọng số nghe thuyết phục nhưng không có nguồn từ bệnh viện | CP-02; NT-03 |
| **PH-2 Design** | AI chọn kiến trúc **vi phạm ràng buộc cứng** vì tối ưu cho một tương lai giả định | Đề xuất message broker cho hệ thống chỉ có hai dependency runtime | CP-05; NT-09 |
| **PH-3 Development** | Code **lệch quy tắc, vượt phạm vi task**, hoặc thêm thứ không ai yêu cầu | Sửa endpoint đang chạy, thêm thư viện, đổi `slots.status` ngoài transaction | CP-07, CP-08; NT-05, NT-06 |
| **PH-4 Test** | **Test xanh giả**: test viết từ code chứ không từ AC, nên xác nhận đúng cái code đang làm | 14 test cũ vẫn xanh nhưng không test luật mới nào | CP-09; NT-08 |
| **PH-5 Ops** | Thay đổi cấu hình hoặc phát hành **không ai chịu trách nhiệm** | Đổi biến môi trường mà runbook không cập nhật | CP-10; NT-01, NT-07 |

**Rủi ro chung của mọi phase:** AI **đồng ý với chính nó** và trình bày mọi thứ với cùng mức tự tin, nên Human không nhìn thấy đâu là chỗ AI đã **giả định**. Lỗi đi xuống phase sau và chi phí sửa tăng theo mỗi phase. Cổng duyệt chỉ có tác dụng khi người duyệt nhìn thấy được chỗ giả định — vì vậy nhãn `[CẦN XÁC NHẬN]` là bắt buộc (NT-03).

---

## 5. Đối chiếu checklist Day 1

| Mục checklist | Trạng thái | Ở đâu |
| --- | :---: | --- |
| Chỉ rõ AI làm gì, Human làm gì, checkpoint ở đâu | ✅ | §3 |
| Checkpoint review ở ít nhất 2 phase | ✅ cả 5 phase | §2, §3 |
| Rủi ro lớn nhất nếu AI tự chạy hoàn toàn một phase | ✅ | §4 |
