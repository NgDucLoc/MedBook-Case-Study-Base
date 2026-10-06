# 01 · 03 — Quy tắc nghiệp vụ

> **Mã:** WB2-01-03 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human] · **Cổng:** CP-02
> **Nguồn:** `02-lam-ro.md` (Q-xx), `01-boi-canh-nghiep-vu.md`, `de-bai/WB-2.docx` · **Bước WB-1:** WF-03

> **Đây là file quan trọng nhất của phần yêu cầu.** Mọi AC, mọi thành phần thiết kế, mọi test đều trỏ về đây bằng mã `BR-xx`.
>
> **AI không được tạo thêm quy tắc.** Cần một luật không có ở đây ⇒ dừng, ghi `[CẦN XÁC NHẬN]`, hỏi Human (NT-02, NT-03).
>
> **File này chỉ nói "cái gì và vì sao"** — không có tên bảng, hàm, thư viện, đường dẫn API (NT-04). Cách hiện thực nằm ở `02-thiet-ke/`.

Mỗi quy tắc gồm: phát biểu · nguồn quyết định (kèm trạng thái) · thành phần chịu trách nhiệm · cách kiểm chứng. Vì hầu hết câu trả lời nguồn đang ở trạng thái `Đề xuất`, **mọi BR hiện ở trạng thái chờ duyệt**; BR-02 có nguồn `Case`.

**Tham số cấu hình** (giá trị mặc định là `[ĐỀ XUẤT]`; tên biến môi trường ở `02-thiet-ke/05-api-va-su-kien.md` §7):

| Tham số | Mặc định | BR |
| --- | :---: | --- |
| Hạn trả lời của đề xuất | 15 phút | BR-06 |
| Thời gian tối thiểu trước giờ khám | 30 phút | BR-16 |

---

## Nhóm A — Kích hoạt

### BR-01 — Khi nào hệ thống bắt đầu tìm người cho một slot

Hệ thống bắt đầu tìm ứng viên cho một slot **khi và chỉ khi** slot đó chuyển từ *đã đặt* sang *còn trống* **và** thỏa BR-16.

| Sự kiện | Bắt đầu tìm người? |
| --- | :---: |
| Bệnh nhân hoặc staff hủy lịch hẹn ⇒ slot còn trống | ✅ Có |
| Staff mở lại slot (đổi sang còn trống) | ✅ Có |
| Staff tạo slot **mới** | ❌ **Không** |
| Nạp dữ liệu mẫu khi khởi động | ❌ **Không** |

> **Vì sao slot mới không kích hoạt:** slot mới là mở rộng lịch làm việc bình thường, bệnh nhân tự đặt được. Danh sách chờ sinh ra để giải quyết slot **bị trống đột ngột**. Nếu tính slot mới, mỗi lần staff thêm lịch sẽ thành một loạt đề xuất.

- **Nguồn:** Business Problem Canvas (phạm vi) · `Đề xuất`
- **Chịu trách nhiệm:** CMP-03 · **Kiểm chứng:** AC-02.1, AC-02.2, AC-02.3

### BR-16 — Thời gian tối thiểu trước giờ khám

Không gửi đề xuất cho slot mà giờ bắt đầu cách hiện tại **dưới 30 phút**, hoặc đã qua giờ. Trường hợp này ghi nhận là "hết ứng viên" với lý do *quá sát giờ* (BR-08).

- **Nguồn:** Q-11 · `Đề xuất` — bệnh viện cần xác nhận theo thực tế di chuyển
- **Chịu trách nhiệm:** CMP-03 · **Kiểm chứng:** AC-02.4

---

## Nhóm B — Chọn ứng viên

### BR-02 — Thứ tự ưu tiên *(luật cốt lõi)*

Trong các ứng viên đủ điều kiện (BR-03), chọn **đúng một** theo thứ tự:

1. **Mức ưu tiên y tế** giảm dần: `urgent` → `high` → `normal`.
2. **Thời gian đăng ký chờ** tăng dần — vào danh sách trước thì được trước.
3. **Thứ tự tạo đăng ký** tăng dần — để phá hòa xác định.

> **Ba điều tuyệt đối không được làm:** không ngẫu nhiên · không FIFO thuần (bỏ qua mức ưu tiên y tế) · không tự thêm tiêu chí như khoảng cách địa lý hay số lần từ chối trước đó.

