# Development Context

## 1. Feature Overview
- Feature: Dynamic Appointment Rescheduling & Waiting List Management
- Mục tiêu nghiệp vụ: khi một slot trở nên trống đột ngột (huỷ lịch / staff mở lại), hệ thống
  tự động chọn đúng một bệnh nhân phù hợp trong danh sách chờ theo luật ưu tiên đã chốt, gửi
  đề xuất có hạn trả lời, và tự chuyển sang người kế tiếp nếu bị từ chối hoặc hết hạn — thay
  cho việc nhân viên gọi điện thủ công.
- Người dùng liên quan: `staff` (quản trị danh sách chờ, xem nhật ký) · `patient` (nhận, chấp
  nhận, từ chối đề xuất) · `system` (Offer Engine, tự động).
- User flow được lựa chọn (coding task ④ + ⑥ trong §6.5 — đường găng): "chọn ứng viên khi slot
  trống" (`waitingListRepository.findBestCandidateForSlot` + `offerEngineService.onSlotBecameAvailable`)
  và "chấp nhận/từ chối đề xuất" (`offerEngineService.acceptOffer` / `declineOffer`).
- Requirement/Acceptance Criteria liên quan: US-01 → US-07, toàn bộ AC-01.x → AC-07.x trong
  `doc/specs/03-user-stories-acceptance-criteria.md`.

## 2. Impacted Modules and Screens
| Module/Screen | Existing/New/Modified | Thay đổi dự kiến | Lý do |
|---|---|---|---|
| `src/db/migrate.js` | Modified | Thêm DDL `waiting_list_entries`, `appointment_offers`, `offer_events`; `drop table notifications` | §4.2, Đính chính 1 |
| `src/repositories/waitingListRepository.js` | New | CRUD + truy vấn chọn ứng viên (§4.5) | thay `waitlistRepository.js` cũ sai schema |
| `src/repositories/offerRepository.js` | New (viết lại) | SQL trên `appointment_offers`, conditional UPDATE | BR-04, BR-05, BR-07 |
| `src/repositories/offerEventRepository.js` | New | append-only audit log | BR-08 |
| `src/services/offerEngineService.js` | New (thay `offerService.js`) | toàn bộ vòng đời offer | BR-01 → BR-07 |
| `src/services/offerExpirySweeper.js` | New (thay `offerExpiryJob.js`) | quét offer hết hạn theo chu kỳ | BR-05, BR-06 |
| `src/services/waitingListService.js` | New (thay `waitlistService.js`) | nghiệp vụ CRUD danh sách chờ, do **staff** thực hiện | BR-08 (đảo ngược vai trò so với bản cũ) |
| `src/services/appointmentService.js` | Modified | đổi import sang `offerEngineService`; **thêm hook `onSlotTaken` còn thiếu** trong `bookAppointment()` | §5.2, §6.3 |
| `src/services/slotService.js` | Modified | đổi import; thêm nhánh gọi `onSlotTaken` khi staff chặn giờ | §5.2 |
| `src/routes/waiting-list.routes.js` | New (thay `waitlist.routes.js`) | 5 endpoint ①-⑤ | §5.3 |
| `src/routes/offers.routes.js` | New (viết lại) | 5 endpoint ⑥-⑩, thêm `GET /api/offer-events` | §5.3 |
| `src/services/notificationService.js`, `src/repositories/notificationRepository.js`, `src/routes/notifications.routes.js` | **Deleted** | gỡ bỏ hoàn toàn | Đính chính 1 — cấm tuyệt đối |
| `public/js/views/patient.js`, `public/js/views/staff.js`, `public/js/views/waitingList.js` (mới), `public/js/api.js` qua `api()` chung, `public/index.html` | Modified/New | UI đề xuất + đếm ngược, panel quản trị danh sách chờ, nhật ký | §6.1 — trước đó **chưa có UI nào** cho feature |

## 3. UI Components
| UI Component | Existing/New/Modified | Trách nhiệm | Trạng thái cần xử lý |
|---|---|---|---|
| Thẻ "Đề xuất của tôi" (`#myOffers`, patient.js) | New | hiển thị offer + đếm ngược `remainingSeconds` + nút Chấp nhận/Từ chối | `sent` còn hạn / đã hết hạn (vô hiệu hoá nút) |
| Panel "Danh sách chờ của tôi" (`#myWaitingList`, patient.js) | New | chỉ đọc — patient không tự đăng ký (BR-08) | `waiting` / `offered` |
| Panel "Danh sách chờ" (`#waitingListPanel` + form, waitingList.js) | New | staff thêm/huỷ entry kèm `medicalPriority` | `waiting`/`offered`/`fulfilled`/`cancelled` |
| Panel "Nhật ký đề xuất" (`#offerEventsLog`, waitingList.js) | New | staff xem `offer_events` | append-only, chỉ đọc |

