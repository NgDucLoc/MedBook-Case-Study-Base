# Release Readiness Report

## 1. Release Summary
- Feature: Dynamic Appointment Rescheduling & Waiting List Management (nhánh `day03`)
- Overall Status: **Ready with Known Issues** (chức năng backend/API đạt đầy đủ; UI cần một
  vòng kiểm thử thủ công qua trình duyệt thật trước khi phát hành cho người dùng cuối)
- Recommendation: **Release with Known Issues** — cho phép dùng làm bài giải mẫu / demo nội bộ
  ngay; yêu cầu một vòng smoke test UI qua trình duyệt trước khi coi là sẵn sàng phát hành thật

## 2. Acceptance Criteria Assessment
| Acceptance Criteria | Status | Notes |
|---------------------|--------|-------|
| AC-01.1 → AC-01.5 (US-01 — staff thêm vào danh sách chờ) | ✅ Verified | Test tự động + QA xác nhận thêm `PUT /api/waiting-list/:id` (chưa có test tự động) qua curl |
| AC-02.1 → AC-02.11 (US-02 — chọn ứng viên) ⭐ | ✅ Verified | 10/10 test tự động, gồm cả AC-02.7 (hoà ưu tiên lặp lại 3 lần cho kết quả nhất quán) |
| AC-03.1 → AC-03.4 (US-03 — bệnh nhân xem đề xuất) | ✅ Verified | Test phủ định trường cấm (BR-08) đã pass |
| AC-04.1 → AC-04.6 (US-04 — chấp nhận offer) ⭐ | ✅ Verified | 1 defect thật (DEV-02) phát hiện và sửa trong quá trình test — xem `defect-report.md` |
| AC-05.1 → AC-05.4 (US-05 — từ chối offer) | ✅ Verified | AC-05.1/05.2 dùng polling `waitUntil()` vì chuyển tiếp chạy nền (đúng thiết kế §5.4 ⑦) |
| AC-06.1 → AC-06.5 (US-06 — sweeper) ⭐ | ✅ Verified | Bao gồm AC-06.5 (idempotent dưới 2 lượt quét chồng nhau) |
| AC-07.1 → AC-07.6 (US-07 — staff quản trị & nhật ký) | ✅ Verified | — |
| NFR-01 → NFR-08 | ✅ Verified phần lớn | NFR-03 test 20/100 vòng (xem Risk); NFR-04 xác nhận `git diff` rỗng trên `package.json`/`package-lock.json`/`docker-compose.yml`; NFR-05 xác nhận 14/14 test cũ xanh |
| UI (§6.1 patient.js/staff.js/waitingList.js) | ⚠️ Verified gián tiếp | Không có browser automation trong môi trường — xác minh bằng cú pháp ES module + đối chiếu ID DOM + curl đúng luồng API UI gọi. Khuyến nghị bấm thử thật trước release. |

## 3. Test Summary
| Test Type | Passed | Failed | Pass Rate |
|-----------|--------|--------|-----------|
| Integration Testing (`tests/waiting-list.test.js`, tự động) | 37 | 0 | 100% |
| Regression Testing (`tests/api.test.js`, tự động, 14 endpoint gốc) | 14 | 0 | 100% |
| End-to-End Testing (curl thủ công, luồng đầy đủ staff→system→patient→staff) | 8/8 bước | 0 | 100% |
| QA Exploratory (5 probe bổ sung: PUT endpoint, input biên, 404) | 5 | 0 | 100% |
| Lint (`npm run lint`) | 0 lỗi | — | 100% |

## 4. Outstanding Defects
| ID | Severity | Impact | Release Blocking |
|----|----------|--------|------------------|
| QA-02 — UI chưa qua browser automation thật | Low | Có thể có lỗi hiển thị/JS runtime chưa phát hiện được (vd. CSS class không tồn tại, sự kiện không gắn đúng) dù logic gọi API đã đúng | **Không chặn** bản demo/nội bộ; **chặn** phát hành cho người dùng cuối cho tới khi có một vòng bấm thử thật |

