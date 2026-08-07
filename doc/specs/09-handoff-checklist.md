> **Đây là 1 trong 9 file của Specification Package — Dynamic Appointment Rescheduling & Waiting List Management (MedBook).**
> File này là input đầu vào cho Day 3, ngang hàng với 8 file còn lại trong `spec/`. Xem `spec/README.md` để biết toàn cảnh và thứ tự đọc.
>
> **Khi file này mâu thuẫn với bất kỳ mô tả, slide, hội thoại hay tài liệu nào trước đó, file này là bản có hiệu lực.** Phiên bản: 1.0 — FROZEN · 2026-08-03.

> Bao gồm Handoff Checklist (12 tiêu chí), bằng chứng kiểm chứng PostgreSQL thật, và hướng dẫn sử dụng ở Day 3.

---

# Handoff Checklist

> 12 tiêu chí xác nhận tài liệu này **AI-Ready** — đủ để bàn giao cho Day 3 mà AI Developer không phải đoán và không phải hỏi lại về những thứ đã chốt.

| # | Tiêu chí | ✅ | Bằng chứng |
| ---: | --- | :---: | --- |
| **1** | **Mọi Business Rule đã CHỐT, có ID ổn định, kèm chi tiết kỹ thuật và lý do** — không mục nào ở trạng thái "Cần xác nhận" | ✅ | [Mục 2](02-frozen-business-rules.md#2-frozen-business-rules) — BR-01 → BR-08, mỗi BR có bảng/SQL cụ thể và phần "Lý do" |
| **2** | **Mọi User Story có ít nhất một AC kiểm thử được**, phủ đủ Happy / Alternative / Exception / Timeout / Conflict | ✅ | [Mục 3](03-user-stories-acceptance-criteria.md#3-user-stories--acceptance-criteria) — 7 US, 37 AC, [bảng phủ tình huống](03-user-stories-acceptance-criteria.md#bảng-phủ-tình-huống) |
| **3** | **Mọi AC truy được về ít nhất một Business Rule** | ✅ | Mỗi US ghi rõ "**BR:**"; [bảng tra nhanh BR](02-frozen-business-rules.md#bảng-tra-nhanh-business-rules) ánh xạ ngược BR → AC |
| **4** | **Mọi Business Rule có đúng một component chịu trách nhiệm** — luật không phân tán | ✅ | [Bảng tra nhanh BR](02-frozen-business-rules.md#bảng-tra-nhanh-business-rules) cột "Component"; [§6.1](06-component-file-mapping-convention.md#61-bảng-ánh-xạ-component--file-thật-trong-repo) |
| **5** | **Data model là DDL chạy được**, idempotent, có rollback | ✅ | [§4.2](04-data-model.md#42-ddl--sẵn-sàng-đưa-vào-migration) — **đã chạy 3 lần liên tiếp trên PostgreSQL 16.13** |
| **6** | **API contract đủ để sinh code mà không cần đoán** — có method, path, role, request, response, error codes, ví dụ payload | ✅ | [Mục 5](05-api-contract.md#5-api-contract) — bảng 10 endpoint + payload mẫu cho từng cái |
| **7** | **Mỗi component trỏ tới file thật trong repo**, ghi rõ New / Extend / Reuse | ✅ | [§6.1](06-component-file-mapping-convention.md#61-bảng-ánh-xạ-component--file-thật-trong-repo) — 8 file mới, 8 sửa, 6 dùng nguyên |
| **8** | **Quy ước code khớp với source code hiện tại**, không phải chuẩn lý tưởng áp từ ngoài | ✅ | [§6.4](06-component-file-mapping-convention.md#64-quy-ước-code-bắt-buộc) — mọi mẫu trích từ `slotRepository.js`, `appointmentService.js` thật |
| **9** | **Ba tình huống concurrency bắt buộc đã thiết kế**: hai người cùng chấp nhận · thao tác lặp lại · chấp nhận sau khi hết hạn | ✅ | [BR-07](02-frozen-business-rules.md#br-07) (3 lớp bảo vệ) · [§4.4](04-data-model.md#44-vòng-đời-trạng-thái) (conditional UPDATE) · AC-04.4, AC-04.6, AC-06.5 |
| **10** | **NFR có ngưỡng đo được và cách đo** — không có "nhanh", "ổn định" chung chung | ✅ | [Mục 7](07-non-functional-requirements.md#7-non-functional-requirements) — NFR-01 → NFR-08, mỗi cái có con số và phương pháp đo |
| **11** | **Vấn đề chưa chốt được tách riêng, đánh dấu rõ, có chủ, và không chặn implement** | ✅ | [Mục 8](08-open-questions.md#8-open-questions) — OQ-01 → OQ-06, mỗi cái ghi ai quyết và đã chừa chỗ gì trong schema |
| **12** | **Đính chính so với codebase thật đã được nêu ở đầu tài liệu** — không để AI xây dựa trên thành phần không tồn tại | ✅ | [§1.2](01-context-scope.md#12-️-đính-chính-so-với-codebase-thật) — 4 đính chính: không có Notification Service, không có API đổi lịch, bác sĩ không phải người dùng, `patients` không có mức ưu tiên |

---

## Kiểm chứng bằng PostgreSQL thật

Toàn bộ SQL trong tài liệu này đã được **thực thi trên PostgreSQL 16.13** với schema MedBook thật (6 bảng gốc + DDL §4.2, **không có bảng `notifications`**), không phải chỉ đọc lại bằng mắt. Lần chạy gần nhất: 2026-08-03, trên chính bản DDL đang nằm trong tài liệu này (đã bỏ `notifications` so với bản nháp đầu).

| Kiểm chứng | Kết quả |
| --- | :---: |
| DDL [§4.2](04-data-model.md#42-ddl--sẵn-sàng-đưa-vào-migration) chạy **3 lần liên tiếp** trên schema 6 bảng gốc | ✅ Idempotent, không lỗi |
| Truy vấn chọn ứng viên [§4.5](04-data-model.md#45-truy-vấn-chọn-ứng-viên) — BR-02: ưu tiên y tế thắng thời gian chờ | ✅ Bệnh nhân `urgent` vào **sau** 1 giờ vẫn được chọn trước bệnh nhân `normal` vào trước 2 giờ |
| BR-04 — `one_pending_offer_per_slot` chặn 2 offer `sent` cùng slot | ✅ `duplicate key value violates unique constraint "one_pending_offer_per_slot"` |
| BR-04 — `one_pending_offer_per_patient` chặn 1 bệnh nhân giữ 2 offer `sent` | ✅ `duplicate key value violates unique constraint "one_pending_offer_per_patient"` |
| Mẫu UPDATE `accepted` ở [§4.4](04-data-model.md#44-vòng-đời-trạng-thái) (kèm `appointment_id` cùng câu lệnh) | ✅ Chạy thành công |
| Mẫu UPDATE chung (declined/expired/cancelled) áp nhầm cho `accepted` | ✅ Bị chặn đúng như cảnh báo: `violates check constraint "appointment_offers_check1"` |
| Kỹ thuật test lùi cả `sent_at` + `expires_at` ở [§6.4](06-component-file-mapping-convention.md#64-quy-ước-code-bắt-buộc) | ✅ Chạy thành công |
| Chỉ lùi `expires_at`, không lùi `sent_at` (cách làm sai) | ✅ Bị chặn đúng như cảnh báo: `violates check constraint "appointment_offers_check"` |
| 4 truy vấn kiểm tra lệch dữ liệu [§4.6](04-data-model.md#46-bất-biến-dữ-liệu-và-truy-vấn-kiểm-tra-lệch) trên luồng accept hoàn chỉnh | ✅ Cả 4 trả 0 dòng |

**Hai lỗi thật trong bản nháp đầu tiên đã được phát hiện nhờ chạy thử, và tài liệu này đã sửa + xác nhận lại bản sửa:**

1. Mẫu conditional UPDATE chung **không dùng được** cho phép chuyển sang `accepted` — thiếu `appointment_id` sẽ vi phạm CHECK constraint. [§4.4](04-data-model.md#44-vòng-đời-trạng-thái) nay có **hai mẫu riêng biệt**, cả hai đã chạy thật.
2. Kỹ thuật test "đẩy `expires_at` về quá khứ" **bị `check (expires_at > sent_at)` chặn**. [§6.4](06-component-file-mapping-convention.md#64-quy-ước-code-bắt-buộc) nay hướng dẫn lùi **cả `sent_at`**, đã chạy thật.

> Đây chính là điều tài liệu này muốn chứng minh: một đặc tả *nghe có vẻ đúng* vẫn có thể chứa lỗi mà chỉ việc chạy thật mới lộ ra.

---

## Cách sử dụng ở Day 3

1. Đặt file này vào repo tại **`doc/specs/waitlist-feature.md`**.
2. Prompt cho AI Developer:

```
Đọc doc/specs/waitlist-feature.md và implement theo mục 6.
```

3. Nếu chỉ làm một phần, chỉ rõ bước trong [§6.5](06-component-file-mapping-convention.md#65-thứ-tự-implement-đề-xuất):

```
Đọc doc/specs/waitlist-feature.md và implement bước ④ trong mục 6.5
(offerRepository + truy vấn chọn ứng viên). Tuân thủ BR-02, BR-03 ở mục 2
và quy ước code ở mục 6.4. Không chạm vào các mục trong Open Questions.
```

---

**HẾT — Specification Package v1.0 FROZEN**

---

[← Open Questions (OQ-01 → OQ-06)](08-open-questions.md) · [Mục lục](README.md)
