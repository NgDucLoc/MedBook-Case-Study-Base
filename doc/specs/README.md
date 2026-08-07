# Specification Package — Dynamic Appointment Rescheduling & Waiting List Management

**Hệ thống:** MedBook (Node.js 20 · Express 4 · PostgreSQL 16 · `pg` SQL thuần · Vanilla JS)
**Nguồn:** Day 2 — Architecture & System Design
**Phiên bản:** 1.0 — FROZEN · 2026-08-03
**Vị trí khi coding:** thư mục `doc/specs/` trong repo (9 file, giữ nguyên tên)

---

> ## Nguyên tắc hiệu lực
>
> Bộ 9 file này là **input đầu vào duy nhất** cho toàn bộ Day 3. Chúng ghi lại **KẾT QUẢ đã chốt** — không còn mục nào ở trạng thái "Cần xác nhận".
>
> **Khi bộ file này mâu thuẫn với bất kỳ mô tả, slide, hội thoại hay tài liệu nào trước đó, bộ file này là bản có hiệu lực.**
>
> File `02-frozen-business-rules.md` là bất khả xâm phạm: **AI Developer không được tự thay đổi, nới lỏng, bổ sung hay diễn giải lại.** Mọi thứ chưa chốt đã được gom về `08-open-questions.md` và **cố ý nằm ngoài phạm vi implement**.

---

## Danh mục 9 file

| # | File | Nội dung |
| ---: | --- | --- |
| 1 | [`01-context-scope.md`](01-context-scope.md) | Bối cảnh hệ thống, In/Out Scope, ràng buộc bắt buộc, đính chính so với codebase thật (không có Notification Service, không có API đổi lịch) |
| 2 | [`02-frozen-business-rules.md`](02-frozen-business-rules.md) | BR-01 → BR-08 — quy tắc đã CHỐT cho MVP, kèm chi tiết kỹ thuật và lý do |
| 3 | [`03-user-stories-acceptance-criteria.md`](03-user-stories-acceptance-criteria.md) | US-01 → US-07, AC theo Given–When–Then (Happy Path / Alternative / Exception / Timeout / Conflict) |
| 4 | [`04-data-model.md`](04-data-model.md) | DDL sẵn sàng migration (3 bảng mới), quyết định mô hình dữ liệu, vòng đời trạng thái, truy vấn chọn ứng viên, truy vấn kiểm tra lệch dữ liệu, seed data |
| 5 | [`05-api-contract.md`](05-api-contract.md) | Bảng endpoint (method, path, role, request, response, error codes) kèm ví dụ payload |
| 6 | [`06-component-file-mapping-convention.md`](06-component-file-mapping-convention.md) | Mỗi component trỏ tới file thật trong repo, quy ước code bắt buộc, thứ tự implement đề xuất |
| 7 | [`07-non-functional-requirements.md`](07-non-functional-requirements.md) | NFR-01 → NFR-08, ngưỡng đo được |
| 8 | [`08-open-questions.md`](08-open-questions.md) | OQ-01 → OQ-06 — vấn đề chưa chốt, cố ý nằm ngoài phạm vi implement |
| 9 | [`09-handoff-checklist.md`](09-handoff-checklist.md) | Handoff Checklist (12 tiêu chí AI-Ready) + bằng chứng kiểm chứng PostgreSQL thật + hướng dẫn sử dụng ở Day 3 |

---

## Đọc theo thứ tự nào

**Lần đầu mở gói:** `01` → `02` → `03` → `04` → `09` (checklist) để nắm toàn cảnh trước khi vào chi tiết kỹ thuật ở `05`/`06`.

**AI Developer chuẩn bị code một task cụ thể (Bước 3 của WB-3):** chỉ cần đọc `06-component-file-mapping-convention.md` (mục 6) để biết code vào file nào theo convention nào, rồi tra ngược lại `02`/`03`/`04`/`05` khi cần chi tiết luật/AC/API/DDL cho đúng component đang làm.

## Cách sử dụng ở Day 3

Đặt cả 9 file vào `doc/specs/` trong repo (giữ nguyên tên file), sau đó dùng đúng 1 prompt:

> "Đọc doc/specs/06-component-file-mapping-convention.md và implement theo mục 6. Khi cần chi tiết luật nghiệp vụ, acceptance criteria, data model hay API contract, tham chiếu các file 02/03/04/05 trong cùng thư mục."

Nếu AI agent cần toàn cảnh trước khi bắt đầu, có thể yêu cầu đọc `doc/specs/README.md` trước.

---

## Kiểm chứng PostgreSQL thật

Toàn bộ SQL trong `04-data-model.md` đã được **thực thi trên PostgreSQL 16.13** với schema MedBook thật (6 bảng gốc + DDL mới, **không có bảng `notifications`**) — không phải chỉ đọc lại bằng mắt. Lần chạy gần nhất: 2026-08-03. Chi tiết đầy đủ và bằng chứng nằm trong [`09-handoff-checklist.md`](09-handoff-checklist.md).

---

*Bộ file được xây theo WB-2 (Day 2). Được tiêu thụ bởi WB-3 (Day 3). Nguồn gốc: chuyển thể từ file `waitlist-feature.md` (bản 1-file) theo đúng cùng nội dung, chỉ tách theo 8 mục + Handoff Checklist thành 9 file riêng.*