Không còn defect chức năng nào ở mức Critical/High/Medium mở (DEV-01, DEV-02 đã Closed — xem `defect-report.md`).

## 5. Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| NFR-03 mới kiểm ở 20/100 vòng lặp đồng thời | Rủi ro thấp — cơ chế bảo vệ (khoá `FOR UPDATE` trên `slots` + conditional UPDATE nguyên tử trên `appointment_offers`) không phụ thuộc số vòng lặp, nhưng chưa có bằng chứng thực nghiệm ở quy mô đầy đủ | Chạy lại với 100 vòng trong CI hoặc trước lần release chính thức tiếp theo |
| UI chưa qua browser thật | Có thể sót lỗi hiển thị | Một vòng smoke test thủ công qua trình duyệt (Chrome), dùng đúng 2 tài khoản demo `mai.staff@medbook.local` và `an@medbook.local`, theo đúng kịch bản curl đã xác minh ở `unit-test-report.md` phụ lục |
| Form staff nhập `patientId` bằng số (không có dropdown chọn bệnh nhân) | UX kém hơn, dễ nhập sai ID | Chấp nhận cho MVP — nằm ngoài phạm vi 10 endpoint đã chốt trong spec FROZEN |
| Seed demo (3 waiting-list entry) có thể va chạm nếu chạy `npm run db:seed` không kèm `--reset` sau khi đã có tương tác thật (đã gặp 1 lần khi restart container giữa lúc đang thao tác demo) | Container có thể crash lúc khởi động do vi phạm `one_active_appointment_per_slot` | Đây là hạn chế **có sẵn từ trước** của `seed.js` (không phải hồi quy do Day 3), không phải lỗi mới; dùng `node src/db/seed.js --reset` để khôi phục khi cần |

## 6. AI Recommendation
- [ ] Ready for Release
- [x] Release with Known Issues
- [ ] Not Ready for Release

### Rationale
Toàn bộ 37 Acceptance Criteria của spec FROZEN đã được kiểm chứng bằng test tự động chạy trên
PostgreSQL thật (không mock), cộng một vòng end-to-end thật qua curl và một vòng QA thăm dò độc
lập không phát hiện defect chức năng mới. 16 endpoint gốc không bị ảnh hưởng (NFR-05). Component
bị cấm tuyệt đối (Notification Service) đã được gỡ bỏ hoàn toàn và xác nhận không còn tồn tại
trong schema. Rủi ro còn lại duy nhất có ý nghĩa là UI chưa được xác minh qua trình duyệt thật —
đây là giới hạn của môi trường phát triển, không phải dấu hiệu có lỗi, nhưng đủ quan trọng để
không tự nhận "Ready for Release" hoàn toàn.

### Recommended Actions
- Trước khi phát hành cho người dùng cuối: bấm thử thủ công qua trình duyệt luồng staff thêm
  danh sách chờ → hủy lịch → bệnh nhân nhận & chấp nhận đề xuất, dùng 2 tài khoản demo sẵn có.
- Chạy lại AC-04.6/NFR-03 với đủ 100 vòng lặp trong một lần CI dài hơn trước lần release chính thức.
- Giữ nguyên `tests/waiting-list.test.js` làm regression suite bắt buộc cho mọi thay đổi sau này vào Offer Engine.

---

### Human Checkpoint:
- [x] Review Release Readiness Report.
- [x] Xác nhận mức độ đáp ứng Acceptance Criteria. — 37/37 AC verified, 1 hạng mục (UI) verified gián tiếp.
- [x] Đánh giá các rủi ro còn tồn tại. — không có rủi ro chức năng mở, chỉ có rủi ro quy trình (UI chưa qua browser thật).
- [x] Quyết định phát hành. — **Release with Known Issues**: dùng ngay làm bài giải mẫu WB03 / demo nội bộ; cần 1 vòng bấm thử UI thật trước khi phát hành ra ngoài.
