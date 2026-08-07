> **Đây là 1 trong 9 file của Specification Package — Dynamic Appointment Rescheduling & Waiting List Management (MedBook).**
> File này là input đầu vào cho Day 3, ngang hàng với 8 file còn lại trong `spec/`. Xem `spec/README.md` để biết toàn cảnh và thứ tự đọc.
>
> **Khi file này mâu thuẫn với bất kỳ mô tả, slide, hội thoại hay tài liệu nào trước đó, file này là bản có hiệu lực.** Phiên bản: 1.0 — FROZEN · 2026-08-03.

---

# 3. User Stories & Acceptance Criteria

> Mỗi AC **quan sát và kiểm thử được**. Không AC nào dùng từ "phù hợp", "nhanh", "hợp lý" mà không kèm con số.

---

## US-01 — Staff thêm bệnh nhân vào danh sách chờ

> **Là** nhân viên điều phối, **tôi muốn** thêm một bệnh nhân vào danh sách chờ kèm bác sĩ hoặc chuyên khoa mong muốn và mức ưu tiên y tế, **để** hệ thống có dữ liệu chọn người khi có slot trống.

**Ưu tiên:** Must · **BR:** BR-08

| AC | Loại | Given | When | Then |
| --- | --- | --- | --- | --- |
| **AC-01.1** | Happy Path | Staff đã đăng nhập; bệnh nhân P và bác sĩ D tồn tại | Staff tạo entry cho P với `doctorId=D`, `medicalPriority='high'` | `201`; entry `status='waiting'`, `createdAt` = thời điểm hiện tại; một dòng `offer_events` loại `entry_created` |
| **AC-01.2** | Alternative | Staff đã đăng nhập; chuyên khoa S tồn tại | Staff tạo entry với `specializationId=S`, **không** truyền `doctorId` | `201`; entry có `doctor_id=NULL`, khớp mọi bác sĩ thuộc S (BR-03b) |
| **AC-01.3** | Exception | Staff đã đăng nhập | Staff tạo entry **không** truyền cả `doctorId` lẫn `specializationId` | `400 "Cần chọn bác sĩ hoặc chuyên khoa"`; không dòng nào được ghi |
| **AC-01.4** | Exception | Staff đã đăng nhập | Staff tạo entry với `medicalPriority='vip'` | `400 "Mức ưu tiên không hợp lệ"` |
| **AC-01.5** | Conflict | Bệnh nhân P đã có entry `waiting` cho đúng bác sĩ D | Staff tạo lại entry P + D | `409 "Bệnh nhân đã có trong danh sách chờ"` |

---

## US-02 — Hệ thống phát hiện slot khả dụng và chọn ứng viên ⭐

> **Là** hệ thống, **tôi muốn** tự phát hiện khi một khung giờ trở nên khả dụng và chọn ứng viên phù hợp nhất theo luật ưu tiên, **để** slot trống được lấp mà không cần ai gọi điện.

**Ưu tiên:** Must · **BR:** BR-01, BR-02, BR-03, BR-06

> *Ghi chú:* actor là *System*. Nhóm giữ dạng này có chủ ý — nếu ép viết theo góc nhìn người dùng, hành vi tự động sẽ bị chôn trong US khác và rất dễ bị bỏ sót khi viết test.

### Nhánh kích hoạt

| AC | Loại | Given | When | Then |
| --- | --- | --- | --- | --- |
| **AC-02.1** | Happy Path | Slot S bắt đầu sau 2 giờ, đang `booked` bởi appointment A; có đúng một entry `waiting` khớp | Bệnh nhân hủy A | Trong **≤ 5 giây**: S → `available`; một offer `sent` được tạo; `expires_at = now + 15 phút`; ghi `offer_sent` |
| **AC-02.2** | Alternative | Slot S đang `booked` do staff chặn giờ, **không** có appointment; có entry khớp | Staff gọi `PUT /api/slots/:id` với `status='available'` | S → `available` và một offer `sent` được tạo |
| **AC-02.3** | Alternative | Có nhiều entry `waiting` khớp bác sĩ D | Staff tạo slot **mới** cho D bằng `POST /api/slots` | Slot tạo với `status='available'`; **không** offer nào; **không** dòng `offer_events` nào |
| **AC-02.4** | Exception | Slot S bắt đầu sau **20 phút** (< 30); có entry khớp | Appointment của S bị hủy | S → `available`; **không** offer; ghi `no_candidate` với `reason='lead_time'` |

