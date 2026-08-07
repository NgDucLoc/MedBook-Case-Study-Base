# QA Context Report

## 1. Feature Summary
- Feature: Dynamic Appointment Rescheduling & Waiting List Management
- Business Objective: tự động lấp slot trống bằng bệnh nhân phù hợp trong danh sách chờ, giảm
  thời gian điều phối thủ công, tăng tỷ lệ sử dụng lịch khám, cải thiện trải nghiệm bệnh nhân
- Scope: US-01 → US-07 trong `doc/specs/03-user-stories-acceptance-criteria.md`; Development
  Package nhận từ Activity 1 gồm `development-context.md`, `coding-plan.md`, `coding-log.md`,
  `unit-test-report.md`, `code-review.md`, `development-quality-gate.md` (đã PASS)

## 2. QA Scope
### In Scope
- 10 endpoint mới (§5.3) và side-effect ở 3 endpoint cũ (§5.2)
- Toàn bộ 8 Business Rule (BR-01 → BR-08) và 37 Acceptance Criteria (AC-01.1 → AC-07.6)
- Regression trên 16 endpoint hiện có / 14 test tích hợp cũ (NFR-05)
- UI mới cho cả 2 vai trò (patient, staff) — riêng phần này QA cần bấm thử qua trình duyệt
  thật, vì Development Package chỉ xác minh được bằng curl + kiểm tra tĩnh (không có browser
  automation trong môi trường phát triển)

### Out of Scope
- 6 Open Questions (OQ-01 → OQ-06) — cố ý ngoài phạm vi implement
- Notification Service, API đổi lịch trực tiếp — không tồn tại theo thiết kế (Đính chính 1, 2)
- Tải trọng thật (load test) — NFR-03 mới kiểm ở quy mô 20 vòng lặp, chưa phải 100 vòng đầy đủ

## 3. Components Under Test
| Component | Description | Priority |
|-----------|-------------|----------|
| UI | Thẻ đề xuất + đếm ngược (patient), panel danh sách chờ + nhật ký (staff) | High |
| API | 10 endpoint mới + 3 endpoint cũ có side-effect | High |
| Database | 3 bảng mới, 2 partial unique index bắt buộc (BR-04), bảng `notifications` phải KHÔNG tồn tại | High |
| External Services | Không có — Đính chính 1 xác nhận MedBook không có Notification Service | N/A |

## 4. Critical Business Rules
| ID | Business Rule | Priority |
|----|---------------|----------|
| BR-01 | Kích hoạt Offer Engine đúng 2 nguồn + lead time ≥ 30 phút | High |
| BR-02 | Ưu tiên y tế thắng thời gian chờ, không random/FIFO thuần | High |
| BR-03 | 6 điều kiện ứng viên, không nới lỏng | High |
| BR-04 | 1 offer `sent`/slot và /bệnh nhân | High |
| BR-05 | Hạn trả lời 15 phút, cắt bởi giờ slot | Medium |
| BR-06 | Tự động chuyển tiếp khi từ chối/hết hạn | High |
| BR-07 | Transaction 7 bước, 3 mã 409 phân biệt, an toàn dưới đồng thời | High |
| BR-08 | Phân quyền + không lộ dữ liệu y tế + nhật ký đầy đủ | High |

## 5. High-Risk Areas
| Risk | Impact | Mitigation |
|------|--------|------------|
| 3 mã 409 của BR-07 dễ bị nhầm lẫn (đã xảy ra 1 lần trong Activity 1 — CR-02) | Bệnh nhân nhận sai thông báo, khó debug | Test riêng từng nhánh AC-04.2/04.3/04.4 bằng dữ liệu tạo state chính xác (không chỉ test happy path) |
| Đồng thời trên cùng 1 slot (accept vs đặt trực tiếp) | Double-booking hoặc lỗi 500 | AC-04.6 (NFR-03) — chạy lặp lại nhiều vòng, kiểm cả 3 điều kiện: đúng 1×201, đúng 1×409, 0×500 |
| Rò rỉ dữ liệu y tế cho bệnh nhân (`medicalPriority`, vị trí hàng đợi) | Vi phạm quyền riêng tư (BR-08), rủi ro pháp lý | Test phủ định — assert response KHÔNG chứa từng khoá cấm, không chỉ kiểm khoá được phép có mặt |
| UI chưa qua browser thật | Lỗi hiển thị/JS runtime không phát hiện được bằng curl | QA cần bấm thử thủ công qua trình duyệt trước khi coi UI là "đã kiểm chứng" |

## 6. Testing Strategy
- Integration Testing: tái sử dụng `tests/waiting-list.test.js` (37 case, HTTP thật + PostgreSQL
  thật, không mock) làm bằng chứng chính — đúng triết lý test đã có sẵn trong repo (§6.4)
- End-to-End Testing: kịch bản curl thủ công đã ghi lại ở `unit-test-report.md` phụ lục (staff
  thêm waitlist → huỷ lịch → offer tự sinh → bệnh nhân xem/chấp nhận → nhật ký) — dùng làm smoke
  test trước khi release; bổ sung kiểm tra qua trình duyệt thật cho phần UI
- Regression Testing: `tests/api.test.js` (14 test cũ) phải giữ nguyên 14/14 xanh (NFR-05)
- Negative Testing: đã có trong bộ 37 test — 3 mã 409 của accept, 403 phân quyền, 400 dữ liệu
  không hợp lệ, phủ định trường cấm (BR-08)

## 7. Testing Priorities
1. BR-07 (accept) — nơi phức tạp nhất, đã có 1 defect thật trong Activity 1, ưu tiên xác nhận lại kỹ
2. BR-01/BR-02/BR-03 (chọn ứng viên) — luật nghiệp vụ cốt lõi, sai sẽ không tự lộ ra qua HTTP status (vẫn trả 200 nhưng chọn sai người)
3. BR-08 (quyền riêng tư) — rủi ro pháp lý, kiểm bằng phủ định chứ không chỉ khẳng định

---

### Human Checkpoint — trước khi chuyển sang bước sau:
- [x] QA Scope phản ánh đúng phạm vi feature.
- [x] Không bỏ sót Business Rules quan trọng.
- [x] Các thành phần cần kiểm thử đã được xác định đầy đủ.
- [x] Testing Strategy phù hợp với mục tiêu của feature — có ghi rõ giới hạn (chưa qua browser thật, NFR-03 quy mô nhỏ hơn) để QA biết cần bù ở đâu.
