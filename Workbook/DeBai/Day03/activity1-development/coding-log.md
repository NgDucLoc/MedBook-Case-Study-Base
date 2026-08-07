# AI-Assisted Coding Log

## 1. Task Information
- Task ID: T1 + T2 + T3 (toàn bộ 3 task của Coding Plan, thực hiện trong một phiên liên tục)
- Task name: Viết lại Dynamic Appointment Rescheduling & Waiting List theo spec FROZEN
- Layer: Data → Repository → Service → Route → UI
- Developer: Human (product owner của case study) + AI (Claude, vai trò AI-Assisted Developer)
- AI tool: Claude Code (Sonnet 5)
- Status: Hoàn thành, 37/37 test mới + 14/14 test cũ xanh (xem `unit-test-report.md`)

## 2. Context Used
- Development Context: `development-context.md` (file này)
- Coding Plan: `coding-plan.md`
- Requirement/Acceptance Criteria: `doc/specs/03-user-stories-acceptance-criteria.md` (AC-01.1 → AC-07.6)
- Architecture constraints: `doc/specs/06-component-file-mapping-convention.md` §6.1 → §6.5
- Coding standards: §6.4 của cùng file, đối chiếu trực tiếp với `slotRepository.js`,
  `appointmentService.js` thật đang có trong repo

## 3. Files Changed
| File | New/Modified | Thay đổi chính | Lý do |
|---|---|---|---|
| `src/db/migrate.js` | Modified | Thay khối DDL Day 3 cũ bằng đúng §4.2; thêm `drop table if exists notifications` | Schema cũ sai tên bảng/cột, thiếu `medical_priority`, thiếu `offer_events` |
| `src/repositories/waitingListRepository.js` | New | CRUD + `findBestCandidateForSlot` (§4.5) | thay `waitlistRepository.js` |
| `src/repositories/offerRepository.js` | New | enum `sent/accepted/declined/expired/cancelled`, `transitionIfSent`, `acceptIfSentAndNotExpired`, cột hẹp cho bệnh nhân | thay bản cũ dùng `pending/superseded` |
| `src/repositories/offerEventRepository.js` | New | `append()`/`list()` — append-only | BR-08, trước đây không tồn tại |
| `src/repositories/notificationRepository.js` | **Deleted** | — | Đính chính 1 — bị cấm tuyệt đối |
| `src/services/offerEngineService.js` | New | 7 hàm public đúng §6.2 | thay `offerService.js` |
| `src/services/offerExpirySweeper.js` | New | `sweepOnce/start/stop`, đọc `OFFER_SWEEP_INTERVAL_SECONDS` | thay `offerExpiryJob.js` |
| `src/services/waitingListService.js` | New | CRUD do **staff** thực hiện (đảo vai trò so với bản cũ) | BR-08 |
| `src/services/notificationService.js` | **Deleted** | — | Đính chính 1 |
| `src/services/appointmentService.js` | Modified | đổi import → `offerEngineService`; **thêm hook `onSlotTaken`** còn thiếu trong `bookAppointment()` | §5.2 dòng 3 chưa từng được cài |
| `src/services/slotService.js` | Modified | đổi import; thêm nhánh gọi `onSlotTaken` khi `status: booked` | §5.2 dòng 2 |
| `src/routes/waiting-list.routes.js` | New | 5 endpoint ①-⑤ | thay `waitlist.routes.js` (path sai `/api/waitlist`) |
| `src/routes/offers.routes.js` | New | 5 endpoint ⑥-⑩, **thêm** `GET /api/offer-events` (chưa từng tồn tại) | §5.3 |
| `src/routes/notifications.routes.js` | **Deleted** | — | Đính chính 1 |
| `server.js` | Modified | đổi require route/sweeper, bỏ đăng ký notification route | — |
| `src/db/seed.js` | Modified | thêm 3 waiting-list entry mẫu (§4.7) | minh chứng BR-02/BR-03b khi demo |
| `public/js/api.js`, `public/js/views/patient.js`, `public/js/views/staff.js` | Modified | thêm khối offer/waiting-list, giữ nguyên phần cũ | trước đây UI Day 3 **chưa tồn tại** |
| `public/js/views/waitingList.js` | New | panel quản trị staff + nhật ký | §6.1 |
| `public/index.html`, `public/js/state.js`, `public/js/main.js` | Modified | markup mới, label mới, wiring sự kiện + countdown ticker + polling | — |
| `doc/specs/01-context-scope.md` … `09-handoff-checklist.md`, `README.md` | New (do Human cung cấp) | thay hoàn toàn `doc/specs/waitlist-feature.md` cũ | nguồn sự thật duy nhất |
| `Workbook/DeBai/Day03/spec/waitlist-feature.md` | **Deleted** | — | trùng lặp, mâu thuẫn với bộ 9 file mới |
| `tests/waiting-list.test.js` | New | 37 test theo AC FROZEN | thay `tests/waitlist.test.js` (test theo spec cũ) |