- **Nguồn:** Q-01 · **`Case`** (ví dụ của đề bài WB-2); Q-02 · `Đề xuất` (phần phá hòa)
- **Chịu trách nhiệm:** CMP-03 (quyết định), CMP-01 (thực thi) · **Kiểm chứng:** AC-01.4, AC-02.5, AC-02.6, AC-02.7

### BR-03 — Điều kiện để một đăng ký là ứng viên của slot S

Đăng ký chờ E là ứng viên của slot S khi **tất cả** điều kiện sau đúng:

| # | Điều kiện |
| --- | --- |
| a | E đang ở trạng thái chờ |
| b | E chờ **đúng bác sĩ** giữ S, **hoặc** E chờ theo chuyên khoa và bác sĩ giữ S thuộc chuyên khoa đó |
| c | Bệnh nhân của E hiện **không** giữ đề xuất nào đang chờ (hệ quả của BR-05) |
| d | Bệnh nhân của E **không** có lịch hẹn đang hoạt động **trùng ngày và giao nhau về khoảng giờ** với S |
| e | S nằm trong khoảng ngày mong muốn của E (nếu E có nêu) |
| f | Chưa từng có đề xuất cho cặp (E, S) bị từ chối hoặc hết hạn — không mời lại người vừa từ chối chính slot đó |

Điều kiện (f) còn là cơ sở bảo đảm **chuỗi đề xuất chắc chắn kết thúc**: tập ứng viên hữu hạn và giảm dần.

- **Nguồn:** Q-03 (b), Q-06 (c), Q-09 (d) · `Đề xuất`; (e), (f) do AI đề xuất bổ sung — **cần Human xác nhận** `[CẦN XÁC NHẬN]`
- **Chịu trách nhiệm:** CMP-03, CMP-01 · **Kiểm chứng:** AC-01.2, AC-01.3, AC-02.8, AC-02.9, AC-02.10

### BR-08 — Khi hết ứng viên

Nếu không có ứng viên nào thỏa BR-03 (hoặc slot không thỏa BR-16), hệ thống **không làm gì với slot**: slot vẫn còn trống và bệnh nhân vẫn đặt chủ động được. Hệ thống ghi nhận sự kiện *hết ứng viên* kèm lý do (không khớp / quá sát giờ / tất cả đã từ chối) để staff truy vết.

- **Nguồn:** Q-16 · `Đề xuất`
- **Chịu trách nhiệm:** CMP-03 · **Kiểm chứng:** AC-02.4, AC-02.11, AC-05.2, AC-06.2

---

## Nhóm C — Vòng đời đề xuất

### BR-04 — Mỗi slot chỉ có một đề xuất đang chờ

Tại mọi thời điểm, mỗi slot có **tối đa một** đề xuất đang chờ phản hồi. Gửi **tuần tự**, không song song.

- **Nguồn:** Q-05 · `Đề xuất` — Ban giám đốc chọn tuần tự để tránh "hứa rồi rút lại"
- **Chịu trách nhiệm:** CMP-03, ENT-02 · **Kiểm chứng:** AC-05.1, AC-06.5

### BR-05 — Mỗi bệnh nhân chỉ giữ một đề xuất đang chờ

Tại mọi thời điểm, mỗi bệnh nhân có **tối đa một** đề xuất đang chờ, tính trên toàn hệ thống, không phân biệt chuyên khoa.

- **Nguồn:** Q-06 · `Đề xuất`
- **Chịu trách nhiệm:** CMP-03, ENT-02 · **Kiểm chứng:** AC-03.3

### BR-06 — Hạn trả lời

Đề xuất hết hạn sau **15 phút** kể từ lúc gửi. Nếu thời điểm đó vượt quá giờ bắt đầu slot thì hạn là **giờ bắt đầu slot**. Hạn tính theo thời điểm tuyệt đối, không theo ngày và giờ tách rời như slot.

- **Nguồn:** Q-04 · `Đề xuất`; phần cắt hạn theo giờ slot phát sinh từ R-02
- **Chịu trách nhiệm:** CMP-03 · **Kiểm chứng:** AC-02.1, AC-03.1, AC-04.3, AC-06.1, AC-06.4

### BR-07 — Chuyển tiếp tự động

Khi một đề xuất kết thúc vì bị từ chối hoặc hết hạn, hệ thống **tự động** tìm ứng viên kế tiếp cho cùng slot theo BR-02 + BR-03 và gửi đề xuất mới, miễn là slot vẫn còn trống và vẫn thỏa BR-16. Lặp cho tới khi có người chấp nhận hoặc hết ứng viên (BR-08).

