# Defect Analysis Report

## 1. Defect Summary
| ID | Severity (Critical/High/Medium/Low) | Description | Status |
|----|----------|-------------|--------|
| DEV-01 | Critical | Code Day 3 sẵn có trong nhánh `day03` bám theo tài liệu spec 1-file đã lỗi thời, sai lệch hệ thống với bộ 9 file FROZEN (schema, vai trò, endpoint, thiếu audit log, có component bị cấm) | **Closed** — đã viết lại toàn bộ trong Activity 1 (`code-review.md` CR-01) |
| DEV-02 | High | `offerEngineService.acceptOffer` trả nhầm mã 409 giữa AC-04.2 ("Khung giờ đã được đặt") và AC-04.4 ("Đề xuất không còn hiệu lực") khi chấp nhận lần thứ hai | **Closed** — đã sửa trong Activity 1 (`code-review.md` CR-02), xác nhận lại bởi QA ở mục 3 dưới |
| QA-01 | N/A (không phải defect) | `PUT /api/waiting-list/:id` (endpoint ③) chưa từng được test bởi bộ tự động 37 case của Activity 1 | **Verified — không có defect.** QA đã bổ sung kiểm thử thăm dò trực tiếp qua curl (mục 3), kết quả đúng theo §5.4 ③: 200 khi hợp lệ, 400 khi `medicalPriority` sai enum, 404 khi id không tồn tại |
| QA-02 | Low (rủi ro quy trình, không phải defect chức năng) | UI (`public/js/`) chưa từng được xác minh bằng trình duyệt thật ở cả Activity 1 lẫn Activity 2 — môi trường không có công cụ browser automation | **Open** — chuyển thành Known Risk trong `release-report.md`, khuyến nghị bấm thử thủ công trước khi phát hành thật |

## 2. Root Cause Analysis
| Defect | Root Cause | Affected Component |
|---------|------------|--------------------|
| DEV-01 | AI Developer trong lần code trước đã dùng `doc/specs/waitlist-feature.md` (bản 1-file, đã lỗi thời) làm input thay vì xác nhận đây có phải bản mới nhất hay không; tài liệu đó tự mô tả các quy tắc (FIFO thuần, yêu cầu Notification Service) trực tiếp mâu thuẫn với bộ 9 file FROZEN sau này | Toàn bộ backend + routing + migration của Day 3 |
| DEV-02 | Logic `acceptOffer` kiểm tra "nguyên nhân bề mặt" (`slot.status`) thay vì "nguyên nhân gốc" (offer đã ở trạng thái kết thúc hay chưa, và vì sao) — 2 nguyên nhân khác nhau (slot bị người khác chiếm vs. offer đã được xử lý bởi chính request trước đó) đều biểu hiện giống nhau ở tầng slot | `src/services/offerEngineService.js` |

## 3. Impact Assessment
| Defect | Business Rule | Functional Requirement | Impact |
|---------|---------------|------------------------|--------|
| DEV-01 | BR-01 → BR-08 (toàn bộ) | US-01 → US-07 | Feature hoàn toàn không dùng được đúng theo yêu cầu thật, dù trông như "chạy tốt" (test riêng của bản cũ pass) — rủi ro cao nhất vì dễ bị bỏ sót nếu không đối chiếu trực tiếp với spec |
| DEV-02 | BR-07 (3 mã 409 phân biệt là **bắt buộc**) | AC-04.4 | Bệnh nhân bấm chấp nhận lần 2 nhận thông báo sai ngữ cảnh ("khung giờ đã đặt" thay vì "đề xuất không còn hiệu lực") — gây hiểu lầm nhưng không gây mất dữ liệu hay double-booking (transaction vẫn an toàn) |

## 4. Recommended Fixes
| Defect | Recommendation | Priority |
|---------|----------------|----------|
| DEV-01 | Đã áp dụng: dùng bộ 9 file `doc/specs/` làm nguồn sự thật duy nhất, xoá file spec 1-file cũ để tránh tái diễn | Đã xử lý |
| DEV-02 | Đã áp dụng: phân biệt theo `cancel_reason` thay vì `slot.status` | Đã xử lý |
| QA-02 | Bổ sung một vòng kiểm thử UI thủ công qua trình duyệt thật (Chrome/Firefox) trước khi release, dùng đúng kịch bản curl đã xác minh làm hướng dẫn thao tác | Trước khi release thật (không chặn PASS nội bộ) |

## 5. Regression Testing Recommendations
| Defect | Regression Test | Priority |
|---------|-----------------|----------|
| DEV-01 | Chạy lại `tests/api.test.js` (14 test cũ) — đảm bảo việc viết lại Day 3 không phá vỡ 16 endpoint gốc | Đã chạy — 14/14 xanh |
| DEV-02 | Giữ nguyên 6 test AC-04.1→04.6 trong `tests/waiting-list.test.js` làm regression suite cho mọi thay đổi tương lai vào `acceptOffer` | Đã có sẵn trong bộ test |

---

### Human Checkpoint:
- [x] Review Defect Analysis Report.
- [x] Xác nhận Root Cause Analysis.
- [x] Xác nhận hướng khắc phục và mức độ ưu tiên.
- [x] Giao defect cho Development Team. — DEV-01, DEV-02 đã được Development Team xử lý trong Activity 1, trước khi bàn giao Development Package sang QA.
- [x] Xác nhận Regression Test Plan.
