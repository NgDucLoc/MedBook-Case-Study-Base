# Unit Test Plan

## 1. Test Scope
- Vertical slice: toàn bộ Offer Engine (chọn ứng viên → gửi offer → chấp nhận/từ chối/hết hạn)
  + CRUD danh sách chờ của staff + nhật ký audit
- Components under test: `waitingListRepository`, `offerRepository`, `offerEventRepository`,
  `offerEngineService`, `offerExpirySweeper`, `waitingListService`, 2 route file mới
- Components excluded: frontend (`public/js/`) — repo không có framework test frontend, giữ
  nguyên convention cũ (chỉ test tích hợp qua HTTP thật)
- Test framework: `node:test` + `node:assert/strict`, **test tích hợp thật** — HTTP thật qua
  `app.listen(0)`, PostgreSQL thật, không mock DB (đúng §6.4 convention đã có trong repo)

## 2. Traceability
| Test ID | Component | Business Rule | Acceptance Criteria |
|---|---|---|---|
| AC-01.1 → AC-01.5 | `waitingListService`, route `waiting-list.routes.js` | BR-08 | US-01 |
| AC-02.1 → AC-02.11 | `offerEngineService`, `waitingListRepository` | BR-01, BR-02, BR-03 | US-02 |
| AC-03.1, AC-03.2, AC-03.4 | `offerRepository.listMyOffers` | BR-08 | US-03 |
| AC-04.1 → AC-04.6 | `offerEngineService.acceptOffer` | BR-07 | US-04 |
| AC-05.1 → AC-05.4 | `offerEngineService.declineOffer` | BR-06, BR-08 | US-05 |
| AC-06.1 → AC-06.5 | `offerExpirySweeper` | BR-05, BR-06 | US-06 |
| AC-07.1 → AC-07.6 | `waitingListService`, `offerEventRepository` | BR-08 | US-07 |

## 3. Frontend Test Scenarios
| Test ID | Component | Scenario | Input/Precondition | Expected Result | Mock |
|---|---|---|---|---|---|
| — | — | Không có framework test frontend trong repo (giữ nguyên hiện trạng); kiểm chứng UI bằng: (a) đối chiếu mọi `el("id")` trong JS với `id=` trong HTML, (b) `node --check` toàn bộ file ES module, (c) curl trực tiếp toàn bộ luồng API mà UI gọi | — | 0 mismatch id, 0 lỗi cú pháp, luồng curl thành công | — |

## 4. Backend Test Scenarios
| Test ID | Component | Scenario | Input/Precondition | Expected Result | Mock |
|---|---|---|---|---|---|
| AC-02.5 | `waitingListRepository.findBestCandidateForSlot` | urgent vào sau vẫn thắng normal vào sớm hơn | 2 entry cùng bác sĩ, priority khác nhau, `created_at` khác nhau | offer gửi cho entry `urgent` | Không mock |
| AC-04.6 | `offerEngineService.acceptOffer` vs `appointmentService.bookAppointment` | 20 vòng lặp `Promise.allSettled` accept + đặt trực tiếp đồng thời trên cùng slot | mỗi vòng reset DB độc lập | đúng 1×201, 1×409, 0×500, đúng 1 appointment hoạt động | Không mock |
| AC-06.5 | `offerExpirySweeper.sweepOnce` | 2 lượt gọi đồng thời trên cùng 1 offer hết hạn | `Promise.all([sweepOnce(), sweepOnce()])` | chỉ 1 offer kế tiếp được tạo, không xử lý 2 lần | Không mock |

## 5. Positive Cases
| Test ID | Scenario | Expected Result |
|---|---|---|
| AC-01.1 | staff tạo entry theo bác sĩ kèm `medicalPriority` | 201, status `waiting` |
| AC-02.1 | huỷ lịch trên slot đủ lead time | offer `sent` được tạo, ghi `offer_sent` |
| AC-04.1 | chấp nhận offer hợp lệ | 201 appointment **phẳng**, slot `booked`, entry `fulfilled` |
| AC-07.5 | chuỗi sent→expired→sent→accepted | `GET /api/offer-events` trả đúng 4 dòng theo thứ tự |