## 4. Services
| Service | Reuse/Extend/New | Trách nhiệm | Business Rule liên quan |
|---|---|---|---|
| `offerEngineService` | New | toàn bộ vòng đời offer, bề mặt public hẹp theo §6.2 | BR-01 → BR-07 |
| `offerExpirySweeper` | New | `sweepOnce()` định kỳ | BR-05, BR-06 |
| `waitingListService` | New | CRUD danh sách chờ do staff | BR-08 |
| `appointmentService`, `slotService` | Extend | thêm 4 điểm móc (§6.3) | BR-01, BR-07 |
| `slotRepository`, `appointmentRepository` | Reuse — không sửa | dùng nguyên `findForUpdate`, `updateStatus`, `create`, `countActiveBySlot` | ADR-004 |

## 5. APIs
| API | Existing/New/Modified | Request | Response | Error Cases |
|---|---|---|---|---|
| `POST /api/waiting-list` | New | patientId, doctorId\|specializationId, medicalPriority,... | entry (staff shape) | 400, 403, 404, 409 |
| `GET /api/waiting-list` | New | query status/doctorId/specializationId | entry[] + `pendingOffer` | 403 |
| `PUT /api/waiting-list/:id` | New | các trường sửa được | entry | 400, 403, 404, 409 |
| `DELETE /api/waiting-list/:id` | New | — | `{id,status,cancelledOfferId}` | 403, 404, 409 |
| `GET /api/my-waiting-list` | New | — | entry rút gọn[] | — |
| `GET /api/my-offers` | New | `?includeHistory` | offer[] (cột hẹp BR-08) | — |
| `POST /api/offers/:id/accept` | New | không body | appointment **phẳng** | 403, 404, 409×3 |
| `POST /api/offers/:id/decline` | New | `{reason?}` | `{id,status,respondedAt}` | 403, 404, 409 |
| `GET /api/offers` | New | slotId/patientId/status | offer đầy đủ[] | 403 |
| `GET /api/offer-events` | New | slotId/patientId/limit | event[] tăng dần thời gian | 403 |
| `POST /api/appointments`, `POST /api/appointments/:id/cancel`, `PUT /api/slots/:id` | Modified (side effect only) | **contract không đổi** | **contract không đổi** | thêm gọi hook sau commit |

## 6. Data Context
| Entity/DTO/State | Existing/New/Modified | Thay đổi dự kiến | Thành phần sử dụng |
|---|---|---|---|
| `waiting_list_entries` | New | id, patient_id, doctor_id?, specialization_id?, medical_priority, preferred_type, status, desired_from/to, note, created_by_user_id, created_at (bất biến), updated_at | waitingListRepository |
| `appointment_offers` | New | status `sent\|accepted\|declined\|expired\|cancelled`, expires_at (`timestamptz`), appointment_id, cancel_reason, decline_reason | offerRepository |
| `offer_events` | New, append-only | bigserial, event_type, actor, actor_user_id, reason | offerEventRepository |
| 6 bảng gốc | Reuse — không sửa cấu trúc | — | mọi repository cũ |

## 7. Business Rules
| ID | Business Rule | Nơi hiện thực dự kiến | Acceptance Criteria liên quan |
|---|---|---|---|
| BR-01 | Kích hoạt Offer Engine đúng 2 nguồn + lead time ≥30' | `offerEngineService.onSlotBecameAvailable` | AC-02.1 → AC-02.4 |
| BR-02 | Ưu tiên y tế → thời gian chờ → id, không random/FIFO thuần | `waitingListRepository.findBestCandidateForSlot` (ORDER BY) | AC-02.5 → AC-02.7 |
| BR-03 | 6 điều kiện ứng viên | cùng truy vấn trên | AC-02.8 → AC-02.10 |
| BR-04 | 1 offer `sent`/slot và /bệnh nhân, 2 partial unique index | migration + `offerRepository.create` (catch 23505) | AC-03.3, AC-06.5 |
| BR-05 | `expires_at = min(now+15', giờ slot)`, `timestamptz` | `offerRepository.create` (tính trong SQL) | AC-04.3, AC-06.4 |
| BR-06 | Từ chối/hết hạn → chuyển tiếp; 4 điều kiện dừng | `offerEngineService` (decline/expire gọi lại `onSlotBecameAvailable`) | AC-05.1, AC-06.1 → 06.3 |
| BR-07 | Chấp nhận = transaction 7 bước; slot mất khả dụng không mất lượt | `offerEngineService.acceptOffer` | AC-04.1 → AC-04.6 |
| BR-08 | Phân quyền, không lộ dữ liệu y tế, ghi nhật ký mọi chuyển trạng thái | `waitingListService` + `offerEventRepository` | AC-03.2, AC-04.5, AC-07.x |

