# WB-1 · 01 — SDLC Artifact Map

> **Mã:** WB1-01 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Nguồn:** IN-01, IN-02, IN-06, IN-07, IN-08 · **Đáp ứng:** Activity 1 (deliverable "SDLC Artifact Map")

Mục tiêu: chỉ ra artifact nào sinh ra ở mỗi phase, ai tạo, ai nhận, nằm ở đâu — và **thông tin bị mất hoặc hiểu sai ở đâu** khi đi từ phase này sang phase khác.

Cột **Nguồn** dùng đúng quy ước ở `00-dau-vao.md` §4: `Case` · `Repo` · `Suy ra`.

---

## 1. Năm phase

| ID | Phase | Người chính | Công cụ AI hiện tại |
| --- | --- | --- | --- |
| **PH-1** | Requirements | BA | ChatGPT |
| **PH-2** | Design | Tech Lead | ChatGPT (hội thoại riêng) |
| **PH-3** | Development | 2 Backend Dev | GitHub Copilot |
| **PH-4** | Test | QA | Gemini |
| **PH-5** | Ops / Release | `[CẦN XÁC NHẬN]` — team không có Ops riêng (OQ-02) | — |

---

## 2. Sơ đồ dòng chảy thông tin — hiện trạng

```
 PH-1 Requirements      PH-2 Design            PH-3 Development       PH-4 Test              PH-5 Ops
 ─────────────────      ─────────────          ─────────────────      ─────────────          ──────────
 BA + ChatGPT           Tech Lead + ChatGPT    Dev x2 + Copilot       QA + Gemini            Tech Lead/Dev
                        (hội thoại riêng)

 ART-01 PRD ──────────► ART-05 đánh giá ─┐
 ART-02 Story ─────┐    thiết kế         │
 ART-03 AC ────────┼──► (chat riêng)     ├──► ART-08 Code + PR ──► ART-11 Test case ──► ART-13 CI
 ART-04 Ghi chú    │    ART-06 ADR ──────┤    ART-09 Test tự động   ART-12 Bug report     ART-14 Runbook
 làm rõ (chat/họp) │    ART-07 Data/Flow ┘    ART-10 Migration/seed                        │
        │          │                                                                        │
        ▼          ▼                                                                        ▼
     DR-01 ✕    DR-02 ✕          DR-03 ✕              DR-05 ✕                          DR-06 ✕
   (BA→Dev)   (BA→QA)         (Tech Lead→Dev)       (Dev→QA)                     ART-15 phản hồi
                                                                                  vận hành ✕ không
                              DR-04 ✕ (Dev→BA/TL, ngược chiều)                    quay về PH-1

 ✕ = điểm thông tin bị mất hoặc sai lệch (mục 4)
```

**Đặc điểm chung của hiện trạng:** mỗi ô có AI riêng, mỗi AI có ngữ cảnh riêng, và **không có nơi chung nào** mà mọi ô cùng đọc và cùng ghi. Thông tin đi từ ô này sang ô khác bằng lời văn (story, PR, tin nhắn), không mang mã định danh.

---

## 3. Bảng artifact

