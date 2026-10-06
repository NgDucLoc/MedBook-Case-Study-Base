# WB-1 · 06 — Nhật ký quyết định

> **Mã:** WB1-06 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Nguồn:** toàn bộ WB-1

Nhật ký ghi **ai quyết định gì, vì sao**. Quy ước: nếu một quyết định không nằm ở đây, nó chưa có người chịu trách nhiệm.

Tất cả mục dưới đây là **đề xuất do AI soạn**. Cột "Quyết định của Human" để trống cho tới khi bạn duyệt — AI không tự điền.

---

## 1. Các quyết định cần Human duyệt

| ID | Nội dung đề xuất | Lý do của AI | Ảnh hưởng nếu đổi | Quyết định của Human |
| --- | --- | --- | --- | :---: |
| **HR1-01** | Dùng **5 phase** (Requirements, Design, Development, Test, Ops/Release) — đúng danh sách của đề bài | Đề bài yêu cầu điền đủ 5 phase | Đổi số phase ⇒ sửa `01`, `02`, `03` | ☐ |
| **HR1-02** | Đánh dấu ART-02, 03, 04, 12 và DR-04, 05, 06 là **`Suy ra`**, không trình bày như dữ kiện | Đề bài không nói BA/QA lưu artifact ở đâu, dạng gì | Nếu team thật khác, sửa bảng artifact và điểm đứt gãy tương ứng | ☐ |
| **HR1-03** | Chọn **12 bước (WF-01 → WF-12)** và **11 cổng duyệt (CP-01 → CP-11)** | Mỗi cổng gắn một sản phẩm cụ thể và một người duyệt; đủ mịn để bắt lỗi ở chỗ rẻ nhất | Ít cổng hơn ⇒ nhanh hơn, dễ lọt lỗi. Xem OQ-04 | ☐ |
| **HR1-04** | Chấp nhận **NT-01 → NT-11** làm luật chơi cho WB-2 → WB-5 | Mỗi nguyên tắc chống một điểm đứt gãy có thật | Bỏ nguyên tắc nào ⇒ điểm đứt gãy tương ứng (cột DR) quay lại | ☐ |
| **HR1-05** | Phân loại 20 việc thành **H / A→H / A** như `03-responsibility-matrix.md` §3 | Quyết định gắn giá trị nghiệp vụ và rủi ro ⇒ H; việc kiểm chứng được cơ học ⇒ A | Chuyển việc từ A→H sang A ⇒ giảm cổng duyệt, tăng rủi ro lọt lỗi | ☐ |
| **HR1-06** | Coi **bộ tài liệu chung nằm trong repo** (không nằm trong công cụ AI riêng) là nơi duy nhất bàn giao giữa các phase | Sửa gốc rễ của DR-01 và DR-03 | Nếu team bắt buộc dùng công cụ khác (Jira, Confluence), cần một bước đồng bộ và NT-01 phải nêu công cụ nào là nguồn gốc | ☐ |

---

## 2. Câu hỏi còn mở

Không câu nào chặn việc bắt đầu WB-2, nhưng cả năm ảnh hưởng chất lượng của bản chốt ở WB-5.

| ID | Câu hỏi | Vì sao quan trọng | Ai nên trả lời | Chặn WB-2? | Trạng thái |
| --- | --- | --- | --- | :---: | --- |
| **OQ-01** | Backlog, story, AC, test case của team hiện nằm ở công cụ nào, dạng gì? | Quyết định DR-01, DR-02, DR-04 có đúng như suy đoán hay không, và bộ tài liệu chung thay thế hay đồng bộ với công cụ đó | BA, QA | Không | **Open** |
| **OQ-02** | Ai đảm nhận phát hành và vận hành (PH-5)? Team không có Ops riêng | CP-10 cần người duyệt cụ thể | Tech Lead | Không | **Open** |
| **OQ-03** | Ai là người duyệt ở cấp nghiệp vụ (Product Owner / đại diện bệnh viện) cho CP-01, CP-02, CP-04, CP-11? | Không có người chịu trách nhiệm ⇒ cổng thành thủ tục | Ban giám đốc bệnh viện / Tech Lead | Không | **Open** |
| **OQ-04** | Có cho phép **rút gọn cổng** với thay đổi nhỏ (ví dụ sửa lỗi) không? Ranh giới "nhỏ" là gì? | 11 cổng cho mọi thay đổi là quá tay | Tech Lead | Không | **Open** |
| **OQ-05** | Team có số đo hiện tại nào (số lần hỏi lại BA, thời gian review, tỷ lệ bug) không? | Không có mốc "trước" thì WB-5 chỉ đo được xu hướng, không chứng minh được cải thiện | Tech Lead, BA | Không | **Open** |

---

## 3. Việc Human nên kiểm tra khi duyệt WB-1

Danh sách này chỉ ra chỗ AI **đã suy luận** và cần mắt người, không phải toàn bộ nội dung.

| # | Kiểm tra | Ở đâu |
| ---: | --- | --- |
| 1 | Bảng artifact có khớp với cách team thực sự làm không? Đặc biệt các dòng `Suy ra` | `01-artifact-map.md` §3 |
| 2 | Sáu điểm đứt gãy có đúng và đủ không? Ba điểm sau (`Suy ra`) có xảy ra thật không? | `01-artifact-map.md` §4 |
| 3 | Vai trò AI (Assistant / Copilot / Collaborator) ở mỗi cơ hội có hợp lý không? | `02-ai-opportunity-matrix.md` §1 |
| 4 | Phân loại H / A→H / A: có việc nào bạn muốn giữ tay hơn hoặc giao AI nhiều hơn? | `03-responsibility-matrix.md` §3 |
| 5 | Mười một cổng: có cổng nào thừa hoặc thiếu? | `03-responsibility-matrix.md` §2 |
| 6 | Mười một nguyên tắc: có nguyên tắc nào quá cứng cho một dự án nhỏ? | `05-nguyen-tac-chung.md` §1 |
| 7 | Đường quay lại (sửa tài liệu trước code) có phù hợp với nhịp sprint 2 tuần không? | `04-future-state-workflow.md` §2 |