Với đề xuất hết hạn, việc chuyển tiếp phải xảy ra trong **≤ 60 giây** sau khi hết hạn (S2).

- **Nguồn:** Business Problem Canvas (phạm vi) · `Đề xuất`
- **Chịu trách nhiệm:** CMP-03, CMP-04 · **Kiểm chứng:** AC-05.1, AC-05.3, AC-06.1, AC-06.3, AC-08.2

### BR-09 — Hiệu lực của việc chấp nhận

Khi bệnh nhân chấp nhận đề xuất, các kết quả sau xảy ra **cùng nhau hoặc không cái nào xảy ra**:

1. Lịch hẹn mới được tạo ở trạng thái *đã đặt*, với hình thức khám lấy từ đăng ký chờ.
2. Slot chuyển sang *đã đặt*.
3. Đăng ký chờ chuyển sang *hoàn tất*.
4. Đề xuất chuyển sang *đã chấp nhận*.
5. Sự kiện được ghi nhận (BR-15).

Việc chấp nhận bị từ chối nếu: slot không còn trống · đề xuất đã hết hạn · đề xuất không còn hiệu lực (đã chấp nhận, từ chối, hủy). **Ba lý do này phải phân biệt được với người dùng**, vì mỗi lý do dẫn tới hành động khác nhau. Bấm chấp nhận lần hai **không** tạo lịch hẹn thứ hai.

- **Nguồn:** ràng buộc chống đặt trùng của hệ thống hiện có (K-04) · Q-05
- **Chịu trách nhiệm:** CMP-03 · **Kiểm chứng:** AC-04.1, AC-04.2, AC-04.3, AC-04.4, AC-04.6

### BR-10 — Slot không còn khả dụng khi đang có đề xuất chờ

Nếu slot bị chuyển sang *đã đặt* bằng bất kỳ đường nào (staff chặn giờ, hoặc bệnh nhân khác đặt chủ động) trong lúc có đề xuất đang chờ cho slot đó:

- Đề xuất bị **hủy**;
- Đăng ký chờ **quay lại chờ và không mất lượt** — thời gian chờ giữ nguyên, nên vị trí ưu tiên không đổi;
- Bệnh nhân thấy thông báo **"Khung giờ không còn khả dụng"**.

- **Nguồn:** Q-08 · `Đề xuất`
- **Chịu trách nhiệm:** CMP-03 · **Kiểm chứng:** AC-04.2, AC-06.3, AC-08.2

---

## Nhóm D — Quyền riêng tư, phân quyền, truy vết

### BR-11 — Nội dung đề xuất

Đề xuất hiển thị cho bệnh nhân **chỉ được** chứa: tên bác sĩ, chức danh, chuyên khoa, phòng khám, ngày, giờ bắt đầu, giờ kết thúc, hạn trả lời.

**Cấm** hiển thị hoặc lưu trong nội dung đề xuất: lý do khám, chẩn đoán, mức ưu tiên y tế của bất kỳ ai, thông tin bệnh nhân khác, số người đang chờ.

- **Nguồn:** Q-10 · `Đề xuất`; ràng buộc C7
- **Chịu trách nhiệm:** CMP-02, CMP-06 · **Kiểm chứng:** AC-03.1, AC-03.2, AC-03.4

### BR-12 — Không lộ vị trí hàng đợi

Bệnh nhân **không** thấy thứ tự của mình, tổng số người chờ, hay mức ưu tiên của mình. Chỉ thấy **"Đang trong danh sách chờ"**.

- **Nguồn:** Q-14 · `Đề xuất`
- **Chịu trách nhiệm:** CMP-02, CMP-06 · **Kiểm chứng:** AC-03.2

### BR-13 — Quyền trên danh sách chờ

| Hành động | Bệnh nhân | Staff |
| --- | :---: | :---: |
| Thêm bệnh nhân vào danh sách chờ | ❌ | ✅ |
| Sửa mức ưu tiên y tế | ❌ | ✅ |
| Hủy một đăng ký chờ | ❌ | ✅ |
| Xem toàn bộ danh sách chờ | ❌ | ✅ |
| Xem đăng ký chờ | ✅ chỉ của mình (không kèm mức ưu tiên, BR-12) | ✅ tất cả |
| Xem đề xuất | ✅ chỉ của mình (nội dung theo BR-11) | ✅ tất cả, để theo dõi |
| Chấp nhận hoặc từ chối đề xuất | ✅ chỉ của mình (BR-14) | ❌ |
| Xem nhật ký đề xuất | ❌ | ✅ |