| ID | Phase | Artifact | Người tạo | Người nhận | Dạng / nơi lưu | Nguồn | Có mã để truy vết? |
| --- | --- | --- | --- | --- | --- | --- | :---: |
| **ART-01** | PH-1 | Mô tả sản phẩm / phạm vi (`doc/prod.md`) | BA / PO | Tech Lead, Dev, QA | Markdown trong repo | `Repo` | ❌ |
| **ART-02** | PH-1 | User story backlog | BA (ChatGPT) | Dev, QA | Công cụ backlog của team `[CẦN XÁC NHẬN]` OQ-01 | `Suy ra` | ❌ |
| **ART-03** | PH-1 | Acceptance criteria | BA (ChatGPT) | Dev, QA | Gắn với story | `Suy ra` | ❌ |
| **ART-04** | PH-1 | Ghi chú làm rõ với stakeholder (hỏi–đáp) | BA | — *(thường không ai nhận)* | Họp / chat, không lưu có cấu trúc | `Suy ra` | ❌ |
| **ART-05** | PH-2 | Đánh giá thiết kế do AI hỗ trợ | Tech Lead (ChatGPT) | Dev | **Hội thoại riêng, không vào repo** | `Case` | ❌ |
| **ART-06** | PH-2 | Nhật ký quyết định kiến trúc (`doc/adr/001…007`) | Tech Lead | Dev, AI | Markdown trong repo | `Repo` | ⚠️ Có số ADR, không nối với story |
| **ART-07** | PH-2 | Mô hình dữ liệu và luồng backend (`data-model.md`, `backend-flows.md`) | Tech Lead / Dev | Dev, QA | Markdown trong repo | `Repo` | ❌ |
| **ART-08** | PH-3 | Source code và Pull Request | Dev (Copilot) | Tech Lead (review), QA | Git | `Case` + `Repo` | ❌ PR không nêu đã hiện thực quy tắc nào |
| **ART-09** | PH-3 | Test tự động (`tests/api.test.js`, 14 ca) | Dev | CI | Code | `Repo` | ❌ Tên ca mô tả hành vi, không trỏ về story |
| **ART-10** | PH-3 | Migration và seed (`src/db/`) | Dev | Mọi môi trường | Code | `Repo` | ❌ |
| **ART-11** | PH-4 | Test case của QA | QA (Gemini) | QA | `[CẦN XÁC NHẬN]` | `Case` (QA dùng Gemini tạo test case) | ❌ |
| **ART-12** | PH-4 | Bug report / kết quả test | QA | Dev | `Suy ra` | `Suy ra` | ❌ |
| **ART-13** | PH-5 | Pipeline CI (`.github/workflows/ci.yml`) và `doc/cicd.md` | Tech Lead / Dev | Cả team | Repo | `Repo` | — |
| **ART-14** | PH-5 | Hướng dẫn chạy và cấu hình (`HUONG-DAN-CHAY.md`, `README.md`, `Dockerfile`, `docker-compose.yml`) | Dev | Người vận hành, người mới | Repo | `Repo` | — |
| **ART-15** | PH-5 → PH-1 | Phản hồi vận hành (slot vẫn bị bỏ trống, số cuộc gọi thủ công) | Staff, bệnh viện | *(không có kênh nhận)* | Không có | `Case` (F-10 chỉ nói xử lý thủ công) + `Suy ra` | ❌ |

**Đọc bảng này thế nào:** 11 trên 15 artifact có thật trong repo hoặc được đề bài nêu (`Repo`/`Case`). 4 artifact còn lại (ART-02, 03, 04, 12) là `Suy ra`. **Không artifact nào có mã truy vết nối với artifact ở phase khác** — đây là gốc của mọi điểm đứt gãy dưới đây.

---

## 4. Điểm đứt gãy thông tin (context drift)

