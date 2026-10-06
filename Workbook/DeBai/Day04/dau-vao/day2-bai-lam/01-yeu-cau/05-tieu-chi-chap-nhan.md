# 01 · 05 — Tiêu chí chấp nhận (Given – When – Then)

> **Mã:** WB2-01-05 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human] · **Cổng:** CP-03
> **Nguồn:** `04-user-story.md`, `03-quy-tac-nghiep-vu.md` · **Bước WB-1:** WF-04

**Nguyên tắc (NT-08):** mỗi AC **quan sát và kiểm thử được**; không AC nào dùng từ "nhanh", "phù hợp", "hợp lý" mà không có con số; **mỗi AC trỏ ít nhất một BR**; không AC nào phụ thuộc câu `Open`.

**Cách đọc:** AC mô tả hành vi mà người dùng và hệ thống **quan sát được** — trạng thái, thông báo hiển thị, thời gian. Ánh xạ sang endpoint, mã HTTP và bảng dữ liệu nằm ở `02-thiet-ke/05-api-va-su-kien.md` và `08-truy-vet.md`, không ở đây (NT-04).

Phạm vi: đầy đủ cho ba story ưu tiên cao nhất (**US-02, US-04, US-06**) và mức cần thiết cho các story còn lại. ⭐ = ưu tiên cao nhất.

---

## US-01 — Staff thêm bệnh nhân vào danh sách chờ

| AC | Loại | Given | When | Then | BR |
| --- | --- | --- | --- | --- | --- |
| **AC-01.1** | Happy path | Staff đã đăng nhập; bệnh nhân P và bác sĩ D tồn tại | Staff thêm P vào danh sách chờ với bác sĩ D, mức ưu tiên `high` | Đăng ký được tạo ở trạng thái *chờ*, ghi nhận thời điểm hiện tại; một sự kiện "đăng ký chờ được tạo" được ghi vào nhật ký | BR-13, BR-15 |
| **AC-01.2** | Alternative | Staff đã đăng nhập; chuyên khoa S tồn tại | Staff thêm bệnh nhân với chuyên khoa S, **không** chọn bác sĩ | Đăng ký được tạo; khớp slot của mọi bác sĩ thuộc S | BR-03 |
| **AC-01.3** | Exception — thiếu dữ liệu | Staff đã đăng nhập | Staff thêm bệnh nhân **không** chọn cả bác sĩ lẫn chuyên khoa | Bị từ chối do dữ liệu không hợp lệ: **"Cần chọn bác sĩ hoặc chuyên khoa"**; không có đăng ký nào được tạo | BR-03 |
| **AC-01.4** | Exception — giá trị sai | Staff đã đăng nhập | Staff thêm bệnh nhân với mức ưu tiên ngoài `urgent` / `high` / `normal` | Bị từ chối do dữ liệu không hợp lệ: **"Mức ưu tiên không hợp lệ"** | BR-02 |
| **AC-01.5** | Exception — trùng | Bệnh nhân P đã có đăng ký chờ đang hoạt động cho đúng bác sĩ D | Staff thêm lại P cho D | Bị từ chối do xung đột: **"Bệnh nhân đã có trong danh sách chờ"** | BR-13 |

---

## US-02 — Hệ thống phát hiện slot khả dụng và chọn ứng viên ⭐

### Nhánh kích hoạt

| AC | Loại | Given | When | Then | BR |
| --- | --- | --- | --- | --- | --- |
| **AC-02.1** | Happy path | Slot S của bác sĩ D bắt đầu sau 2 giờ, đang được đặt bởi lịch hẹn A; có đúng một đăng ký chờ khớp D | Bệnh nhân hủy A | Trong **≤ 5 giây**: S còn trống; một đề xuất được gửi cho bệnh nhân của đăng ký đó, hạn = lúc gửi + 15 phút; nhật ký có sự kiện "đề xuất được gửi" | BR-01, BR-06, BR-15 |
| **AC-02.2** | Alternative | S đang ở trạng thái đã đặt do staff chặn giờ, **không** có lịch hẹn; có đăng ký khớp | Staff mở lại S | S còn trống và một đề xuất được gửi | BR-01 |
| **AC-02.3** | Alternative — không kích hoạt | Có nhiều đăng ký chờ khớp bác sĩ D | Staff tạo slot **mới** cho D | Slot được tạo còn trống; **không** đề xuất nào được gửi; **không** sự kiện nhật ký nào | BR-01 |
| **AC-02.4** | Exception — quá sát giờ | S bắt đầu sau **20 phút** (< 30); có đăng ký khớp | Lịch hẹn của S bị hủy | S còn trống; **không** đề xuất nào được gửi; nhật ký ghi "hết ứng viên", lý do *quá sát giờ* | BR-16, BR-08 |