### Nhánh chọn ứng viên

| AC | Loại | Given | When | Then |
| --- | --- | --- | --- | --- |
| **AC-02.5** | Happy Path | Ba entry khớp slot S: E1 (`normal`, 08:00), E2 (`urgent`, 10:00), E3 (`high`, 09:00) | S trở nên khả dụng | Offer gửi cho **E2** (`urgent`), **không** phải E1 dù E1 chờ lâu nhất |
| **AC-02.6** | Alternative | Hai entry cùng `high`: E4 (09:00), E5 (09:30) | S trở nên khả dụng | Offer gửi cho **E4** |
| **AC-02.7** | Alternative | Hai entry cùng `high`, cùng `created_at` chính xác đến mili giây: E6 (`id=6`), E7 (`id=7`) | S trở nên khả dụng | Offer gửi cho **E6**. Chạy lại kịch bản **10 lần** cho kết quả **giống hệt** |
| **AC-02.8** | Alternative | Slot S của bác sĩ thuộc Tim mạch. E8 đăng ký **Da liễu**, `urgent`. E9 đăng ký Tim mạch, `normal` | S trở nên khả dụng | Offer gửi cho **E9**; E8 không được xét |
| **AC-02.9** | Exception | E10 là ứng viên duy nhất, nhưng bệnh nhân của E10 đã có appointment `confirmed` trùng ngày và giao giờ với S | S trở nên khả dụng | **Không** offer; ghi `no_candidate` |
| **AC-02.10** | Exception | E11 từng nhận offer cho đúng slot S và đã `declined` | S lại trở nên khả dụng | E11 **không** được xét lại cho S |
| **AC-02.11** | Exception | Không entry nào thỏa BR-03 | S trở nên khả dụng | S giữ `available`, bệnh nhân vẫn đặt chủ động được; ghi `no_candidate` với `reason='no_match'` |

---

## US-03 — Bệnh nhân nhận đề xuất

> **Là** bệnh nhân trong danh sách chờ, **tôi muốn** nhận được đề xuất khung giờ trống kèm hạn trả lời, **để** tôi biết mình có cơ hội khám sớm hơn và biết mình có bao lâu để quyết định.

**Ưu tiên:** Must · **BR:** BR-05, BR-08

| AC | Loại | Given | When | Then |
| --- | --- | --- | --- | --- |
| **AC-03.1** | Happy Path | Bệnh nhân P có một offer `sent` chưa quá hạn | P gọi `GET /api/my-offers` | `200` với đúng một offer, gồm tên bác sĩ, chức danh, chuyên khoa, phòng, ngày, `startTime`, `endTime`, `expiresAt`, `remainingSeconds` |
| **AC-03.2** | Exception | Cùng bối cảnh AC-03.1 | P gọi `GET /api/my-offers` | Response **không** chứa: `medicalPriority`, `queuePosition`, `totalWaiting`, `note`, lý do khám, chẩn đoán, thông tin bệnh nhân khác |
| **AC-03.3** | Alternative | P có entry `waiting` ở hai chuyên khoa; cả hai cùng có slot trống | Cả hai slot kích hoạt Offer Engine | P nhận **đúng một** offer. Slot còn lại được đề xuất cho người khác, hoặc ghi `no_candidate` |
| **AC-03.4** | Exception | P không có offer nào `sent` | P gọi `GET /api/my-offers` | `200` với **mảng rỗng**, **không** phải `404` |

---

## US-04 — Bệnh nhân chấp nhận đề xuất ⭐

> **Là** bệnh nhân nhận được đề xuất, **tôi muốn** chấp nhận và có ngay lịch hẹn, **để** tôi không phải đặt lại thủ công và không sợ mất chỗ.

**Ưu tiên:** Must · **BR:** BR-07, BR-08

