# Day 3 — Bộ tài liệu học viên (AI-Driven Development & QA)

Bộ file này đi kèm **`WB-3.docx`**. Học viên làm theo workbook, mỗi bước điền vào một file `.md` template tương ứng ở đây.

## Đầu vào (input)
| File | Nội dung |
|---|---|
| [`../../../doc/specs/README.md`](../../../doc/specs/README.md) | **AI-Ready Specification Package** — kết quả Day 2 (Requirement + Architecture + Design), phiên bản 1.0 FROZEN · 2026-08-03, gồm 9 file (`01-context-scope.md` … `09-handoff-checklist.md`) + mục lục. Đây là input đầu vào cho toàn bộ Day 3. Đọc `README.md` trước để nắm thứ tự đọc, sau đó đọc `01` → `09`. |

> Trong quá trình coding ở Bước 3, học viên dùng đúng bộ 9 file đã có sẵn tại `doc/specs/` trong repo (giữ nguyên tên file) rồi prompt: *"Đọc doc/specs/06-component-file-mapping-convention.md và implement theo mục 6. Khi cần chi tiết luật nghiệp vụ, acceptance criteria, data model hay API contract, tham chiếu các file 02/03/04/05 trong cùng thư mục."*

## Activity 1 — AI-Assisted Development
| Bước (WB) | Template | Output |
|---|---|---|
| Bước 0 — Readiness Check | *(làm trực tiếp trong WB-3.docx)* | Bảng đánh giá ngữ cảnh |
| Bước 1 — Development Context | [`activity1-development/development-context.md`](activity1-development/development-context.md) | Development Context |
| Bước 2 — Lập kế hoạch | [`activity1-development/coding-plan.md`](activity1-development/coding-plan.md) | Coding Plan |
| Bước 3 — AI-Assisted Coding | [`activity1-development/coding-log.md`](activity1-development/coding-log.md) | Source code + Coding Log |
| Bước 4 — Unit Test (Vòng 1) | [`activity1-development/unit-test-plan.md`](activity1-development/unit-test-plan.md) | Unit Test Plan |
| Bước 4 — Unit Test (Vòng 2) | [`activity1-development/unit-test-report.md`](activity1-development/unit-test-report.md) | Unit Test source + Report |
| Bước 5 — Code Review | [`activity1-development/code-review.md`](activity1-development/code-review.md) | Bảng issue + refactor |
| Bước 6 — Quality Gate | [`activity1-development/development-quality-gate.md`](activity1-development/development-quality-gate.md) | Báo cáo PASS/FAIL |

## Activity 2 — AI-Assisted QA & Release Readiness
| Bước (WB) | Template | Output |
|---|---|---|
| Bước 1 — QA Readiness Check | [`activity2-qa/qa-context-report.md`](activity2-qa/qa-context-report.md) | QA Context Report |
| Bước 2 — Integration Testing | *(sinh Integration Test Package: plan + scenarios + suite + execution guide)* | Integration Test Package |
| Bước 3 — End-to-End Validation | *(sinh End-to-End Testing Package: flows + scenarios + suite + guide)* | E2E Testing Package |
| Bước 4 — Defect Analysis | [`activity2-qa/defect-report.md`](activity2-qa/defect-report.md) | Defect Analysis Report |
| Bước 5 — Release Readiness | [`activity2-qa/release-report.md`](activity2-qa/release-report.md) | Release Readiness Report |

> Bước 2 và Bước 3 chủ yếu sinh ra **test source code** (theo công nghệ của hệ thống) và execution guide; nhóm lưu chúng cạnh code test hoặc trong thư mục `tests/`. Kết quả thực thi được tổng hợp lại ở `defect-report.md` và `release-report.md`.

## Cách dùng nhanh
1. Đọc `../../../doc/specs/README.md` rồi lần lượt `01-context-scope.md` → `09-handoff-checklist.md`.
2. Làm tuần tự Activity 1 (Bước 0 → 6), điền dần các template ở `activity1-development/`.
3. Bàn giao sang Activity 2 (Bước 1 → 4), điền các template ở `activity2-qa/`.
4. Chuẩn bị slide 5 phút cho mỗi Activity theo mục **Deliverables** trong WB-3.docx.
