# Day 4 — Bộ tài liệu học viên (AI-Driven Quality Governance & Failure Analysis)

Bộ file này đi kèm **`WB-4.docx`**. Day 4 **không viết code mới**: học viên audit sản phẩm Day 1–3 của chính nhóm, mỗi bước tạo một file output theo yêu cầu của `WB-4.docx`.

## Đầu vào (input) — Bước 0 Readiness Check

| Artifact (theo WB-4) | Vị trí trong repo |
|---|---|
| SDLC Artifact Map (Day 1) | [`dau-vao/day1/01-artifact-map.md`](dau-vao/day1/01-artifact-map.md) (cùng Responsibility Matrix, Future-State Workflow trong thư mục) |
| Day 2 — bài làm của nhóm (BR-01..16, 43 AC, v0.1) | [`dau-vao/day2-bai-lam/`](dau-vao/day2-bai-lam/README.md) |
| Specification Package FROZEN 2026-08-03 (9 file, BR-01..08, 41 AC) | [`../../../doc/specs/README.md`](../../../doc/specs/README.md) |
| Development Package (Day 3) | [`../Day03/activity1-development/`](../Day03/activity1-development/) — `coding-log.md`, `unit-test-report.md`, `code-review.md`, `development-context.md`, … |
| QA Package (Day 3) | [`../Day03/activity2-qa/`](../Day03/activity2-qa/) — `qa-context-report.md`, `defect-report.md`, `release-report.md` |
| Source code + test suite thật đang chạy | `src/`, `server.js`, `tests/` ở gốc repo (nhánh `day03` trở đi) |

> ⚠️ Có hai bản "Day 2" với số luật khác nhau: bài làm của nhóm (`dau-vao/day2-bai-lam/`, BR-01..16, 43 AC) và spec FROZEN (`doc/specs/`, BR-01..08, 41 AC). Bản nào là input đúng của Day 3, và Day 3 đã dùng bản nào, là câu hỏi của Bước 1.

## Các bước và output (chi tiết trong `WB-4.docx`)

| Bước | Việc phải làm | Output |
|---|---|---|
| Bước 0 | Readiness Check — đủ artifact để audit chưa? | Bảng Đã có / Có một phần / Chưa có |
| Bước 1 | SDLC Context-Drift Audit | SDLC Context-Drift Log |
| Bước 2 | Code & Test-Coverage Failure Analysis (đối chiếu BR-01..08 và 41 AC) | Code Failure Findings |
| Bước 3 | Phân loại nguyên nhân gốc (5 nhãn) + mức độ | Root Cause Classification |
| Bước 4 | Thiết kế 3–5 governance rule kiểm chứng được | Governance Charter |
| Trình bày | 5 phút/nhóm | Context-Drift Audit · 3 finding quan trọng nhất · Root Cause Distribution · 3 rule Charter · một câu hỏi mở |

Học viên tự tạo các file output; bộ này không kèm template.

## Nguyên tắc

AI đóng vai **AI-Assisted Auditor**; Human chịu trách nhiệm phán đoán mức độ nghiêm trọng và quyết định governance (Human-on-the-loop). Không kết luận "an toàn" nếu không có bằng chứng trỏ tới file/dòng/artifact.

Case mẫu (audit "Failure Analysis - day03 Offer Engine"): https://claude.ai/code/artifact/1eebdde3-ffa9-4d32-b342-29d104130a8c
