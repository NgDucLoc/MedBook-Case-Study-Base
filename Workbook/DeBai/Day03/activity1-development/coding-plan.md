# Coding Plan

## 1. Selected Vertical Slice
- Feature: Dynamic Appointment Rescheduling & Waiting List Management
- User role: `system` (Offer Engine) chọn ứng viên → `patient` chấp nhận/từ chối
- Trigger: bệnh nhân huỷ lịch hoặc staff mở lại slot đang `booked`
- Main user flow: slot trống → hệ thống chọn đúng 1 ứng viên theo BR-02/BR-03 → gửi offer có
  hạn 15 phút → bệnh nhân chấp nhận (tạo appointment, transaction 7 bước) hoặc từ chối/hết hạn
  (chuyển tiếp người kế tiếp)
- Acceptance Criteria liên quan: AC-02.1 → AC-02.11 (US-02 — chọn ứng viên), AC-04.1 → AC-04.6
  (US-04 — chấp nhận), AC-05.1 → AC-05.4 (US-05 — từ chối), AC-06.1 → AC-06.5 (US-06 — sweeper)

## 2. Coding Scope
### In Scope
- UI: thẻ đề xuất + đếm ngược + 2 nút (patient); panel danh sách chờ + nhật ký (staff)
- API Integration: 10 endpoint mới (§5.3), side-effect thêm vào 3 endpoint cũ (§5.2)
- Backend: `waitingListRepository`, `offerRepository`, `offerEventRepository`,
  `offerEngineService`, `offerExpirySweeper`, `waitingListService`, 2 route file mới
- Data: DDL §4.2 (3 bảng mới), seed §4.7

### Out of Scope
- Notification Service (bị cấm — Đính chính 1)
- API đổi lịch trực tiếp (không tồn tại — Đính chính 2)
- 6 Open Questions (OQ-01 → OQ-06)

## 3. End-to-End Flow
1. User thực hiện: bệnh nhân bấm "Huỷ lịch hẹn" (hoặc staff bấm "Mở lại")
2. UI xử lý: gọi `POST /api/appointments/:id/cancel` (đã có sẵn, không đổi contract)
3. Frontend gọi API: `appointmentService.cancelAppointment` — không đổi
4. Backend kiểm tra: transaction huỷ appointment + trả slot `available`, commit, release client
5. Business Logic thực hiện: **sau commit**, gọi `offerEngineService.onSlotBecameAvailable(slotId)`
   — kiểm lead time (BR-01) → khoá slot lại trong transaction riêng → chọn ứng viên tốt nhất
   (BR-02+BR-03) → tạo offer `sent` với `expires_at` tính trong SQL (BR-05) → ghi `offer_sent`
6. Data được cập nhật: `appointment_offers` có dòng mới, `waiting_list_entries.status='offered'`,
   `offer_events` có dòng `offer_sent`
7. Kết quả trả về UI: bệnh nhân poll `GET /api/my-offers` (kênh giao đề xuất duy nhất — Đính
   chính 1), thấy thẻ đề xuất kèm đếm ngược; chấp nhận → `POST /api/offers/:id/accept` → 201
   appointment phẳng

## 4. Change Plan
| ID | Layer | File/Component | New/Modify/Reuse | Thay đổi chính | Requirement/AC |
|---|---|---|---|---|---|
| C1 | Data | `src/db/migrate.js` | Modify | DDL 3 bảng mới + drop `notifications` | §4.2 |
| C2 | Repository | `waitingListRepository.js` | New | truy vấn chọn ứng viên §4.5 | BR-02, BR-03 |
| C3 | Repository | `offerRepository.js` | New | conditional UPDATE §4.4 | BR-04, BR-05, BR-07 |
| C4 | Repository | `offerEventRepository.js` | New | append-only | BR-08 |
| C5 | Service | `offerEngineService.js` | New | 7 hàm public đúng §6.2 | BR-01→BR-07 |
| C6 | Service | `offerExpirySweeper.js` | New | `sweepOnce/start/stop` | BR-05, BR-06 |
| C7 | Service | `waitingListService.js` | New | CRUD do staff | BR-08 |
| C8 | Service | `appointmentService.js`, `slotService.js` | Modify | 4 điểm móc §6.3 | §5.2 |
| C9 | Route | `waiting-list.routes.js`, `offers.routes.js` | New | 10 endpoint §5.3 | §5.3 |
| C10 | UI | `patient.js`, `staff.js`, `waitingList.js` (mới), `index.html` | Modify/New | offer card, panel staff | §6.1 |
| C11 | Data | `seed.js` | Modify | 3 entry minh chứng BR-02/BR-03b | §4.7 |
| C12 | Test | `tests/waiting-list.test.js` | New | 37 test theo AC | US-01→US-07 |

