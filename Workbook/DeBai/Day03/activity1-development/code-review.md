# Code Review

## 1. Review Findings
| Issue ID | Vấn đề | File/Component | Mức độ (Critical/Major/Minor) | Tác động | Đề xuất của AI | Human Decision (Accept/Reject) |
|---|---|---|---|---|---|---|
| CR-01 | Code Day 3 sẵn có trong nhánh `day03` được lập trình theo tài liệu 1-file cũ (`doc/specs/waitlist-feature.md` bản nháp đầu), **không phải** bộ 9 file FROZEN. Sai lệch hệ thống: tên bảng (`waitlist_entries` thay vì `waiting_list_entries`), thiếu `medical_priority`/`specialization_id`, chọn ứng viên thuần FIFO (vi phạm BR-02), không có lead time (BR-01), không có bảng/endpoint audit `offer_events` (BR-08), có `notificationService`/`notificationRepository`/bảng `notifications` bị **cấm tuyệt đối** (Đính chính 1), vai trò tạo waitlist bị đảo ngược (patient tự đăng ký thay vì chỉ staff — BR-08), sai path endpoint (`/api/waitlist` thay vì `/api/waiting-list`), thiếu hẳn hook `onSlotTaken`, và **không có UI nào** cho feature | Toàn bộ `src/services/offerService.js`, `waitlistService.js`, `notificationService.js`, `src/repositories/*`, `src/routes/waitlist.routes.js`, `notifications.routes.js`, `src/db/migrate.js` (khối Day 3), `src/jobs/offerExpiryJob.js` | **Critical** | day03 không đáp ứng bất kỳ AC nào trong spec FROZEN dù chạy được và có test riêng (test theo spec sai) | Viết lại toàn bộ theo đúng bảng ánh xạ component→file ở §6.1, xoá code/test cũ, xoá spec cũ | **Accept** — đã thực hiện, xem `coding-log.md` |
| CR-02 | `offerEngineService.acceptOffer` (bản nháp đầu tiên khi viết lại) kiểm `slot.status` trước khi kiểm `offer.status`. Khi bệnh nhân bấm "Chấp nhận" lần thứ hai (offer đã `accepted`, slot đã `booked` bởi chính lần accept đầu), hệ thống trả nhầm `409 "Khung giờ đã được đặt"` thay vì `409 "Đề xuất không còn hiệu lực"` (AC-04.4) | `src/services/offerEngineService.js` — hàm `acceptOffer` | **Major** | 2/3 mã 409 phân biệt của BR-07 bị nhầm lẫn — bệnh nhân nhận sai lý do, vi phạm chính yêu cầu "ba mã 409 phân biệt là BẮT BUỘC" | Đọc `offer` trước khi mở transaction; dùng `cancel_reason === 'slot_unavailable'` (do `onSlotTaken` gắn) để phân biệt "slot bị người khác chiếm" (AC-04.2) khỏi "offer đã ở trạng thái kết thúc vì lý do khác" (AC-04.4) | **Accept** — đã sửa, phát hiện qua test tự động `AC-04.4`, xác nhận lại bằng 4 lần chạy test liên tiếp |
| CR-03 | Volume PostgreSQL dev đã chạy qua bản nháp Day 3 cũ vẫn còn bảng `appointment_offers`/`waitlist_entries` theo schema cũ. `create table if not exists` trong migration mới im lặng bỏ qua vì bảng đã tồn tại → cột mới (`waiting_list_entry_id`, `appointment_type`,...) không được thêm, ứng dụng crash ngay khi khởi động (`column "waiting_list_entry_id" does not exist`) | `src/db/migrate.js`, môi trường Docker volume `medbook_pgdata` | **Major** (chỉ ảnh hưởng môi trường dev đang chạy dở, không phải lỗi code) | Container không khởi động được sau khi rebuild image | Dọn 2 bảng cũ một lần bằng `psql` trực tiếp (không dùng `docker compose down -v` mang tính phá huỷ); giữ nguyên `drop table if exists notifications cascade` **vĩnh viễn** trong `migrate.js` vì đây là thành phần bị cấm tuyệt đối, không phải dọn tạm thời | **Accept** — không sửa code migration cho 2 bảng cũ (vì đó là việc một lần cho môi trường dev cụ thể), chỉ giữ lại dòng drop cho `notifications` |

## 2. Refactoring — chỉ sửa các issue Human đã CHẤP NHẬN
| Issue ID | Đã xử lý (Yes/No) | File đã tạo/sửa | Tóm tắt thay đổi | Unit Test đã cập nhật |
|---|---|---|---|---|
| CR-01 | Yes | 23 file (xem `coding-log.md` mục 3) | Viết lại toàn bộ backend + UI + test theo bộ 9 file spec FROZEN | `tests/waiting-list.test.js` (mới, 37 case) thay `tests/waitlist.test.js` (xoá) |
| CR-02 | Yes | `src/services/offerEngineService.js` | Đảo thứ tự kiểm tra trong `acceptOffer`, dùng `cancel_reason` làm tín hiệu phân biệt nguyên nhân | `AC-04.2`, `AC-04.4` re-run xanh |
| CR-03 | Yes (thao tác môi trường, không phải code) | — | `psql` drop 2 bảng cũ một lần; xác nhận schema mới đúng bằng `\d appointment_offers` | Không áp dụng (không phải test code) |

## 3. Sau refactoring
- Issue chưa xử lý: không còn issue Critical/Major mở.
- Rủi ro hoặc giả định còn lại:
  - NFR-03 test với 20 vòng lặp thay vì 100 (đánh đổi thời gian chạy — cơ chế bảo vệ không phụ thuộc số vòng).
  - UI chưa được xác minh bằng browser automation thật (môi trường không có công cụ này) — đã bù bằng kiểm tra cú pháp + đối chiếu ID + curl E2E toàn bộ luồng nghiệp vụ qua đúng API mà UI gọi.
  - Form staff dùng `patientId` dạng số (không có endpoint liệt kê bệnh nhân trong 10 endpoint đã chốt) — chấp nhận cho MVP demo.
- Kết quả chạy lại Unit Test (vòng cuối): **51/51** (37 mới + 14 regression) xanh, ổn định qua 4 lần chạy lại liên tiếp; `npm run lint` 0 lỗi.

---

### Human Review vòng cuối:
- [x] Chỉ sửa đúng phạm vi các issue đã được phê duyệt?
- [x] Không đụng các issue bị Human từ chối? — không có issue nào bị từ chối trong review này.
- [x] Không thay đổi Business Rules / Acceptance Criteria? — CR-02 chỉ sửa cách **hiện thực** BR-07 cho đúng AC-04.2/04.4, không đổi luật.
- [x] Không thay đổi API contract khi chưa được phê duyệt? — CR-01 việc viết lại nằm trong phạm vi đã được Human phê duyệt trước khi coding (xem lựa chọn "Viết lại từ đầu theo đúng file mapping ở mục 6 spec FROZEN" trong hội thoại lập kế hoạch).
- [x] Giữ nguyên các hành vi đang hoạt động đúng? — 14/14 test `api.test.js` cũ vẫn xanh nguyên vẹn.
- [x] Unit Tests đã cập nhật cho các thay đổi cấu trúc/hành vi?
- [x] Đã chạy lại toàn bộ Unit Test và pass?