| ID | Giữa | Thông tin bị mất / sai | Biểu hiện | Bằng chứng | Hậu quả |
| --- | --- | --- | --- | --- | --- |
| **DR-01** | PH-1 → PH-3 (BA → Dev) | **Quy tắc nghiệp vụ** nằm rải trong lời văn của story, không có mã, không có nơi tập trung. Câu trả lời của stakeholder (ART-04) không đi cùng story | Dev nhận story xong phải hỏi lại BA 3–4 lần | F-07 (`Case`) | Mỗi lần hỏi lại là một lần mất ngữ cảnh; Copilot không có gì để đọc ngoài story |
| **DR-02** | PH-1 → PH-4 (BA → QA) | AC không trỏ về quy tắc nghiệp vụ, không có con số đo được. Gemini nhận AC dạng văn và **tự suy** logic | Test case không cover đúng business logic | F-08 (`Case`) | Test xanh nhưng không chứng minh được yêu cầu nào |
| **DR-03** | PH-2 → PH-3 (Tech Lead → Dev) | Quyết định thiết kế nằm trong **hội thoại ChatGPT riêng** của Tech Lead (ART-05), không vào repo. Dev và Copilot không thấy | Ràng buộc sống còn có trong ADR (ví dụ ADR-003, ADR-004: mọi thay đổi `slots.status` nằm trong transaction) nhưng không được nối với task nào | F-05 (`Case`); ADR-003/004 (`Repo`) | Copilot sinh code đúng cú pháp nhưng vi phạm ràng buộc; lỗi lộ ra ở review |
| **DR-04** | PH-3 → PH-1/PH-2 (Dev → BA/Tech Lead) — **ngược chiều** | Code đổi hành vi nhưng story, AC, ADR không được cập nhật. Tài liệu lệch dần khỏi thực tế | Reviewer phải đọc code để biết hệ thống làm gì | F-06 (`Case`); `Suy ra` | Thời gian review tăng gấp đôi vì không có tài liệu đáng tin để đối chiếu |
| **DR-05** | PH-3 → PH-4 (Dev → QA) | PR không nêu đã hiện thực quy tắc nào, giả định nào. QA đoán phải test gì | QA tạo test case từ story chứ không từ thứ Dev thực sự làm | `Suy ra` từ F-08 | Khe hở giữa "story nói gì" và "code làm gì" không ai nhìn thấy |
| **DR-06** | PH-5 → PH-1 (Ops → BA) | Phản hồi vận hành (slot vẫn trống, gọi điện thủ công vẫn diễn ra) không quay về backlog | Vấn đề gốc (F-10) tồn tại sau khi có tính năng | ART-15 không có kênh; F-10 (`Case`) | Không đo được tính năng có giải quyết vấn đề không |

Đề bài yêu cầu ít nhất 3 điểm đứt gãy. Trong sáu điểm trên, **DR-01, DR-02, DR-03** có bằng chứng trực tiếp từ đề bài (`Case`); **DR-04, DR-05, DR-06** là `Suy ra` và cần đối chiếu với team thật (OQ-01).

---

## 5. Vì sao mỗi phase dùng một AI tool riêng dẫn đến output không nhất quán

| # | Nguyên nhân | Biểu hiện trong case | DR |
| ---: | --- | --- | --- |
| 1 | **Mỗi tool có ngữ cảnh riêng** và không nhìn thấy ngữ cảnh của tool khác | ChatGPT của BA không biết ADR; Copilot không biết cuộc hội thoại của Tech Lead | DR-01, DR-03 |
| 2 | **Không có nguồn chung** để cùng đọc: thông tin đi qua lời văn, mỗi AI diễn giải lại theo cách của nó | Cùng một khái niệm (slot, khung giờ, lịch hẹn) được mỗi tool diễn đạt khác nhau | DR-01, DR-02 |
| 3 | **Không có mã định danh** nên không đối chiếu được output với nguồn | Không nói được test này kiểm chứng quy tắc nào | DR-02, DR-05 |
| 4 | **Quyết định không được lưu** ở nơi các tool khác đọc được | Câu trả lời của stakeholder nằm trong chat/họp | DR-01, DR-03 |
| 5 | **AI đồng ý với chính nó**: mỗi tool chỉ kiểm tra output của mình, không ai đối chiếu chéo | Review tăng gấp đôi vì phải kiểm tra lại từ đầu | DR-04 |

**Kết luận cho câu hỏi của Day 1:** AI làm nhanh hơn từng ô, nhưng tốc độ của cả quy trình do **chỗ nối** giữa các ô quyết định. Khi chỗ nối là lời văn không mã, không có nơi chung, thì việc mỗi ô nhanh hơn chỉ đẩy nhanh việc **sinh ra lệch** — và dồn chi phí sang review.

---

## 6. Đối chiếu checklist Day 1

| Mục checklist | Trạng thái | Ở đâu |
| --- | :---: | --- |
| Artifact Map liệt kê đủ artifact ở mỗi phase | ✅ | §3 |
| Xác định ≥ 3 điểm đứt gãy | ✅ 6 điểm (3 có bằng chứng `Case`) | §4 |
| Giải thích vì sao mỗi phase dùng một AI tool riêng dẫn đến output không nhất quán | ✅ | §5 |