- **Nguồn:** Q-12 · `Đề xuất`
- **Chịu trách nhiệm:** CMP-05 · **Kiểm chứng:** AC-01.1, AC-01.5, AC-07.1, AC-07.2, AC-08.1, AC-08.3, AC-08.4, AC-09.2

### BR-14 — Chỉ chủ của đề xuất mới được phản hồi

Chỉ **chính bệnh nhân nhận đề xuất** mới được chấp nhận hoặc từ chối nó. Kiểm tra này phải dựa trên **chủ sở hữu của đề xuất**, không chỉ dựa vào vai trò "bệnh nhân". Vi phạm ⇒ từ chối với lý do không đủ quyền.

> **Vì sao là luật nghiệp vụ, không phải chi tiết kỹ thuật:** cơ chế đăng nhập của bản demo giả mạo được (K-02); nếu chỉ kiểm vai trò, bất kỳ bệnh nhân nào cũng chấp nhận được đề xuất của người khác.

- **Nguồn:** ràng buộc C8, K-02
- **Chịu trách nhiệm:** CMP-03 · **Kiểm chứng:** AC-04.5, AC-05.4

### BR-15 — Nhật ký sự kiện

**Mọi** chuyển trạng thái của đề xuất và của đăng ký chờ phải được ghi nhật ký: thời điểm, loại sự kiện, đề xuất / slot / bệnh nhân liên quan, trạng thái trước và sau, tác nhân (bệnh nhân / staff / hệ thống). Nhật ký **chỉ thêm**, không sửa, không xóa. **Không ghi mức ưu tiên y tế** vào nhật ký (R-12).

Loại sự kiện: đề xuất được gửi · được chấp nhận · bị từ chối · hết hạn · bị hủy · hết ứng viên · đăng ký chờ được tạo · bị hủy · hoàn tất.

- **Nguồn:** Q-15 · `Đề xuất`; pain point P4; tiêu chí S4
- **Chịu trách nhiệm:** CMP-07 · **Kiểm chứng:** AC-01.1, AC-02.1, AC-08.1, AC-09.1

---

## Bảng tra nhanh

| BR | Phát biểu một dòng | Chịu trách nhiệm | Nguồn | Trạng thái nguồn |
| --- | --- | --- | --- | :---: |
| BR-01 | Chỉ hủy lịch và mở lại slot mới kích hoạt | CMP-03 | Canvas | Đề xuất |
| BR-02 | Ưu tiên y tế → thời gian chờ → thứ tự tạo | CMP-01/03 | Q-01, Q-02 | **Case** |
| BR-03 | Sáu điều kiện để là ứng viên | CMP-01/03 | Q-03, Q-06, Q-09 | Đề xuất |
| BR-04 | Một đề xuất đang chờ trên mỗi slot | CMP-03, ENT-02 | Q-05 | Đề xuất |
| BR-05 | Một đề xuất đang chờ trên mỗi bệnh nhân | CMP-03, ENT-02 | Q-06 | Đề xuất |
| BR-06 | Hạn 15 phút, không vượt giờ slot | CMP-03 | Q-04 | Đề xuất |
| BR-07 | Từ chối / hết hạn ⇒ tự chuyển người kế tiếp | CMP-03/04 | Canvas | Đề xuất |
| BR-08 | Hết ứng viên ⇒ không làm gì, ghi nhận | CMP-03 | Q-16 | Đề xuất |
| BR-09 | Chấp nhận là thao tác toàn vẹn | CMP-03 | K-04, Q-05 | Đề xuất |
| BR-10 | Slot mất khả dụng ⇒ hủy đề xuất, không mất lượt | CMP-03 | Q-08 | Đề xuất |
| BR-11 | Nội dung đề xuất không có dữ liệu y tế | CMP-02/06 | Q-10 | Đề xuất |
| BR-12 | Không lộ vị trí hàng đợi | CMP-02/06 | Q-14 | Đề xuất |
| BR-13 | Chỉ staff quản trị danh sách chờ | CMP-05 | Q-12 | Đề xuất |
| BR-14 | Chỉ chủ đề xuất mới phản hồi được | CMP-03 | C8, K-02 | — |
| BR-15 | Ghi nhật ký mọi chuyển trạng thái | CMP-07 | Q-15 | Đề xuất |
| BR-16 | Tối thiểu 30 phút trước giờ khám | CMP-03 | Q-11 | Đề xuất |

**Không có BR-17.** Nếu Q-07 được trả lời, luật mới mang mã này.