| AC | Loại | Given | When | Then |
| --- | --- | --- | --- | --- |
| **AC-04.1** | Happy Path | P có offer O `sent` cho slot S; S vẫn `available`; chưa quá hạn | P gọi `POST /api/offers/:id/accept` | `201`. Trong **một transaction**: O → `accepted` kèm `appointment_id`; appointment mới `booked` với `type = offer.appointment_type`; S → `booked`; entry → `fulfilled`; ghi `offer_accepted` |
| **AC-04.2** | Exception | O `sent` cho S, nhưng S vừa bị người khác đặt chủ động | P gọi accept | `409 "Khung giờ đã được đặt"`; O → `cancelled`; entry quay lại `waiting` **không mất lượt**; **không** appointment nào được tạo |
| **AC-04.3** | Timeout | O có `expires_at` đã qua nhưng sweeper chưa kịp chạy | P gọi accept | `409 "Đề xuất đã hết hạn"`; O → `expired`; không tạo appointment |
| **AC-04.4** | Conflict | O đã ở trạng thái `accepted` | P bấm chấp nhận **lần thứ hai** | `409 "Đề xuất không còn hiệu lực"`; `appointments` chỉ có **một** dòng cho S |
| **AC-04.5** | Exception | O thuộc bệnh nhân P1 | Bệnh nhân **P2** gọi `POST /api/offers/<id-của-O>/accept` | `403 "Không đủ quyền"`; O không đổi trạng thái |
| **AC-04.6** | Conflict | Hai request gửi **đồng thời**: P accept offer cho S, và P2 đặt chủ động S | Chạy song song | **Đúng một** trả `201`, cái còn lại trả `409`. `appointments` có đúng **một** dòng hoạt động cho S. **Không** lỗi `500` |

---

## US-05 — Bệnh nhân từ chối đề xuất

> **Là** bệnh nhân nhận được đề xuất, **tôi muốn** từ chối, **để** khung giờ được chuyển ngay cho người khác thay vì chờ hết hạn.

**Ưu tiên:** Should · **BR:** BR-06, BR-08

| AC | Loại | Given | When | Then |
| --- | --- | --- | --- | --- |
| **AC-05.1** | Happy Path | O `sent` của P cho slot S; còn ứng viên kế tiếp E-next | P gọi `POST /api/offers/:id/decline` | `200`. O → `declined`; entry của P quay lại `waiting`; ghi `offer_declined`; **trong ≤ 5 giây** một offer mới `sent` cho E-next |
| **AC-05.2** | Alternative | O `sent`; không còn ứng viên nào khác | P từ chối | O → `declined`; S giữ `available`; ghi `no_candidate` |
| **AC-05.3** | Exception | O đã `expired` | P gọi decline | `409 "Đề xuất không còn hiệu lực"` |
| **AC-05.4** | Exception | O thuộc P1 | P2 gọi decline | `403 "Không đủ quyền"` |

---

## US-06 — Hệ thống xử lý hết hạn và chuyển tiếp ⭐

> **Là** hệ thống, **tôi muốn** tự đánh dấu hết hạn các đề xuất quá thời gian và chuyển sang bệnh nhân kế tiếp, **để** một người không phản hồi không làm kẹt cả khung giờ.

**Ưu tiên:** **Must** · **BR:** BR-05, BR-06

> *Vì sao Must chứ không phải Should:* trong vận hành thật, **hết hạn là nhánh xảy ra nhiều nhất**, không phải nhánh phụ — phần lớn bệnh nhân sẽ không mở app trong 15 phút, đặc biệt khi không có kênh thông báo ngoài app. Bỏ US-06 nghĩa là mỗi slot kẹt vĩnh viễn ở người đầu tiên, và hệ thống rơi về đúng trạng thái hiện tại.

| AC | Loại | Given | When | Then |
| --- | --- | --- | --- | --- |
| **AC-06.1** | Timeout | O `sent`, `expires_at = now - 1 giây`; còn ứng viên E-next; S vẫn `available` | Sweeper chạy | Trong **≤ 60 giây** kể từ `expires_at`: O → `expired`; entry quay lại `waiting`; offer mới `sent` cho E-next; ghi `offer_expired` rồi `offer_sent` |
| **AC-06.2** | Alternative | O quá hạn; không còn ứng viên | Sweeper chạy | O → `expired`; S giữ `available`; ghi `offer_expired` + `no_candidate` |
| **AC-06.3** | Exception | O quá hạn; nhưng S đã `booked` do người khác đặt chủ động | Sweeper chạy | O → `expired`; **không** tạo offer mới cho S |
| **AC-06.4** | Timeout | S bắt đầu sau **10 phút**; `OFFER_RESPONSE_TIMEOUT_MINUTES = 15` | Offer được tạo | `expires_at = min(now + 15 phút, giờ bắt đầu slot)` = giờ bắt đầu slot |
| **AC-06.5** | Conflict | Sweeper chu kỳ trước chưa xong, chu kỳ sau tới hạn | Hai lượt quét chồng nhau | Mỗi offer chỉ được xử lý **một lần**; không offer nào bị đánh dấu `expired` hai lần; không sinh hai offer kế tiếp cho cùng slot |