### Nhánh chọn ứng viên

| AC | Loại | Given | When | Then | BR |
| --- | --- | --- | --- | --- | --- |
| **AC-02.5** | Happy path — ưu tiên y tế thắng thời gian chờ | Ba đăng ký khớp S: E1 (`normal`, vào lúc 08:00), E2 (`urgent`, 10:00), E3 (`high`, 09:00) | S trở nên khả dụng | Đề xuất gửi cho **E2**, không phải E1 dù E1 chờ lâu nhất | BR-02 |
| **AC-02.6** | Alternative — phá hòa bằng thời gian | Hai đăng ký cùng `high`: E4 vào lúc 09:00, E5 vào lúc 09:30 | S trở nên khả dụng | Đề xuất gửi cho **E4** | BR-02 |
| **AC-02.7** | Alternative — phá hòa bằng thứ tự tạo | Hai đăng ký cùng `high`, cùng thời điểm đăng ký chính xác đến mili giây; E6 tạo trước E7 | S trở nên khả dụng | Đề xuất gửi cho **E6**. Lặp lại kịch bản **10 lần** cho kết quả **giống hệt** | BR-02 |
| **AC-02.8** | Alternative — lọc theo chuyên khoa | S của bác sĩ D thuộc Tim mạch. E8 chờ Da liễu (`urgent`); E9 chờ Tim mạch (`normal`) | S trở nên khả dụng | Đề xuất gửi cho **E9**; E8 không được xét | BR-03 (b) |
| **AC-02.9** | Exception — bệnh nhân đã bận giờ đó | E10 là ứng viên duy nhất, nhưng bệnh nhân của E10 đã có lịch hẹn đã xác nhận trùng ngày và giao giờ với S | S trở nên khả dụng | **Không** đề xuất nào được gửi; nhật ký ghi "hết ứng viên" | BR-03 (d) |
| **AC-02.10** | Exception — đã từ chối slot này | E11 từng nhận đề xuất cho đúng S và đã từ chối | S lại trở nên khả dụng | E11 **không** được xét lại cho S | BR-03 (f) |
| **AC-02.11** | Exception — hết ứng viên | Không đăng ký nào thỏa BR-03 | S trở nên khả dụng | S còn trống, bệnh nhân vẫn đặt chủ động được; nhật ký ghi "hết ứng viên", lý do *không khớp* | BR-08 |

---

## US-03 — Bệnh nhân nhận đề xuất

| AC | Loại | Given | When | Then | BR |
| --- | --- | --- | --- | --- | --- |
| **AC-03.1** | Happy path | Bệnh nhân P có một đề xuất chưa quá hạn | P xem đề xuất của mình | Thấy đúng một đề xuất gồm: tên bác sĩ, chức danh, chuyên khoa, phòng, ngày, giờ bắt đầu, giờ kết thúc, hạn trả lời, số giây còn lại | BR-06, BR-11 |
| **AC-03.2** | Exception — quyền riêng tư | Như AC-03.1 | P xem đề xuất của mình | Nội dung hiển thị **không chứa**: lý do khám, chẩn đoán, mức ưu tiên y tế, thông tin bệnh nhân khác, số người đang chờ, vị trí hàng đợi | BR-11, BR-12 |
| **AC-03.3** | Alternative — một đề xuất duy nhất | Bệnh nhân P chờ ở hai chuyên khoa; cả hai cùng vừa có slot trống | Cả hai slot cùng kích hoạt | P nhận **đúng một** đề xuất. Slot còn lại được đề xuất cho người khác, hoặc ghi "hết ứng viên" nếu không còn ai | BR-05 |
| **AC-03.4** | Exception — không có đề xuất | P không có đề xuất nào đang chờ | P xem đề xuất của mình | Thấy danh sách **rỗng**, không phải lỗi "không tìm thấy" | BR-11 |

---

## US-04 — Bệnh nhân chấp nhận đề xuất ⭐

