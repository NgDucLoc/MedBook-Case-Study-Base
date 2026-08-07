> **Đây là 1 trong 9 file của Specification Package — Dynamic Appointment Rescheduling & Waiting List Management (MedBook).**
> File này là input đầu vào cho Day 3, ngang hàng với 8 file còn lại trong `spec/`. Xem `spec/README.md` để biết toàn cảnh và thứ tự đọc.
>
> **Khi file này mâu thuẫn với bất kỳ mô tả, slide, hội thoại hay tài liệu nào trước đó, file này là bản có hiệu lực.** Phiên bản: 1.0 — FROZEN · 2026-08-03.

---

# 7. Non-Functional Requirements

> Mỗi NFR có **ngưỡng đo được** và **cách đo**. NFR không đo được thì không phải NFR.

## NFR-01

**Độ trễ tạo đề xuất.** Từ lúc `POST /api/appointments/:id/cancel` trả response tới lúc offer đầu tiên tồn tại trong `appointment_offers` với `status='sent'`: **≤ 5 giây**.

*Cách đo:* test tích hợp — hủy lịch, poll `appointment_offers` mỗi 200ms, assert tìm thấy trong 5s. Kiểm chứng bởi AC-02.1.

## NFR-02

**Độ trễ phát hiện hết hạn.** Từ `expires_at` tới lúc offer chuyển `expired` **và** offer kế tiếp được tạo (nếu còn ứng viên): **≤ 60 giây**.

*Cách đo:* `OFFER_SWEEP_INTERVAL_SECONDS = 30` ⇒ độ trễ tối đa lý thuyết 30s + thời gian xử lý. Test bằng `sweepOnce()` gọi trực tiếp. Kiểm chứng bởi AC-06.1.

## NFR-03

**Đúng đắn dưới đồng thời.** Trong **100 lần** chạy kịch bản hai request đồng thời tranh cùng một slot: **đúng một** trả `201`, một trả `409`, **0 lần** trả `500`, và `appointments` luôn có **đúng một** dòng hoạt động cho slot đó.

*Cách đo:* vòng lặp 100 lần `Promise.allSettled`, cộng truy vấn kiểm tra lệch dữ liệu ở [§4.6](04-data-model.md#46-bất-biến-dữ-liệu-và-truy-vấn-kiểm-tra-lệch) sau mỗi vòng. Kiểm chứng bởi AC-04.6.

## NFR-04

**Không tăng bề mặt phụ thuộc.** Sau khi hoàn thành feature: `package.json` **giống hệt** bản gốc (`git diff package.json` rỗng); `docker-compose.yml` **giống hệt**; `.github/workflows/ci.yml` **giống hệt**; `docker compose up --build` vẫn chạy được bằng một lệnh.

*Cách đo:* `git diff --exit-code package.json package-lock.json docker-compose.yml .github/workflows/ci.yml`.

## NFR-05

**Tương thích ngược.** **14/14** test tích hợp hiện có vẫn xanh. **16/16** endpoint hiện có giữ nguyên request, response shape và mã lỗi.

*Cách đo:* `npm test`. Kiểm chứng thủ công contract 3 endpoint có side effect mới.

## NFR-06

**Idempotency.** Gọi lại lần thứ hai bất kỳ endpoint chuyển trạng thái nào (`accept`, `decline`) với cùng tham số ⇒ trả `409`, **không** tạo dữ liệu trùng. Sweeper chạy chồng ⇒ mỗi offer xử lý **đúng một lần**.

*Cách đo:* AC-04.4, AC-05.3, AC-06.5. Kiểm bằng `select count(*) from appointments where slot_id = $1 and status in ('booked','confirmed')` = 1.

## NFR-07

**Bảo mật và quyền riêng tư.**

- **100%** truy vấn SQL mới là parameterized — 0 chỗ nối chuỗi.
- Response của endpoint dành cho bệnh nhân **không chứa** bất kỳ khóa nào trong: `medicalPriority`, `medical_priority`, `queuePosition`, `totalWaiting`, `note`, `diagnosis`.
- **100%** thao tác trên offer kiểm quyền sở hữu ở tầng service.

*Cách đo:* test phủ định — `assert.ok(!JSON.stringify(data).includes(forbidden))` cho từng khóa cấm. Cộng grep tìm chuỗi nối trong SQL. Kiểm chứng bởi AC-03.2, AC-04.5, AC-05.4.

## NFR-08

**Khả năng vận hành và phục hồi.**

- **Không có state trong bộ nhớ** — app restart giữa lúc offer đang treo, sweeper chu kỳ sau vẫn dọn đúng.
- Lỗi của Offer Engine **không** làm thất bại thao tác hủy lịch hay đổi trạng thái slot (kiểm bằng cách ném lỗi giả trong Offer Engine, assert `cancel` vẫn trả `200`).
- `OFFER_ENGINE_ENABLED=false` ⇒ hệ thống hành xử **giống hệt** trước feature; 14 test cũ vẫn xanh.
- Sau một luồng accept hoàn chỉnh, **cả 4** truy vấn kiểm tra lệch dữ liệu trả **0 dòng**.

*Cách đo:* test tích hợp + 4 truy vấn ở [§4.6](04-data-model.md#46-bất-biến-dữ-liệu-và-truy-vấn-kiểm-tra-lệch).

---

## Bảng tra nhanh NFR

| NFR | Ngưỡng | Cách đo | AC liên quan |
| --- | --- | --- | --- |
| NFR-01 | Tạo offer ≤ **5 giây** | Poll DB sau khi hủy lịch | AC-02.1 |
| NFR-02 | Phát hiện hết hạn ≤ **60 giây** | `sweepOnce()` + timestamp | AC-06.1 |
| NFR-03 | **100/100** lần đồng thời đúng, **0** lỗi 500 | Vòng lặp `Promise.allSettled` | AC-04.6 |
| NFR-04 | `git diff` **rỗng** trên 4 file cấu hình | `git diff --exit-code` | — |
| NFR-05 | **14/14** test cũ xanh, **16/16** endpoint không đổi | `npm test` | — |
| NFR-06 | Gọi lại → `409`, **0** dữ liệu trùng | `count(*) = 1` | AC-04.4, AC-06.5 |
| NFR-07 | **100%** parameterized, **0** khóa cấm trong response | Test phủ định + grep | AC-03.2, AC-04.5 |
| NFR-08 | **0** state bộ nhớ, **4/4** truy vấn lệch trả 0 dòng | Restart + 4 truy vấn | — |

---

---

[← Component → File Mapping & Convention](06-component-file-mapping-convention.md) · [Mục lục](README.md) · [Open Questions (OQ-01 → OQ-06) →](08-open-questions.md)