## 5. Coding Tasks
### Task T1: Data model + repository chọn ứng viên (đường găng ①→④ trong §6.5)
- Layer: Data + Repository
- Mục tiêu: schema đúng §4.2 và truy vấn chọn ứng viên đúng BR-02+BR-03
- Files/Components: `migrate.js`, `waitingListRepository.js`, `offerRepository.js`, `offerEventRepository.js`
- Input: DDL và truy vấn mẫu trong `04-data-model.md`
- Output: 3 bảng mới + 2 partial unique index bắt buộc (BR-04)
- Business Rules: BR-02, BR-03, BR-04, BR-05
- Dependencies: không — bảng gốc không đổi
- Coding Constraints: 100% parameterized, không SELECT * cho cột bệnh nhân
- Definition of Done: DDL chạy idempotent, truy vấn chọn ứng viên khớp §4.5 nguyên văn
- Unit Tests cần có: AC-02.5 → AC-02.10 (thứ tự ưu tiên, loại trừ trùng giờ, không mời lại)

### Task T2: Offer Engine + 4 điểm móc + accept/decline/sweeper (⑤→⑦)
- Layer: Service
- Mục tiêu: toàn bộ vòng đời offer, 3 mã 409 phân biệt ở accept
- Files/Components: `offerEngineService.js`, `offerExpirySweeper.js`, `appointmentService.js`, `slotService.js`
- Input: Task T1 đã xong
- Output: `onSlotBecameAvailable/onSlotTaken/acceptOffer/declineOffer/expireOffer/cancelOfferForEntry`
- Business Rules: BR-01, BR-06, BR-07
- Dependencies: T1
- Coding Constraints: chỉ `require` repository, không `require` service khác (chống vòng lặp)
- Definition of Done: 3 mã 409 phân biệt đúng nguyên nhân (không chỉ theo trạng thái slot)
- Unit Tests cần có: AC-04.1 → AC-04.6, AC-05.1 → AC-05.4, AC-06.1 → AC-06.5

### Task T3: Route + UI + waitingListService (⑧→⑨)
- Layer: Route + UI + Service
- Mục tiêu: 10 endpoint đúng contract, UI hiển thị đúng cho cả 2 vai trò
- Files/Components: `waiting-list.routes.js`, `offers.routes.js`, `waitingListService.js`, `patient.js`, `staff.js`, `waitingList.js`, `index.html`
- Input: Task T2 đã xong
- Output: staff quản trị được danh sách chờ; bệnh nhân thấy và phản hồi được offer
- Business Rules: BR-08
- Dependencies: T1, T2
- Coding Constraints: response bệnh nhân không chứa `medicalPriority`/`note`/thông tin người khác
- Definition of Done: đối chiếu curl thật cho cả 10 endpoint đúng path/shape/mã lỗi
- Unit Tests cần có: AC-01.1 → AC-01.5, AC-03.1 → AC-03.4, AC-07.1 → AC-07.6

## 6. Implementation Order
| Thứ tự | Task | Phụ thuộc | Lý do thực hiện theo thứ tự này |
|---|---|---|---|
| 1 | T1 | — | Không có schema đúng thì mọi tầng trên đều sai theo |
| 2 | T2 | T1 | Offer Engine cần bảng và truy vấn chọn ứng viên đã đúng |
| 3 | T3 | T1, T2 | Route/UI chỉ là lớp mỏng gọi service đã hoàn chỉnh |

## 7. API–UI Mapping
| UI Action | API | Request | Response | UI State |
|---|---|---|---|---|
| Staff thêm vào danh sách chờ | `POST /api/waiting-list` | patientId, doctorId\|specializationId, medicalPriority | entry | reload panel |
| Staff huỷ entry | `DELETE /api/waiting-list/:id` | — | `{id,status,cancelledOfferId}` | reload panel |
| Bệnh nhân xem đề xuất | `GET /api/my-offers` (poll 20s) | — | offer[] | đếm ngược tại chỗ mỗi giây |
| Bệnh nhân chấp nhận | `POST /api/offers/:id/accept` | — | appointment phẳng | `medbook:reload` toàn view |
| Bệnh nhân từ chối | `POST /api/offers/:id/decline` | `{reason?}` | `{id,status}` | reload offer panel |

