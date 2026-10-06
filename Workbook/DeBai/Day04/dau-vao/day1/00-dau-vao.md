# WB-1 · 00 — Đầu vào và mức sẵn sàng

> **Mã:** WB1-00 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Nguồn:** IN-01 → IN-09 (bảng §1)

Tài liệu này liệt kê **mọi thứ WB-1 được phép dựa vào**, và ghi rõ chỗ nào là dữ kiện, chỗ nào là suy luận. Các file sau (01 → 05) chỉ được trích dẫn từ đây; nếu cần một dữ kiện không có ở đây thì ghi `[CẦN XÁC NHẬN]`.

---

## 1. Danh mục đầu vào

| ID | Đầu vào | Vị trí | Dùng để làm gì |
| --- | --- | --- | --- |
| **IN-01** | Case study — Day 1: bối cảnh team, các activity, deliverable | `de-bai/MedBook_CaseStudy_5Days.pdf` | Đề bài |
| **IN-02** | Lời Tech Lead sau Sprint 2 (trích trong IN-01) | như trên | Bằng chứng về triệu chứng "context drift" |
| **IN-03** | Bối cảnh hệ thống hiện tại | `tai-lieu-tham-chieu/01-system-context.md` | Biết artifact nào đang tồn tại thật |
| **IN-04** | Business Problem Canvas của tính năng waiting list | `tai-lieu-tham-chieu/01-business-problem.md` | Bài toán chạy xuyên 5 ngày |
| **IN-05** | Từ điển thuật ngữ | `tai-lieu-tham-chieu/02-glossary.md` | Thống nhất từ ngữ |
| **IN-06** | Tài liệu trong repo: `doc/prod.md`, `doc/data-model.md`, `doc/backend-flows.md`, `doc/cicd.md`, `doc/adr/001…007` | `source-code/doc/` | Artifact **có thật** của Requirements, Design, Ops |
| **IN-07** | Bộ test tích hợp: `tests/api.test.js` (14 ca) | `source-code/tests/` | Artifact **có thật** của Test |
| **IN-08** | Pipeline CI và cấu hình chạy: `.github/workflows/ci.yml`, `Dockerfile`, `docker-compose.yml`, `HUONG-DAN-CHAY.md` | `source-code/` | Artifact **có thật** của Ops |
| **IN-09** | **Hiện trạng MedBook suy ngược từ code Day 1** — quy tắc, story, dữ liệu, API, thành phần, khoảng trống, truy vết test | `Workbooks/boi-canh-chung/` | Bối cảnh chung của mọi WB; nguồn **có dẫn chứng dòng code** cho hệ thống hiện tại, thay cho việc dựa vào IN-03 |

**Lưu ý về IN-03, IN-04, IN-05:** đây là tài liệu tham chiếu **do khóa học cấp**, không phải artifact do team tạo ra ở Day 1. Một phần nội dung của chúng thuộc đầu ra của Day 2 (mã quy tắc, quyết định kiến trúc). WB-1 chỉ lấy từ chúng phần mô tả bài toán; mô tả hệ thống hiện tại lấy từ IN-09 vì có dẫn chứng từ code.

Đã chạy thử ứng dụng bằng `docker compose up --build`: app tại `http://localhost:4300`, PostgreSQL tại `55432`. Việc này xác nhận IN-06 → IN-08 mô tả đúng thứ đang chạy.

---

## 2. Dữ kiện về team và quy trình (từ IN-01)

| # | Dữ kiện | Nguồn |
| --- | --- | --- |
| F-01 | Team 5 người, Scrum, sprint 2 tuần | IN-01 |
| F-02 | 1 Business Analyst dùng ChatGPT để viết user story | IN-01 |
| F-03 | 2 Backend Developer dùng GitHub Copilot để sinh code | IN-01 |
| F-04 | 1 QA Engineer dùng Gemini để tạo test case | IN-01 |
| F-05 | 1 Tech Lead dùng ChatGPT (**hội thoại riêng**) để review design | IN-01 |
| F-06 | "Thời gian review tăng gấp đôi" | IN-02 |
| F-07 | "Developer nhận story xong phải hỏi lại BA 3–4 lần" | IN-02 |
| F-08 | "Test case của QA không cover đúng business logic" | IN-02 |
| F-09 | "Chúng ta dùng AI ở từng ô riêng lẻ, nhưng thông tin không chạy được từ ô này sang ô kia" | IN-02 |
| F-10 | Hệ thống hiện chưa có cơ chế nào xử lý slot trống đột ngột; nhân viên gọi điện/nhắn tin thủ công | IN-01, IN-04 |

---

## 3. Mức sẵn sàng — AI đã có đủ ngữ cảnh chưa?

| Loại thông tin | Mức | Ghi chú |
| --- | :---: | --- |
| Bối cảnh team và công cụ AI đang dùng | ✅ Đã rõ | F-01 → F-05 |
| Triệu chứng của quy trình hiện tại | ✅ Đã rõ | F-06 → F-09 |
| Artifact có thật trong repo | ✅ Đã rõ | IN-06 → IN-08, đã đối chiếu với code chạy |
| Artifact phía **BA** (backlog, story, AC nằm ở công cụ nào, dạng gì) | ⚠️ Một phần | Đề bài chỉ nói BA "viết user story". Định dạng, nơi lưu: chưa có → `[CẦN XÁC NHẬN]` OQ-01 |
| Artifact phía **QA** (test case, bug report) | ⚠️ Một phần | Chỉ biết QA dùng Gemini tạo test case |
| Vai trò **vận hành / phát hành** | ❌ Chưa rõ | Team 5 người không có Ops riêng → `[CẦN XÁC NHẬN]` OQ-02 |
| Người **duyệt** ở cấp nghiệp vụ (Product Owner, stakeholder) | ❌ Chưa rõ | → `[CẦN XÁC NHẬN]` OQ-03 |
| Số đo hiện tại (số lần hỏi lại, thời gian review, tỷ lệ bug) | ❌ Chưa có | Chỉ có lời kể định tính (F-06, F-07). WB-5 sẽ phải đo |

**Ba thông tin quan trọng nhất còn thiếu**

| # | Thông tin thiếu | Vì sao quan trọng |
| ---: | --- | --- |
| 1 | Artifact của BA và QA thực tế nằm ở đâu, dạng gì | Không biết thì không xác định được điểm đứt gãy chính xác — hai trong ba triệu chứng (F-07, F-08) nằm ở đây |
| 2 | Ai duyệt ở cấp nghiệp vụ | Cổng duyệt (checkpoint) cần một người cụ thể chịu trách nhiệm; nếu không có thì thành thủ tục |
| 3 | Số đo hiện tại | Không có mốc "trước" thì WB-5 không chứng minh được cải thiện |

**Cách xử lý:** các artifact và mối quan hệ suy ra từ đề bài được đánh dấu **`Suy ra`** ở `01-artifact-map.md`, không trình bày như dữ kiện. Ba câu hỏi trên nằm ở `06-nhat-ky-quyet-dinh.md` §2 chờ trả lời.

---

## 4. Quy ước ký hiệu dùng trong toàn bộ WB-1

| Ký hiệu | Nghĩa |
| --- | --- |
| `Case` | Dữ kiện lấy trực tiếp từ đề bài (IN-01, IN-02) |
| `Repo` | Dữ kiện đã kiểm chứng trong source code hoặc tài liệu repo |
| `Suy ra` | Suy luận hợp lý từ đề bài, **chưa có xác nhận** |
| `[CẦN XÁC NHẬN]` | Chưa đủ căn cứ. AI không tự lấp; Human phải trả lời |
