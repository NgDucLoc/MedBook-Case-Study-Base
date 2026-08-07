> **Đây là 1 trong 9 file của Specification Package — Dynamic Appointment Rescheduling & Waiting List Management (MedBook).**
> File này là input đầu vào cho Day 3, ngang hàng với 8 file còn lại trong `spec/`. Xem `spec/README.md` để biết toàn cảnh và thứ tự đọc.
>
> **Khi file này mâu thuẫn với bất kỳ mô tả, slide, hội thoại hay tài liệu nào trước đó, file này là bản có hiệu lực.** Phiên bản: 1.0 — FROZEN · 2026-08-03.

> ⚠️ **AI Developer không được tự thay đổi, nới lỏng, bổ sung hay diễn giải lại bất kỳ Business Rule nào trong file này.**

---

# 2. Frozen Business Rules

> **8 quy tắc dưới đây đã CHỐT cho MVP.** AI Developer **không được** tự thay đổi, nới lỏng điều kiện, thêm tiêu chí, hay diễn giải lại. Mỗi quy tắc ghi rõ **chi tiết kỹ thuật** để implement được ngay và **lý do** để không ai vô tình sửa vì tưởng nó tùy tiện.

---

## BR-01

### Điều kiện kích hoạt Offer Engine

**Quy tắc:** Offer Engine được kích hoạt **khi và chỉ khi** một slot chuyển sang `available` qua một trong hai đường dưới đây, **và** thời điểm bắt đầu slot còn cách hiện tại ít nhất `OFFER_MIN_LEAD_MINUTES` (mặc định **30 phút**).

| Đường | Nguồn | Kích hoạt? |
| --- | --- | --- |
| Appointment bị hủy → slot về `available` | `appointmentService.cancelAppointment()` | ✅ **Có** |
| Staff mở lại slot (`PUT /api/slots/:id` với `status: 'available'`) | `slotService.updateSlot()` | ✅ **Có** |
| Staff tạo slot mới (`POST /api/slots`) | `slotService.createSlot()` | ❌ **Không** |
| Seed dữ liệu khi app khởi động | `src/db/seed.js` | ❌ **Không** |

**Chi tiết kỹ thuật:**

- Điểm móc gọi `offerEngineService.onSlotBecameAvailable(slotId)`.
- So sánh lead time: `(slot.date + slot.start_time) - now() >= OFFER_MIN_LEAD_MINUTES phút`. Slot đã qua giờ cũng không tạo offer.
- Không thỏa lead time ⇒ ghi `offer_events` loại `no_candidate`, `reason = 'lead_time'`, và dừng.

**Lý do:**

Slot **mới tạo** là việc mở rộng lịch làm việc bình thường — bệnh nhân tự đặt được qua luồng có sẵn. Waiting list sinh ra để giải quyết **slot bị trống đột ngột**. Nếu slot mới cũng kích hoạt, mỗi lần staff thêm lịch làm việc sẽ tạo ra một loạt đề xuất không ai mong đợi.

Lead time 30 phút: đề xuất một slot còn 10 phút nữa là làm phiền vô ích, bệnh nhân không kịp tới.

---

## BR-02

### Thứ tự ưu tiên chọn ứng viên