## 8. Coding Constraints
- Coding conventions: CommonJS, `require`/`module.exports` cuối file, SQL alias camelCase, không `SELECT *` cho endpoint bệnh nhân (§6.4).
- Framework constraints: không thêm dependency runtime (C1), không đổi `docker-compose.yml`/`package.json` (C2, NFR-04).
- Reusable components: `slotRepository`, `appointmentRepository`, `demoAuth`, `requireRole`, `httpError`, `toInt`/`required` — dùng nguyên, không sửa.
- Error handling: `httpError(status, "tiếng Việt")`; route luôn `try/catch` + `next(error)`.
- Logging: `offer_events` là log nghiệp vụ bắt buộc (BR-08); `console.error` cho lỗi hook bị nuốt (§6.3).
- Security: kiểm quyền sở hữu ở tầng service (`offer.patient_id === user.patientId`), không tin `X-Demo-User-Id` (ADR-002).
- Transaction/concurrency: khoá `slots` trước `appointments` (thứ tự thống nhất), conditional UPDATE thay đọc-rồi-ghi cho `accept`.
- Performance constraints: NFR-01 (≤5s tạo offer), NFR-02 (≤60s phát hiện hết hạn), NFR-03 (100 vòng đồng thời không lỗi 500).

## 9. Technical Risks
| Risk | Ảnh hưởng | Khả năng xảy ra | Hướng xử lý |
|---|---|---|---|
| Code cũ trong `day03` được viết theo `doc/specs/waitlist-feature.md` bản 1-file (đã lỗi thời) — sai gần như toàn bộ mô hình dữ liệu và vai trò | Toàn bộ backend/test phải viết lại từ đầu | Đã xảy ra | Xác nhận với Human, viết lại đúng theo bộ 9 file FROZEN — xem `code-review.md` CR-01 |
| `expires_at` so với `now()` lệch múi giờ Node/DB | Sai NFR-01/NFR-02, offer hết hạn sai giờ | Trung bình | Tính toàn bộ `expires_at` và lead time bằng SQL (`(date+start_time)::timestamptz`), không tính bằng JS Date |
| Volume Postgres dev còn bảng Day 3 bản nháp cũ (`waitlist_entries`, `appointment_offers` sai cột) | `create table if not exists` bỏ qua, migration mới không áp dụng | Đã xảy ra khi rebuild | Dọn bảng cũ một lần qua `psql`; `drop table if exists notifications` được giữ lại vĩnh viễn trong migrate.js vì bị cấm tuyệt đối |

## 10. Assumptions and Open Questions
| Assumption/Open Question | Thành phần bị ảnh hưởng | Người cần xác nhận | Trạng thái |
|---|---|---|---|
| Staff chọn bệnh nhân bằng cách nhập `patientId` dạng số (không có endpoint `GET /api/patients` trong 10 endpoint đã chốt) | UI staff — form thêm vào danh sách chờ | Human | Chấp nhận cho MVP demo, không mở rộng API ngoài §5.3 |
| OQ-01 → OQ-06 | như liệt kê trong `08-open-questions.md` | Ban giám đốc / Medical Staff / IT | Không chặn Day 3, giữ nguyên |

## 11. Development Scope
### In Scope
- Toàn bộ 9 điểm trong `01-context-scope.md` §1.3 (In Scope).

### Out of Scope
- Toàn bộ 8 điểm trong `01-context-scope.md` §1.4, cộng 6 Open Questions ở mục 8.

## 12. Readiness Decision
- Ready for Coding Blueprint: **Yes**
- Missing Context: không — 9 file spec đã đầy đủ (§9 Handoff Checklist đã xác nhận 12/12 tiêu chí AI-Ready).
- Human Decision: chấp nhận viết lại toàn bộ Day 3 theo bộ spec FROZEN, không giữ lại code/test cũ.