| AC | Loại | Given | When | Then | BR |
| --- | --- | --- | --- | --- | --- |
| **AC-04.1** | Happy path | P có đề xuất O cho slot S; S còn trống; O chưa quá hạn | P chấp nhận O | **Cùng lúc**: O → *đã chấp nhận*; lịch hẹn mới *đã đặt* với hình thức khám của đăng ký chờ; S → *đã đặt*; đăng ký → *hoàn tất*; nhật ký ghi sự kiện | BR-09 |
| **AC-04.2** | Exception — slot đã bị người khác chiếm | O cho S, nhưng S vừa được bệnh nhân khác đặt chủ động | P chấp nhận O | Bị từ chối do xung đột: **"Khung giờ đã được đặt"**; O → *bị hủy*; đăng ký quay lại chờ **không mất lượt**; **không** lịch hẹn nào được tạo | BR-09, BR-10 |
| **AC-04.3** | Exception — đề xuất đã hết hạn | O quá hạn nhưng tiến trình xử lý hết hạn chưa kịp chạy | P chấp nhận O | Bị từ chối do xung đột: **"Đề xuất đã hết hạn"**; O → *hết hạn*; không tạo lịch hẹn | BR-06, BR-09 |
| **AC-04.4** | Exception — bấm hai lần | O đã ở *đã chấp nhận* | P bấm chấp nhận lần thứ hai | Bị từ chối do xung đột: **"Đề xuất không còn hiệu lực"**; **không** tạo lịch hẹn thứ hai — slot S chỉ có **một** lịch hẹn đang hoạt động | BR-09 |
| **AC-04.5** | Exception — không phải đề xuất của mình | O thuộc bệnh nhân P1 | Bệnh nhân P2 cố chấp nhận O | Bị từ chối do không đủ quyền: **"Không đủ quyền"**; O không đổi trạng thái | BR-14 |
| **AC-04.6** | Conflict — hai bên cùng lấy một slot | Bệnh nhân P-a chấp nhận đề xuất cho S; **cùng lúc** bệnh nhân P-b đặt chủ động S | Hai yêu cầu chạy song song | **Đúng một** thành công, bên còn lại nhận **"Khung giờ đã được đặt"**. S có đúng **một** lịch hẹn đang hoạt động. Không lỗi hệ thống | BR-09 |

---

## US-05 — Bệnh nhân từ chối đề xuất

| AC | Loại | Given | When | Then | BR |
| --- | --- | --- | --- | --- | --- |
| **AC-05.1** | Happy path | O của P cho S; còn ứng viên kế tiếp E-next | P từ chối O | O → *bị từ chối*; đăng ký của P quay lại chờ; nhật ký ghi sự kiện; **trong ≤ 5 giây** một đề xuất mới được gửi cho E-next; tại mọi thời điểm S chỉ có **một** đề xuất đang chờ | BR-07, BR-04 |
| **AC-05.2** | Alternative — không còn ai | O đang chờ; không còn ứng viên | P từ chối | O → *bị từ chối*; S còn trống; nhật ký ghi "hết ứng viên" | BR-08 |
| **AC-05.3** | Exception — đề xuất đã kết thúc | O đã hết hạn | P từ chối O | Bị từ chối do xung đột: **"Đề xuất không còn hiệu lực"** | BR-07 |
| **AC-05.4** | Exception — không phải của mình | O thuộc P1 | P2 từ chối O | Bị từ chối do không đủ quyền: **"Không đủ quyền"** | BR-14 |

---

## US-06 — Hệ thống xử lý hết hạn ⭐

| AC | Loại | Given | When | Then | BR |
| --- | --- | --- | --- | --- | --- |
| **AC-06.1** | Happy path — hết hạn | O đang chờ đã quá hạn 1 giây; còn ứng viên E-next; S còn trống | Hệ thống xử lý hết hạn | Trong **≤ 60 giây** kể từ lúc hết hạn: O → *hết hạn*; đăng ký của bệnh nhân quay lại chờ; đề xuất mới gửi cho E-next; nhật ký ghi "hết hạn" rồi "đã gửi" | BR-06, BR-07 |
| **AC-06.2** | Alternative — hết ứng viên sau hết hạn | O quá hạn; không còn ứng viên | Hệ thống xử lý hết hạn | O → *hết hạn*; S còn trống; nhật ký ghi "hết hạn" và "hết ứng viên" | BR-08 |
| **AC-06.3** | Alternative — slot đã bị chiếm trong lúc chờ | O quá hạn; S đã được bệnh nhân khác đặt chủ động mà O **chưa** bị hủy (ví dụ bước hủy khi slot bị chiếm đã lỗi hoặc chưa kịp chạy — lớp phòng thủ thứ hai của BR-10) | Hệ thống xử lý hết hạn | O → *hết hạn*; **không** đề xuất mới nào cho S | BR-07, BR-10 |
| **AC-06.4** | Alternative — hạn bị cắt theo giờ slot | S bắt đầu sau **10 phút**; hạn mặc định 15 phút *(chỉ xảy ra nếu BR-16 cho phép)* | Đề xuất được gửi | Hạn = **giờ bắt đầu của S**, không phải +15 phút | BR-06 |
| **AC-06.5** | Exception — hai lượt xử lý chồng nhau | Lượt xử lý trước chưa xong, lượt sau tới hạn | Hai lượt cùng thấy một đề xuất quá hạn | Mỗi đề xuất chỉ được xử lý **một lần**; không đề xuất nào bị đánh dấu hết hạn hai lần; không sinh hai đề xuất kế tiếp cho cùng một slot | BR-04 |

