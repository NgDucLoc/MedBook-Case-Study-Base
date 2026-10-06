# WB-1 · 02 — AI Opportunity Matrix

> **Mã:** WB1-02 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Nguồn:** `01-artifact-map.md` (ART-xx, DR-xx), IN-01 · **Đáp ứng:** Activity 2

Mục tiêu: chỉ ra AI tạo **giá trị thật** ở đâu — không chỉ "nhanh hơn" — và điều kiện để nó hoạt động đúng. Mỗi cơ hội trỏ về điểm đứt gãy (DR-xx) mà nó giúp giải quyết.

**Ba vai trò AI** dùng trong bảng:

| Vai trò | AI làm | Human làm |
| --- | --- | --- |
| **Assistant** | Việc lặp lại, có đầu vào và đầu ra rõ; kết quả kiểm tra được ngay | Dùng kết quả, kiểm tra mẫu |
| **Copilot** | Cùng làm với Human từng bước, sinh nội dung theo khuôn cho trước | Điều hướng, duyệt từng sản phẩm |
| **Collaborator** | Đề xuất, phản biện, tìm chỗ thiếu ở mức có ảnh hưởng đến quyết định | **Quyết định** |

---

## 1. Ma trận phase × cơ hội

| ID | Phase | Cơ hội AI | Vai trò | Giá trị tạo ra (ngoài "nhanh hơn") | Điều kiện để AI làm đúng | DR giải quyết | Tác động |
| --- | --- | --- | :---: | --- | --- | --- | :---: |
| **OPP-01** | PH-1 Requirements | **Đặt câu hỏi làm rõ** thay vì sinh story ngay: liệt kê điều mơ hồ, thiếu, edge case | Collaborator | **Phát hiện khoảng trống trước khi code.** Ví dụ đề bài nói "bệnh nhân phù hợp nhất" theo ba tiêu chí nhưng không nói thứ tự áp dụng — đây là câu hỏi người viết story dễ bỏ qua | Ngữ cảnh nghiệp vụ đã dựng (IN-03, IN-04); chỉ thị "không tự giả định, gắn `[CẦN XÁC NHẬN]`" | DR-01 | **Cao** |
| **OPP-02** | PH-1 | **Soạn story và AC Given–When–Then** từ quy tắc đã chốt | Copilot | Story và AC **đi cùng mã quy tắc** (BR-xx) nên Dev và QA đọc cùng một nguồn | Quy tắc nghiệp vụ đã có mã và đã được Human duyệt; khuôn AC cố định (có số đo được) | DR-01, DR-02 | **Cao** |
| **OPP-03** | PH-1 | **Rà soát nhất quán** toàn bộ yêu cầu: mâu thuẫn, trùng, thiếu phi chức năng | Collaborator | Tìm được mâu thuẫn giữa hai story mà người viết không thấy | Toàn bộ yêu cầu nạp vào một lượt, có mã để trích | DR-01, DR-04 | TB |
| **OPP-04** | PH-2 Design | **Phân tích tác động** lên hệ thống hiện có: đọc ADR, code, data model để tìm chỗ bị ảnh hưởng | Assistant | Đọc hết ADR và code nhanh hơn người; nối được ràng buộc chôn trong ADR-003/004 với thay đổi mới | ADR và tài liệu hệ thống **nằm trong repo** (ART-06, ART-07), không nằm trong hội thoại riêng | DR-03 | **Cao** |
| **OPP-05** | PH-2 | **Đề xuất nhiều phương án kiến trúc và phản biện chính đề xuất đó** | Collaborator | Buộc phản biện lộ ra điểm bị bỏ sót. AI đồng ý với chính nó rất nhanh — cần một lượt "đóng vai reviewer độc lập" | Ràng buộc kỹ thuật bất biến đã nêu rõ (NT-09); Human giữ quyền chọn | DR-03, DR-05 | **Cao** |
| **OPP-06** | PH-3 Dev | **Sinh code cho một task** với ngữ cảnh hẹp: chỉ nạp quy tắc, AC, quy ước và một file mẫu liên quan | Copilot | Code khớp quy ước của repo; mỗi task nói rõ hiện thực quy tắc nào | Task trỏ về BR/AC; có bản đồ "task nào đọc file nào" (NT-06); quy ước code ghi thành văn bản | DR-03, DR-05 | **Cao** |
| **OPP-07** | PH-3 | **Giải thích luồng code, tìm điểm móc** cho thay đổi (một request đi qua file nào) | Assistant | Người mới vào task không phải đọc cả repo | `doc/backend-flows.md` còn đúng với code | DR-04 | Thấp |
| **OPP-08** | PH-4 Test | **Sinh test từ AC**, mỗi test trỏ AC | Copilot | Test **chứng minh được** yêu cầu; bảng AC ↔ test đóng vòng truy vết | AC có mã, dạng Given–When–Then, có số đo được (≤ 5 giây, không phải "nhanh") | DR-02, DR-05 | **Cao** |
| **OPP-09** | PH-4 | **Sinh ca biên và đồng thời** (bấm hai lần, hai người cùng làm, hết hạn đúng lúc) | Collaborator | Tìm ca mà QA thường bỏ qua vì không nghĩ tới | Danh sách tình huống bắt buộc do Human chốt trước để AI không trả lời chung chung | DR-02 | TB |
| **OPP-10** | PH-5 Ops | **Cập nhật runbook, cấu hình, mô tả CI** khi thay đổi | Assistant | Tài liệu vận hành không lệch khỏi code | Danh sách thay đổi (biến môi trường mới, lệnh mới) lấy từ coding-log | DR-04 | Thấp |
| **OPP-11** | PH-5 → PH-1 | **Phân tích nhật ký sự kiện và số đo**, đề xuất mục backlog | Collaborator | Đóng vòng phản hồi: vấn đề gốc có được giải quyết không | Hệ thống **có** nhật ký sự kiện; có mốc "trước" để so | DR-06 | TB |