## 4. Components Reused
| Component/Service | Cách tái sử dụng | Có chỉnh sửa không |
|---|---|---|
| `slotRepository.js` | `findForUpdate`, `updateStatus`, `findDetailedById`, `createSlot` dùng nguyên trong toàn bộ Offer Engine | Không |
| `appointmentRepository.js` | `create`, `findDetailedById`, `countActiveBySlot` dùng nguyên | Không |
| `demoAuth`, `requireRole` | áp cho 10 route mới y hệt route cũ | Không |
| `httpError`, `toInt`, `required` | dùng trong mọi service mới | Không |
| Pattern transaction của `bookAppointment()` (`begin/commit/rollback/finally release`) | sao chép nguyên khuôn cho `acceptOffer`, `createOfferForSlot` | Không, chỉ áp dụng lại |

## 5. Business Rules Implemented
| Business Rule | File/Component | Cách hiện thực |
|---|---|---|
| BR-01 | `offerEngineService.readSlotForTrigger` + `onSlotBecameAvailable` | tính lead time bằng SQL, không JS Date (tránh lệch múi giờ) |
| BR-02, BR-03 | `waitingListRepository.findBestCandidateForSlot` | dịch nguyên văn truy vấn §4.5, 6 điều kiện + order by 3 tiêu chí |
| BR-04 | migration (2 partial unique index) + `catch (error.code === "23505")` | lớp 1 code + lớp 2 DB, đúng ADR-004 |
| BR-05 | `offerRepository.create` | `least(now()+interval, (date+start_time)::timestamptz)` tính trong SQL |
| BR-06 | `offerEngineService.declineOffer`/`expireOffer` tự gọi lại `onSlotBecameAvailable` | tái sử dụng chính public function, tự re-check state từ DB |
| BR-07 | `offerEngineService.acceptOffer` | transaction 7 bước; phân biệt 3 mã 409 theo **nguyên nhân thật** (`cancel_reason`), không chỉ theo trạng thái slot hiện tại |
| BR-08 | `waitingListService` (staff-only create), `offerRepository` (cột hẹp cho bệnh nhân), `offerEventRepository` (append-only) | phân quyền + ẩn trường + nhật ký bất biến |

## 6. UI Behavior
- User action: bệnh nhân bấm "Chấp nhận"/"Từ chối" trên thẻ đề xuất; staff điền form thêm vào
  danh sách chờ hoặc bấm "Hủy" trên một entry.
- Validation: form staff bắt buộc `patientId` + (bác sĩ hoặc chuyên khoa) — lỗi 400 hiện qua toast.
- Loading state: dùng lại pattern `guard()` sẵn có — lỗi API tự động thành toast, không rơi im lặng.
- Success state: toast xác nhận + `medbook:reload` (accept) hoặc reload panel cục bộ (decline, thêm/huỷ entry).
- Error state: nút Chấp nhận/Từ chối tự vô hiệu hoá khi `remainingSeconds<=0` (đếm ngược phía client, tick mỗi giây, không gọi lại API).

## 7. API Integration
- Endpoint: 10 endpoint mới theo đúng path/method/role ở §5.3, cộng side-effect (không đổi contract) ở 3 endpoint cũ.
- Request/Response: khớp nguyên văn ví dụ payload trong §5.4 — đã xác nhận bằng curl thật (xem `unit-test-report.md` §Manual E2E).
- Error mapping: `httpError` → `next(error)` → error handler tập trung ở `server.js`, không đổi.
- Authentication/authorization: `demoAuth` + `requireRole` ở route; kiểm quyền sở hữu (`patient_id === user.patientId`) ở tầng service cho mọi thao tác trên offer.

## 8. Backend Behavior
- Controller (route): mỏng, chỉ map req → service → res, `try/catch` + `next(error)` như quy ước.
- Service: toàn bộ luật nghiệp vụ nằm ở `offerEngineService`/`waitingListService`; `offerEngineService` **chỉ require repository**, không require service khác (đúng §6.4, chống vòng phụ thuộc).
- Repository/Data access: 100% parameterized, SQL alias camelCase, không `SELECT *` cho cột bệnh nhân.
- Transaction/concurrency: khoá `slots` trước, `appointments` sau (đúng thứ tự thống nhất); `acceptOffer` dùng conditional UPDATE (`WHERE status='sent' AND expires_at>now()`) thay vì đọc-rồi-ghi.
- Error handling: hook `onSlotBecameAvailable`/`onSlotTaken` đặt **sau commit**, bọc `try/catch`, nuốt lỗi + `console.error` — huỷ lịch/đổi slot không bao giờ thất bại vì Offer Engine lỗi (NFR-08).