---

## US-07 — Staff quản trị danh sách chờ và xem nhật ký

> **Là** nhân viên điều phối, **tôi muốn** xem toàn bộ danh sách chờ, trạng thái các đề xuất đang diễn ra và nhật ký đã gửi, **để** tôi biết khung giờ nào đang được xử lý, không gọi điện chồng chéo, và trả lời được khi bệnh nhân thắc mắc.

**Ưu tiên:** Must · **BR:** BR-08

| AC | Loại | Given | When | Then |
| --- | --- | --- | --- | --- |
| **AC-07.1** | Happy Path | Có 5 entry ở các trạng thái khác nhau | Staff gọi `GET /api/waiting-list` | `200` với danh sách kèm: tên bệnh nhân, SĐT, bác sĩ/chuyên khoa, mức ưu tiên, trạng thái, thời điểm vào danh sách, `pendingOffer` (hoặc `null`) |
| **AC-07.2** | Alternative | Cùng bối cảnh | Staff gọi `GET /api/waiting-list?status=waiting` | Chỉ trả entry `status='waiting'` |
| **AC-07.3** | Happy Path | Entry E ở `waiting` | Staff gọi `DELETE /api/waiting-list/:id` | `200`; E → `cancelled`; ghi `entry_cancelled` |
| **AC-07.4** | Exception | Entry E ở `offered`, offer O đang `sent` | Staff hủy E | `200`; E → `cancelled`; **O cũng → `cancelled`**; hệ thống tìm ứng viên kế tiếp cho slot |
| **AC-07.5** | Happy Path | Một chuỗi đã diễn ra: gửi → hết hạn → gửi lại → chấp nhận | Staff gọi `GET /api/offer-events?slotId=<S>` | `200` với **4 dòng** theo thứ tự thời gian: `offer_sent`, `offer_expired`, `offer_sent`, `offer_accepted`; mỗi dòng có `occurredAt`, `actor`, trạng thái trước/sau |
| **AC-07.6** | Exception | Bệnh nhân P đã đăng nhập | P gọi `GET /api/waiting-list` hoặc `POST /api/waiting-list` hoặc `GET /api/offer-events` | `403 "Không đủ quyền"` |

---

## Bảng phủ tình huống

| Loại tình huống | AC phủ |
| --- | --- |
| **Happy Path** | AC-01.1, AC-02.1, AC-02.5, AC-03.1, AC-04.1, AC-05.1, AC-06.1, AC-07.1, AC-07.3, AC-07.5 |
| **Alternative** | AC-01.2, AC-02.2, AC-02.3, AC-02.6, AC-02.8, AC-03.3, AC-05.2, AC-06.2, AC-07.2 |
| **Exception** | AC-01.3, AC-01.4, AC-02.4, AC-02.9, AC-02.10, AC-02.11, AC-03.2, AC-03.4, AC-04.2, AC-04.5, AC-05.3, AC-05.4, AC-06.3, AC-07.4, AC-07.6 |
| **Timeout** | AC-04.3, AC-06.1, AC-06.4 |
| **Conflict** | AC-01.5, AC-04.4, AC-04.6, AC-06.5 |
| Bệnh nhân **từ chối** | AC-05.1, AC-05.2 |
| Bệnh nhân **không phản hồi** trong thời gian quy định | AC-06.1, AC-06.2, AC-06.3 |
| **Khung giờ không còn khả dụng** | AC-04.2, AC-06.3, AC-07.4 |
| **Dữ liệu không hợp lệ** | AC-01.3, AC-01.4 |
| **Quyền riêng tư / phân quyền** | AC-03.2, AC-04.5, AC-05.4, AC-07.6 |

---

---

[← Frozen Business Rules (BR-01 → BR-08)](02-frozen-business-rules.md) · [Mục lục](README.md) · [Data Model →](04-data-model.md)