---

## US-07 / US-08 — Staff quản trị danh sách chờ

| AC | Loại | Given | When | Then | BR |
| --- | --- | --- | --- | --- | --- |
| **AC-07.1** | Happy path | Có 5 đăng ký ở các trạng thái khác nhau | Staff xem danh sách chờ | Thấy: tên và số điện thoại bệnh nhân, bác sĩ hoặc chuyên khoa mong muốn, mức ưu tiên, trạng thái, thời điểm vào danh sách, đề xuất đang chờ (nếu có) | BR-13 |
| **AC-07.2** | Alternative — lọc | Cùng bối cảnh | Staff lọc theo trạng thái *chờ* | Chỉ thấy đăng ký đang chờ | BR-13 |
| **AC-08.1** | Happy path | Đăng ký E đang chờ | Staff hủy E | E → *bị hủy*; nhật ký ghi sự kiện | BR-13, BR-15 |
| **AC-08.2** | Exception — đăng ký đang giữ đề xuất | E đang giữ đề xuất O | Staff hủy E | E → *bị hủy*; **O cũng → *bị hủy***; hệ thống tìm ứng viên kế tiếp cho slot | BR-07, BR-10 |
| **AC-08.3** | Exception — phân quyền xem | Bệnh nhân P đã đăng nhập | P cố xem toàn bộ danh sách chờ | Bị từ chối do không đủ quyền | BR-13 |
| **AC-08.4** | Exception — phân quyền tạo | Bệnh nhân P đã đăng nhập | P cố thêm người vào danh sách chờ | Bị từ chối do không đủ quyền | BR-13 |

---

## US-11 — Staff xem nhật ký

| AC | Loại | Given | When | Then | BR |
| --- | --- | --- | --- | --- | --- |
| **AC-09.1** | Happy path | Chuỗi đã diễn ra: gửi → hết hạn → gửi lại → chấp nhận | Staff xem nhật ký của slot | Thấy **4 dòng** theo thứ tự thời gian: đã gửi, hết hạn, đã gửi, đã chấp nhận; mỗi dòng có thời điểm, tác nhân, trạng thái trước và sau | BR-15 |
| **AC-09.2** | Exception — phân quyền | Bệnh nhân P đã đăng nhập | P cố xem nhật ký | Bị từ chối do không đủ quyền | BR-13 |

---

## Bảng phủ — các loại tình huống WB-2 yêu cầu

| Tình huống bắt buộc (WB-2 Bước 4) | AC phủ |
| --- | --- |
| Happy path | AC-01.1, 02.1, 03.1, 04.1, 05.1, 06.1, 07.1, 08.1, 09.1 |
| Alternative flow | AC-01.2, 02.2, 02.3, 02.6, 02.7, 02.8, 03.3, 05.2, 06.2, 06.3, 06.4, 07.2 |
| Exception | AC-01.3, 01.4, 01.5, 03.4, 04.3, 05.3, 08.3 |
| **Bệnh nhân từ chối** | AC-05.1, 05.2 |
| **Bệnh nhân không phản hồi trong thời gian quy định** | AC-06.1, 06.2, 06.3 |
| **Khung giờ không còn khả dụng** | AC-04.2, 06.3, 08.2 |
| **Dữ liệu không hợp lệ** | AC-01.3, 01.4 |
| Xung đột / đồng thời | AC-04.4, 04.6, 06.5 |
| Quyền riêng tư | AC-03.2 |
| Phân quyền | AC-04.5, 05.4, 08.3, 08.4, 09.2 |

**Tổng: 43 AC.** Không AC nào phụ thuộc một câu `Open`. Số đo trong AC (≤ 5 giây, ≤ 60 giây, 15 phút, 30 phút) là `[ĐỀ XUẤT]` theo Q-04, Q-11 và S1, S2 — nếu stakeholder đổi, sửa BR trước rồi sửa AC (NT-05).