## 9. Deviations from Coding Plan
| Deviation | Lý do | Human Approval |
|---|---|---|
| `acceptOffer` không kiểm `slot.status` trước tiên như bản nháp đầu, mà dùng `offer.cancel_reason === 'slot_unavailable'` để phân biệt AC-04.2 với AC-04.4 | Bản nháp đầu khiến "chấp nhận lần 2" (AC-04.4, slot đã booked bởi chính lần accept đầu) bị nhầm thành "Khung giờ đã được đặt" — phát hiện qua test tự động | Đã sửa và re-test, không cần hỏi lại vì vẫn nằm trong đúng phạm vi BR-07 |
| Thêm `offerEngineService.listForStaff` và `listEvents` (không có tên trong §6.2) | §6.2 liệt kê 7 hàm "rất hẹp" nhưng route GET /api/offers, GET /api/offer-events cần đi qua service theo đúng kiến trúc routes→services→repositories (§6-Component Mapping) hiện có trong repo, không được gọi thẳng repository từ route | Chấp nhận — đây là 2 hàm đọc thuần, không chứa luật nghiệp vụ, không vi phạm "KHÔNG xuất ra ngoài" (mục đó chỉ cấm hàm chọn ứng viên/tính expires_at/advanceChain/ghi log nội bộ) |

## 10. Open Issues and Assumptions
| Vấn đề | Ảnh hưởng | Cần ai xác nhận |
|---|---|---|
| `spec/09-handoff-checklist.md`/`README.md` ban đầu bị thiếu trong lần cung cấp đầu tiên | Có thể chặn xác nhận "AI-Ready" | Đã giải quyết — Human tự bổ sung đủ 10 file vào `doc/specs/` trước khi coding |
| Không có endpoint liệt kê bệnh nhân — form staff dùng ô nhập `patientId` dạng số | UX kém hơn dropdown | Chấp nhận cho MVP demo, ngoài phạm vi 10 endpoint đã chốt |

## 11. Tests to Be Generated
- Frontend unit tests: không có framework test frontend trong repo (ngoài phạm vi, giữ nguyên convention cũ)
- Backend unit tests: `tests/waiting-list.test.js` — 37 case theo AC FROZEN
- Boundary cases: lead time đúng ngưỡng 30 phút (AC-02.4), hoà ưu tiên + created_at (AC-02.7)
- Negative cases: 3 mã 409 phân biệt (AC-04.2/03/04), phân quyền (AC-04.5, AC-05.4, AC-07.6)

## 12. Coding Task Decision
- Accepted: Có — 51/51 test (14 cũ + 37 mới) xanh, lint sạch, curl E2E thật xác nhận đúng luồng
- Needs revision: Không còn issue mở
- Ready for Unit Testing: Có (thực tế Unit Testing đã chạy song song trong cùng phiên — xem `unit-test-report.md`)

---

## Output 1 — Coding Task Brief
| Nội dung | Kết quả |
|---|---|
| Coding task | Viết lại toàn bộ Dynamic Appointment Rescheduling & Waiting List theo spec FROZEN |
| Component / Service | `offerEngineService`, `waitingListService`, `offerExpirySweeper` + 3 repository + 2 route file |
| Business rules đã code | BR-01 → BR-08 (toàn bộ 8 rule) |
| API liên quan | 10 endpoint mới + side-effect ở 3 endpoint cũ (contract không đổi) |
| Files/Classes cần thay đổi | 23 file (8 mới hẳn, 4 xoá, 11 sửa) — khớp đúng "8 file mới · 8 file sửa · 6 dùng nguyên" của §6.1 cộng phần dọn code cũ |
| Acceptance Criteria | AC-01.1 → AC-07.6 (37/37 test tự động pass) |
| Coding constraints | Không đổi `package.json`/`docker-compose.yml`; 14 test cũ vẫn xanh; không `SELECT *` cho bệnh nhân |
| Các giả định mà AI đã thiết lập | patientId nhập tay ở UI staff (không có endpoint liệt kê bệnh nhân trong §5.3) |

---

### Human Review Checklist — sau khi AI sinh code:
- [x] AI có thực hiện đúng Coding Task được giao không?
- [x] Có thay đổi file hoặc component ngoài Coding Plan không? — có 2 hàm nhỏ thêm vào
      `offerEngineService` (`listForStaff`, `listEvents`), đã ghi rõ ở mục 9 Deviations và được
      chấp nhận vì đúng tinh thần kiến trúc phân lớp.
- [x] Code có tái sử dụng đúng component và service hiện có không?
- [x] UI có xử lý đầy đủ validation, loading, success và error state không?
- [x] UI và API có nhất quán về request, response và error handling không?
- [x] Backend có hiện thực đúng Business Rules không?
- [x] Business Logic có được đặt đúng layer không?
- [x] Code có tuân thủ architecture và coding conventions hiện tại không?
- [x] Có hard-code hoặc duplicate logic không cần thiết không? — không.
- [x] Có ảnh hưởng đến chức năng hiện có không? — không, 14/14 test cũ vẫn xanh.
- [x] Có assumption nào AI tự đưa ra mà chưa được xác nhận không? — có 1 (patientId nhập tay), đã ghi rõ ở mục 10.
- [x] Code có đủ rõ ràng để Developer khác tiếp tục bảo trì không?
- [x] Coding Log có phản ánh đúng các thay đổi thực tế không?
- [x] Task đã sẵn sàng để chuyển sang Unit Testing chưa?