**Quy tắc:** Trong các ứng viên thỏa [BR-03](#br-03), chọn **đúng một** theo thứ tự từ điển:

1. `medical_priority` **giảm dần**: `urgent` (3) → `high` (2) → `normal` (1)
2. `created_at` **tăng dần** — vào danh sách chờ trước thì được trước
3. `id` **tăng dần** — phá hòa xác định

**Chi tiết kỹ thuật:**

```sql
order by
  case medical_priority when 'urgent' then 3 when 'high' then 2 else 1 end desc,
  created_at asc,
  id asc
limit 1
```

**Ba điều CẤM tuyệt đối:**

| Cấm | Vì sao |
| --- | --- |
| `order by random()` hoặc bất kỳ yếu tố ngẫu nhiên nào | Kết quả không lặp lại được ⇒ không test được, không giải thích được với bệnh nhân |
| FIFO thuần (bỏ qua `medical_priority`) | Sai về y tế: người khẩn cấp bị xếp sau người đăng ký sớm |
| Tự thêm tiêu chí (khoảng cách, số lần từ chối, hàm chấm điểm có trọng số) | Không có tiêu chí nào ngoài 3 tiêu chí trên được bệnh viện phê duyệt |

**Lý do:**

Đây là luật AI hay tự bịa nhất. Khi đưa mô tả gốc ("mức độ ưu tiên y tế, thời gian chờ, sự phù hợp") cho AI, kết quả nhận về là một hàm chấm điểm có trọng số **do AI tự đặt** — nghe thuyết phục và hoàn toàn bịa. Bệnh viện đã chốt: quy tắc sắp xếp từ điển, không phải chấm điểm. Đơn giản hơn, giải thích được với bệnh nhân, và test được.

`created_at` của entry **không bao giờ được cập nhật** khi entry quay lại `waiting` — nếu cập nhật, người từ chối một đề xuất sẽ bị đẩy xuống cuối hàng đợi, biến việc từ chối thành hình phạt ngầm.

---

## BR-03

### Điều kiện để một entry là ứng viên của slot S

**Quy tắc:** Entry `E` là ứng viên của slot `S` khi **TẤT CẢ** 6 điều kiện sau đúng. Không được nới lỏng bất kỳ điều kiện nào để "tăng tỉ lệ lấp slot".

| # | Điều kiện | Diễn giải |
| --- | --- | --- |
| **a** | `E.status = 'waiting'` | Entry đang chờ, không đang giữ offer, chưa kết thúc |
| **b** | `E.doctor_id = S.doctor_id` **HOẶC** (`E.doctor_id IS NULL` **AND** `E.specialization_id` = chuyên khoa của bác sĩ giữ S) | Entry theo bác sĩ chỉ khớp đúng bác sĩ đó; entry theo chuyên khoa khớp mọi bác sĩ trong chuyên khoa |
| **c** | Bệnh nhân của E **không** đang giữ offer nào ở trạng thái `sent` | Hệ quả của [BR-04](#br-04) |
| **d** | Bệnh nhân của E **không** có appointment `booked`/`confirmed` mà slot của nó **trùng ngày và giao nhau về khoảng giờ** với S | Chống tạo hai lịch chồng nhau |
| **e** | `E.desired_from IS NULL` hoặc `S.date >= E.desired_from`; `E.desired_to IS NULL` hoặc `S.date <= E.desired_to` | Tôn trọng khoảng ngày bệnh nhân chấp nhận |
| **f** | Chưa từng có offer cho cặp (E, S) ở trạng thái `declined` hoặc `expired` | Không mời lại người đã từ chối **chính slot đó** |

**Chi tiết kỹ thuật — điều kiện (d), "giao nhau về khoảng giờ":**

```sql
s2.date = s.date and s2.start_time < s.end_time and s2.end_time > s.start_time
```

**Truy vấn đầy đủ** (bản dịch trực tiếp của BR-02 + BR-03, đã kiểm chứng trên PostgreSQL 16 — xem [§4.5](04-data-model.md#45-truy-vấn-chọn-ứng-viên)).

**Lý do:**

- (c) và (f) là **hai điều kiện đảm bảo chuỗi offer luôn kết thúc**: tập ứng viên hữu hạn và giảm dần sau mỗi lần từ chối. Nới lỏng (f) sẽ tạo vòng lặp vô hạn mời–từ chối.
- (d) chống lỗi nghiệp vụ nghiêm trọng nhất: bệnh nhân có hai lịch khám chồng giờ. Đây là edge case cả BA lẫn AI đều dễ bỏ sót.

---

## BR-04

### Một đề xuất đang chờ trên mỗi slot và trên mỗi bệnh nhân

**Quy tắc:** Tại mọi thời điểm:

- Mỗi `slot_id` có **tối đa MỘT** offer ở trạng thái `sent`
- Mỗi `patient_id` có **tối đa MỘT** offer ở trạng thái `sent` (tính trên toàn hệ thống, không phân biệt chuyên khoa)

**Chi tiết kỹ thuật — bảo vệ hai lớp:**

Lớp 1, kiểm tra trong service trước khi tạo offer. Lớp 2, **partial unique index ở database**:

```sql
create unique index if not exists one_pending_offer_per_slot
  on appointment_offers(slot_id) where status = 'sent';

create unique index if not exists one_pending_offer_per_patient
  on appointment_offers(patient_id) where status = 'sent';
```

**Cả hai index là BẮT BUỘC, không phải tùy chọn.**

**Lý do:**

*Vì sao tuần tự thay vì gửi song song cho 3 người:* gửi song song lấp slot nhanh hơn, nhưng tạo ra trải nghiệm "hứa rồi rút lại" — hai trong ba người sẽ bị từ chối sau khi đã được mời. Trong bối cảnh y tế, bệnh viện chọn chậm hơn nhưng không thất hứa.

*Vì sao mỗi bệnh nhân chỉ một offer:* nếu cho phép nhiều, bệnh nhân có thể chấp nhận cả ba rồi hủy hai — quay lại đúng bài toán slot chết mà feature này sinh ra để giải.

*Vì sao đặt index ở DB:* sao chép đúng mô hình `one_active_appointment_per_slot` của ADR-004 — quy tắc nghiệp vụ sống còn thì đặt ở **cả code lẫn database**. Nếu một lập trình viên tương lai thêm đường ghi mới mà quên kiểm tra, database vẫn chặn.

---

## BR-05

### Hạn trả lời của đề xuất

**Quy tắc:** Mỗi offer có hạn trả lời:

```
expires_at = min(now() + OFFER_RESPONSE_TIMEOUT_MINUTES, thời điểm bắt đầu slot)
```

`OFFER_RESPONSE_TIMEOUT_MINUTES` mặc định **15 phút**, cấu hình qua biến môi trường.

**Chi tiết kỹ thuật:**

- `expires_at` lưu kiểu **`timestamptz`**, **KHÔNG** dùng `date` + `time` như bảng `slots`. Lý do: `slots` tách `date`/`time` và hiểu theo giờ server, không có múi giờ — tính hạn theo cách đó sẽ sai khi so sánh với `now()`.
- Quá hạn được phát hiện bởi sweeper, chu kỳ `OFFER_SWEEP_INTERVAL_SECONDS` (mặc định **30 giây**).
- Mọi câu lệnh chấp nhận offer **phải** có thêm điều kiện `and expires_at > now()` — xem [BR-07](#br-07).

**Lý do:**

15 phút là đánh đổi: dài hơn thì slot chết lâu, ngắn hơn thì bệnh nhân không kịp thấy.

Vế `min(..., slot_start)` chống một tình huống vô lý: slot bắt đầu sau 35 phút mà hạn trả lời 15 phút sẽ kéo tới sát giờ khám. Cắt hạn về đúng giờ bắt đầu slot.

---

## BR-06

### Chuyển tiếp tự động và điều kiện dừng

**Quy tắc:** Khi một offer kết thúc ở trạng thái `declined` hoặc `expired`, hệ thống **tự động** tìm ứng viên kế tiếp cho **cùng slot** theo [BR-02](#br-02) + [BR-03](#br-03) và gửi offer mới.

Chuỗi **dừng** khi một trong bốn điều kiện sau xảy ra:

| # | Điều kiện dừng | Hành động |
| --- | --- | --- |
| 1 | Không còn ứng viên nào thỏa BR-03 | Ghi `no_candidate`, `reason = 'no_match'` |
| 2 | Slot không còn `available` | Dừng im lặng |
| 3 | Không còn thỏa lead time của BR-01 | Ghi `no_candidate`, `reason = 'lead_time'` |
| 4 | Có người chấp nhận | Chuỗi kết thúc thành công |

**Chi tiết kỹ thuật:**

- Khi hết ứng viên, hệ thống **KHÔNG làm gì với slot** — slot giữ nguyên `available` và bệnh nhân vẫn đặt chủ động được qua `POST /api/appointments` như bình thường.
- Với nhánh `expired`, việc chuyển tiếp phải hoàn tất trong **≤ 60 giây** kể từ `expires_at` ([NFR-02](07-non-functional-requirements.md#nfr-02)).
- Trước khi chuyển tiếp, **phải đọc lại** `slots.status` từ DB — không tin giá trị đã đọc trước đó.

**Lý do:**

Điều kiện dừng số 2 là chỗ dễ sai nhất: nếu không đọc lại `slots.status`, hệ thống sẽ gửi offer cho một slot vừa bị người khác chiếm.

Việc **không** đánh dấu slot thành trạng thái đặc biệt nào khi hết ứng viên là có chủ ý — slot vẫn phải hoạt động bình thường với luồng đặt lịch chủ động đang chạy.

---

## BR-07

### Hiệu lực của việc chấp nhận đề xuất

**Quy tắc:** Khi bệnh nhân chấp nhận offer, **7 bước sau chạy trong MỘT transaction duy nhất**. Bất kỳ bước nào thất bại ⇒ rollback toàn bộ.

| Bước | Hành động | Thất bại thì |
| ---: | --- | --- |
| 1 | `begin` | — |
| 2 | `SELECT ... FOR UPDATE` trên `slots` | — |
| 3 | Kiểm `slot.status = 'available'` | `409 "Khung giờ đã được đặt"` |
| 4 | `INSERT appointments` (`status='booked'`, `type = offer.appointment_type`) | rollback |
| 5 | Conditional UPDATE offer sang `accepted`, **kèm `appointment_id`** | `409` — xem bên dưới |
| 6 | `UPDATE slots SET status='booked'` | rollback |
| 7 | `UPDATE waiting_list_entries SET status='fulfilled'` → `commit` | rollback |

**Chi tiết kỹ thuật — câu lệnh chuyển trạng thái bắt buộc:**

```sql
update appointment_offers
set status = 'accepted', appointment_id = $2, responded_at = now(), updated_at = now()
where id = $1 and status = 'sent' and expires_at > now()
returning id
```

> ⚠️ **Hai vế bắt buộc, đã kiểm chứng bằng PostgreSQL 16:**
>
> 1. **`appointment_id = $2` trong cùng câu lệnh.** Ràng buộc `check ((status='accepted') = (appointment_id is not null))` sẽ từ chối nếu thiếu — lỗi thật: `violates check constraint "appointment_offers_check1"`. Vì vậy `INSERT appointments` (bước 4) phải chạy **trước** bước 5.
> 2. **`and expires_at > now()`.** Thiếu vế này thì bệnh nhân chấp nhận được offer đã quá hạn khi sweeper chậm vài giây — hành vi phụ thuộc thời điểm, không test được.

**Không có dòng trả về ⇒ phân biệt hai lỗi bằng cách đọc lại offer:**

| Điều kiện | Mã | Message |
| --- | --- | --- |
| `expires_at <= now()` | `409` | `Đề xuất đã hết hạn` |
| `status ≠ 'sent'` | `409` | `Đề xuất không còn hiệu lực` |

**Slot bị chiếm trong lúc offer đang chờ:** nếu slot chuyển sang `booked` bằng bất kỳ đường nào (staff chặn giờ, hoặc bệnh nhân khác đặt chủ động):

- Offer → `cancelled`, `cancel_reason = 'slot_unavailable'`
- Entry quay lại `waiting`, **giữ nguyên `created_at`** ⇒ **không mất lượt**
- Bệnh nhân thấy `"Khung giờ không còn khả dụng"`

**Lý do:**

*Vì sao ba mã 409 khác nhau:* bệnh nhân cần biết mình lỡ vì hết giờ hay vì người khác nhanh hơn — hai tình huống dẫn tới hai hành động khác nhau. Gộp thành một thông báo mơ hồ là mất thông tin có ích.

*Vì sao dùng conditional UPDATE thay vì đọc-rồi-ghi:* không có khe hở thời gian giữa đọc và ghi. Đây là mẫu `appointmentRepository.confirmBooked()` đã có sẵn trong repo.

*Vì sao entry không mất lượt:* mất lượt sẽ trừng phạt người bị hệ thống rút lại đề xuất — sai về công bằng.

---

## BR-08

### Phân quyền, quyền riêng tư và truy vết

**Quy tắc — phân quyền:**

| Hành động | `patient` | `staff` |
| --- | :---: | :---: |
| Thêm bệnh nhân vào danh sách chờ | ❌ | ✅ |
| Sửa mức ưu tiên y tế | ❌ | ✅ |
| Hủy một entry | ❌ | ✅ |
| Xem toàn bộ danh sách chờ | ❌ | ✅ |
| Xem nhật ký offer | ❌ | ✅ |
| Xem entry của chính mình | ✅ | ✅ |
| Xem / trả lời offer của chính mình | ✅ | ❌ |

**Quy tắc — kiểm quyền sở hữu:** Mọi thao tác trên một offer **phải** kiểm `offer.patient_id === req.user.patientId` **ở tầng service**, không được chỉ dựa vào `requireRole('patient')`. Vi phạm ⇒ `403 "Không đủ quyền"`.

**Quy tắc — quyền riêng tư:** Response trả cho **bệnh nhân** chỉ được chứa: tên bác sĩ, chức danh, chuyên khoa, phòng khám, ngày, giờ bắt đầu, giờ kết thúc, hạn trả lời, số giây còn lại.

**Cấm xuất hiện** trong response của bệnh nhân: `medicalPriority`, vị trí trong hàng đợi, tổng số người đang chờ, thông tin bệnh nhân khác, lý do khám, chẩn đoán, `note`.

**Quy tắc — truy vết:** **Mọi** chuyển trạng thái của offer và của entry phải sinh một dòng `offer_events` gồm: thời điểm, loại sự kiện, `offer_id`, `slot_id`, `patient_id`, trạng thái trước, trạng thái sau, tác nhân (`patient`/`staff`/`system`), `actor_user_id`. **Không** ghi `medical_priority` vào nhật ký.

**Chi tiết kỹ thuật:**

- Repository phục vụ endpoint của bệnh nhân **không được** dùng `SELECT *` — phải liệt kê cột tường minh.
- `offer_events` là **append-only**: repository chỉ có `append()` và `list()`, **không** có update/delete.
- Ghi nhật ký **sau khi** transaction chính đã commit — mất một dòng log không được làm hỏng nghiệp vụ.

**Lý do:**

Header `X-Demo-User-Id` **giả mạo được bằng một dòng `curl`** (ADR-002). `requireRole` chỉ chặn sai vai trò, **không** chặn sai chủ sở hữu. Không có kiểm quyền sở hữu, bất kỳ bệnh nhân nào cũng chấp nhận được offer của người khác — lỗ hổng dữ liệu y tế cá nhân.

Không lộ vị trí hàng đợi vì nó tiết lộ thông tin về bệnh nhân khác (có bao nhiêu người khẩn cấp hơn).

Nhật ký là bằng chứng trả lời câu hỏi "vì sao người này được mời trước" — chính là pain point về công bằng mà feature sinh ra để giải.

---

## Bảng tra nhanh Business Rules

| BR | Phát biểu một dòng | Component chịu trách nhiệm | AC kiểm chứng |
| --- | --- | --- | --- |
| [BR-01](#br-01) | Chỉ hủy lịch / mở lại slot mới kích hoạt; lead time ≥ 30 phút | `offerEngineService` | AC-02.1 → AC-02.4 |
| [BR-02](#br-02) | Ưu tiên y tế → thời gian chờ → id. Không random, không FIFO | `waitingListRepository` + `offerEngineService` | AC-02.5 → AC-02.7 |
| [BR-03](#br-03) | 6 điều kiện để là ứng viên, không được nới lỏng | `waitingListRepository` + `offerEngineService` | AC-02.8 → AC-02.10 |
| [BR-04](#br-04) | 1 offer `sent` / slot và / bệnh nhân, có 2 partial unique index | `offerEngineService` + DB | AC-03.3, AC-06.5 |
| [BR-05](#br-05) | Hạn 15 phút, `timestamptz`, cắt bởi giờ slot | `offerEngineService` | AC-03.1, AC-04.3, AC-06.4 |
| [BR-06](#br-06) | Từ chối / hết hạn → chuyển người kế tiếp; 4 điều kiện dừng | `offerEngineService` + `offerExpirySweeper` | AC-05.1, AC-06.1 → AC-06.3 |
| [BR-07](#br-07) | Chấp nhận = transaction 7 bước; slot mất khả dụng thì không mất lượt | `offerEngineService` | AC-04.1 → AC-04.6 |
| [BR-08](#br-08) | Phân quyền, không lộ dữ liệu y tế, ghi nhật ký mọi chuyển trạng thái | `waitingListService` + `offerEventRepository` | AC-03.2, AC-04.5, AC-07.x |

---

---

[← Context & Scope](01-context-scope.md) · [Mục lục](README.md) · [User Stories & Acceptance Criteria (US-01 → US-07) →](03-user-stories-acceptance-criteria.md)