## 8. Business Rule Allocation
| Business Rule | Component chịu trách nhiệm | Cách kiểm chứng |
|---|---|---|
| BR-01 | `offerEngineService.onSlotBecameAvailable` | AC-02.1 → AC-02.4 |
| BR-02, BR-03 | `waitingListRepository.findBestCandidateForSlot` | AC-02.5 → AC-02.10 |
| BR-04 | migration (2 partial unique index) + catch `23505` | AC-03.3, AC-06.5 |
| BR-05 | `offerRepository.create` (SQL `least(...)`) | AC-04.3, AC-06.4 |
| BR-06 | `offerEngineService` (decline/expire tự gọi lại chọn ứng viên) | AC-05.1, AC-06.1→06.3 |
| BR-07 | `offerEngineService.acceptOffer` (transaction 7 bước) | AC-04.1 → AC-04.6 |
| BR-08 | `waitingListService`, `offerRepository` (cột hẹp), `offerEventRepository` | AC-03.2, AC-04.5, AC-07.x |

## 9. Unit Test Plan
| Component | Test Scenario | Expected Result | Mock/Dependency |
|---|---|---|---|
| `waitingListRepository` | 3 entry khác priority cùng slot | urgent thắng dù vào sau | Không mock — PostgreSQL thật (§6.4) |
| `offerEngineService.acceptOffer` | slot bị đặt trực tiếp trong lúc offer chờ | 409 "Khung giờ đã được đặt", offer cancelled | — |
| `offerExpirySweeper` | 2 lượt quét chồng nhau trên cùng offer | chỉ xử lý đúng 1 lần | — |

## 10. Risks and Open Decisions
| Vấn đề | Ảnh hưởng | Đề xuất của AI | Human Decision |
|---|---|---|---|
| Code Day 3 hiện có bám theo spec 1-file đã lỗi thời, không phải bộ 9 file FROZEN | Toàn bộ backend/test cũ vô giá trị | Viết lại từ đầu theo đúng §6.1 file mapping | **Chấp nhận** — xem `code-review.md` CR-01 |
| `acceptOffer` kiểm slot trước hay kiểm offer.status trước sẽ cho 2 message 409 khác nhau cho cùng 1 slot-đã-mất-khả-dụng | Sai AC-04.2 hoặc AC-04.4 tuỳ thứ tự | Dùng `cancel_reason='slot_unavailable'` để phân biệt nguyên nhân thật, không chỉ dựa trạng thái slot | **Chấp nhận** sau khi phát hiện qua test AC-04.2 fail |

## 11. Coding Readiness
Sẵn sàng — Development Context đã đủ căn cứ, không còn Assumption chặn coding.

---

### Human Review — sau khi AI trả kết quả, nhóm tự kiểm:
- [x] Vertical slice có đủ nhỏ để hoàn thành trong thời gian activity không? — không, feature đủ
      lớn nên đã chia 3 task (T1→T3) chạy tuần tự trong cùng một phiên thay vì workshop 80 phút.
- [x] Vertical slice có đi xuyên suốt từ UI đến backend không?
- [x] User flow có bám sát Requirement và Acceptance Criteria không?
- [x] Phạm vi In Scope và Out of Scope đã rõ chưa?
- [x] AI có đề xuất thay đổi component nào ngoài Development Context không? — không.
- [x] File, class và component cần thay đổi đã được xác định đúng chưa?
- [x] Business Rules đã được phân bổ vào đúng layer chưa?
- [x] UI và API Contract có nhất quán không?
- [x] Thứ tự coding có phản ánh đúng dependency không?
- [x] Có task nào quá lớn và cần chia nhỏ thêm không? — T1 lớn nhất nhưng không tách được vì
      schema là nền cho mọi thứ khác.
- [x] Unit Test dự kiến có bao phủ các Business Rules quan trọng không?
- [x] Các assumptions và open decisions đã được Human xác nhận chưa?
- [x] Coding Plan đã đủ rõ để chuyển sang sinh code chưa?
