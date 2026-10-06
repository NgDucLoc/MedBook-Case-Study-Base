# WB-1 — Từ SDLC truyền thống sang SDLC có AI tham gia

> **Mã:** WB1 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Đầu vào:** `de-bai/`, `tai-lieu-tham-chieu/`, `source-code/` · **Đầu ra dùng cho:** WB-2 → WB-5

---

## 1. Bộ tài liệu này là gì

Team MedBook có 5 người, mỗi người dùng một công cụ AI riêng, và **thông tin không chạy được từ ô này sang ô khác**. WB-1 làm ba việc:

1. Chỉ ra artifact nào sinh ra ở mỗi phase và **thông tin đứt gãy ở đâu**.
2. Chỉ ra AI tạo giá trị ở đâu, và ranh giới Human–AI.
3. Đề xuất quy trình mới, **kèm luật chơi** để các WB sau dùng lại: tài liệu chung có mã, cổng duyệt của Human, sửa tài liệu trước khi sửa code.

Chưa chạm code. Đã chạy thử ứng dụng (`docker compose up --build`, `http://localhost:4300`) để chắc rằng artifact được liệt kê là artifact có thật.

---

## 2. Danh mục file

| File | Nội dung | Deliverable của Day 1 |
| --- | --- | --- |
| `00-dau-vao.md` | Đầu vào, dữ kiện, mức sẵn sàng, thông tin còn thiếu | — |
| `01-artifact-map.md` | Artifact theo phase, sơ đồ dòng chảy, **điểm đứt gãy (DR)** | **SDLC Artifact Map** |
| `02-ai-opportunity-matrix.md` | Cơ hội AI theo phase (OPP), pain point AI không giải quyết được | **AI Opportunity Matrix** |
| `03-responsibility-matrix.md` | Việc H / A→H / A (RSP), **cổng duyệt (CP)**, rủi ro khi AI tự chạy | **Human–AI Responsibility Matrix** |
| `04-future-state-workflow.md` | Quy trình mới (WF), **điểm bàn giao (HO)**, so sánh cũ/mới | **Future-State Workflow** |
| `05-nguyen-tac-chung.md` | **Luật chơi (NT)** và ràng buộc kỹ thuật bất biến (K) cho WB-2 → WB-5 | — *(bổ sung)* |
| `06-nhat-ky-quyet-dinh.md` | Quyết định cần duyệt (HR), câu hỏi mở (OQ), danh sách cần kiểm tra | — |

**Bối cảnh chung (IN-09):** mô tả MedBook đầu Day 1 suy ngược từ code nằm ở `Workbooks/boi-canh-chung/`, dùng chung cho WB-1 → WB-5; không thuộc bài nộp WB-1.

---

## 3. Thứ tự đọc

**Người lần đầu mở bộ tài liệu:** `01` → `04` → `05`.
**Muốn duyệt nhanh:** `06` (§3 — danh sách cần kiểm tra) rồi đi theo liên kết.

---

## 4. Hệ thống mã

Mã chỉ cấp một lần, không tái sử dụng. Bỏ một mục thì đánh `[BỎ]`, giữ mã.

**Mã của WB-1**

| Tiền tố | Nghĩa | File nguồn |
| --- | --- | --- |
| `IN-xx` | Đầu vào | `00-dau-vao.md` |
| `PH-x` | Phase | `01-artifact-map.md` |
| `ART-xx` | Artifact | `01-artifact-map.md` |
| `DR-xx` | Điểm đứt gãy thông tin | `01-artifact-map.md` |
| `OPP-xx` | Cơ hội AI | `02-ai-opportunity-matrix.md` |
| `RSP-xx` | Việc và phân loại trách nhiệm | `03-responsibility-matrix.md` |
| `CP-xx` | Cổng duyệt | `03-responsibility-matrix.md` |
| `WF-xx` | Bước quy trình | `04-future-state-workflow.md` |
| `HO-xx` | Điểm bàn giao | `04-future-state-workflow.md` |
| `NT-xx` | Nguyên tắc chung | `05-nguyen-tac-chung.md` |
| `K-xx` | Ràng buộc kỹ thuật bất biến | `05-nguyen-tac-chung.md` |
| `HR1-xx` | Quyết định cần duyệt (mã HR đặt tiền tố theo WB: `HR1-`, `HR2-`, …) | `06-nhat-ky-quyet-dinh.md` |
| `OQ-xx` | Câu hỏi mở | `06-nhat-ky-quyet-dinh.md` |

**Mã các WB sau sẽ thêm vào (cùng một chuỗi, không viết lại tầng cũ)**

| WB | Mã mới | Trỏ về |
| --- | --- | --- |
| WB-2 | `BR`, `US`, `AC`, `Q`, `R`, `ADR`, `CMP`, `API`, `ENT`, `RISK`, `TASK` | `CP`, `HO`, `NT`, `K` của WB-1 |
| WB-3 | Mục coding-log, mục review | `TASK`, `AC`, `BR` |
| WB-4 | `FAIL`, `GOV` | `TASK`, `BR`, `AC` nơi AI sai |
| WB-5 | `MET`; bản v2 của `OPP`, `RSP` | `FAIL`, `GOV`, `TASK` làm bằng chứng |

---

## 5. Hợp đồng vào/ra

| | Nội dung |
| --- | --- |
| **Đầu vào** | `IN-01` → `IN-09` (`00-dau-vao.md` §1) |
| **Đầu ra cho WB-2** | `04-future-state-workflow.md` (WF-01 → WF-08, HO-01, CP-01 → CP-07) · `05-nguyen-tac-chung.md` (NT, K) · `03-responsibility-matrix.md` (RSP, CP) |
| **Điều kiện để WB-2 bắt đầu** | Các file trên ở trạng thái `Đã duyệt` (hiện là `Chờ duyệt`) |
| **Đầu ra sẽ được cập nhật ở WB-5** | `02-ai-opportunity-matrix.md` và `03-responsibility-matrix.md` → bản v2 có đối chiếu v1 và bằng chứng |

---

## 6. Trạng thái

| Mục | Số lượng |
| --- | ---: |
| Quyết định cần Human duyệt (HR) | 6 |
| Câu hỏi còn mở (OQ) | 5 — không câu nào chặn WB-2 |
| Mục `Suy ra` chờ đối chiếu với team thật | 4 artifact, 3 điểm đứt gãy |

Duyệt xong thì chuyển trạng thái các file sang `Đã duyệt` và điền cột "Quyết định của Human" ở `06-nhat-ky-quyet-dinh.md`.