## 6. Negative Cases
| Test ID | Scenario | Expected Result |
|---|---|---|
| AC-01.3 | thiếu cả doctorId lẫn specializationId | 400 |
| AC-04.5 | bệnh nhân khác chấp nhận offer không phải của mình | 403 |
| AC-05.3 | từ chối offer đã **expired** (không chỉ quá giờ) | 409 "Đề xuất không còn hiệu lực" |
| AC-07.6 | bệnh nhân gọi endpoint chỉ dành cho staff | 403 |

## 7. Boundary Cases
| Test ID | Scenario | Expected Result |
|---|---|---|
| AC-02.4 | slot còn đúng 20 phút (< ngưỡng 30 phút) | không tạo offer, ghi `no_candidate` reason `lead_time` |
| AC-02.7 | 2 entry cùng priority, cùng `created_at` | phá hoà bằng `id` nhỏ hơn, lặp lại 3 lần vẫn ra cùng kết quả |
| AC-04.3 | offer quá `expires_at` nhưng sweeper **chưa kịp quét** | 409 "Đề xuất đã hết hạn" (khác AC-05.3 — đã thật sự `expired`) |

## 8. Error Cases
| Test ID | Scenario | Expected Result |
|---|---|---|
| AC-04.2 | slot bị đặt trực tiếp trong lúc offer đang chờ | 409 "Khung giờ đã được đặt"; offer tự `cancelled`; entry không mất lượt |
| AC-06.3 | offer hết hạn nhưng slot đã `booked` bởi đường khác | chỉ đánh dấu `expired`, KHÔNG tạo offer mới |
| AC-04.4 | chấp nhận lần thứ hai (offer đã `accepted`) | 409 "Đề xuất không còn hiệu lực"; đúng 1 appointment tồn tại |

## 9. Mocking Strategy
| Dependency | Mock/Stub/Fake | Behavior |
|---|---|---|
| PostgreSQL | **Không mock** | Test tích hợp thật trên container `db` — đúng convention repo sẵn có (§6.4) |
| Thời gian (`now()`, `expires_at`) | Không mock đồng hồ hệ thống — thao tác trực tiếp bằng SQL (`sent_at`/`expires_at` bị lùi cả hai vế để không vi phạm `check(expires_at > sent_at)`) | Mô phỏng "đã hết hạn" chính xác như production |
| Sweeper interval | `offerExpirySweeper.sweepOnce()` gọi trực tiếp, không chờ `setInterval` thật | Test không cần `sleep` dài |

## 10. Testability Issues
| Component | Issue | Impact | Suggested Improvement |
|---|---|---|---|
| `offerEngineService.declineOffer` | chuyển tiếp ứng viên kế tiếp chạy **fire-and-forget** (không `await`), đúng theo yêu cầu §5.4 ⑦ | Test AC-05.1/05.2 phải dùng `waitUntil()` polling thay vì assert ngay sau response | Chấp nhận — đánh đổi có chủ ý (không bắt bệnh nhân chờ), tài liệu hoá rõ trong test |
| `seed.js` seed sẵn 3 waiting-list entry demo | Có thể va chạm với entry test tạo cho cùng (patient, doctor) do `uniq_active_entry_per_patient_target` | Trung bình — gây 1 lỗi thật trong lần chạy đầu (AC-04.6) | `test.beforeEach` chủ động set 3 entry demo về `cancelled` trước mỗi test |

## 11. Human Approval
- Approved: Có
- Changes required: Không

---

### Human Review Test Plan:
- [x] Test Scope có đúng với coding không?
- [x] Có test cho cả frontend và backend không? — frontend kiểm bằng kỹ thuật thay thế (mục 3), không có unit test framework riêng.
- [x] Các Business Rules quan trọng đã được bao phủ chưa? — cả 8 BR.
- [x] Có đủ positive, negative và boundary cases chưa?
- [x] Expected Result có cụ thể và kiểm chứng được không?
- [x] Mock có đúng dependency không? — cố tình không mock DB, đúng triết lý test tích hợp của repo.
- [x] AI có đang mock luôn component cần kiểm thử không? — không.
- [x] Có test nào chỉ kiểm tra implementation detail thay vì behavior không? — không; mọi test đi qua HTTP thật hoặc truy vấn kiểm tra bất biến dữ liệu (§4.6), không gọi thẳng hàm nội bộ.