**Phân bố:** 5 phase đều có ít nhất một cơ hội, đủ ba vai trò. **Tác động cao** nằm ở PH-1, PH-2, PH-3, PH-4 — cụ thể là ở **chỗ nối** (làm rõ → story; phản biện thiết kế; test từ AC), không phải ở việc "gõ nhanh hơn".

---

## 2. Pain point mà AI **không** giải quyết nếu context không được truyền đúng

| # | Pain point | Vì sao AI không cứu được | Cái phải truyền đúng | DR |
| ---: | --- | --- | --- | --- |
| 1 | Dev hỏi lại BA 3–4 lần | AI của Dev chỉ thấy story dạng văn; luật nghiệp vụ nằm trong đầu BA hoặc trong chat | Quy tắc nghiệp vụ có mã, nằm trong repo, story trỏ tới | DR-01 |
| 2 | Test case không cover đúng business logic | Gemini sinh test từ lời văn AC, thiếu nguồn để đối chiếu; test "hợp lý" nhưng không phải test của yêu cầu này | AC Given–When–Then trỏ quy tắc; test trỏ AC | DR-02 |
| 3 | Thời gian review tăng gấp đôi | Reviewer không có tài liệu đáng tin để đối chiếu, phải suy ngược từ code | Tài liệu gốc luôn cập nhật; PR nêu quy tắc đã hiện thực | DR-04 |
| 4 | Vi phạm ràng buộc thiết kế | Ràng buộc nằm ở hội thoại riêng hoặc ở ADR mà task không trỏ tới | Ràng buộc bất biến ghi thành văn bản và đưa vào ngữ cảnh mỗi task | DR-03 |
| 5 | AI tự bịa quy tắc khi thiếu thông tin | Mô hình có xu hướng **lấp chỗ trống bằng giá trị hợp lý** | Nhãn `[CẦN XÁC NHẬN]` và quy định AI phải dừng, hỏi Human | DR-01 |
| 6 | Không biết tính năng có giải quyết vấn đề gốc không | Không có số đo và không có kênh phản hồi | Nhật ký sự kiện + mốc "trước" + đường về backlog | DR-06 |

**Nhận xét:** cả 6 pain point đều là vấn đề **thông tin không đi được giữa các ô**, không phải vấn đề AI viết chậm hay dở. Thêm AI vào từng ô không sửa được chúng; sửa **chỗ nối** thì sửa được (`04-future-state-workflow.md`).

---

## 3. Đối chiếu checklist Day 1

| Mục checklist | Trạng thái | Ở đâu |
| --- | :---: | --- |
| Điền đủ 5 phase với vai trò AI cụ thể (không chỉ "dùng AI") | ✅ 11 cơ hội, đủ 3 vai trò | §1 |
| Nêu pain point AI không giải quyết nếu context không truyền đúng | ✅ 6 pain point | §2 |
