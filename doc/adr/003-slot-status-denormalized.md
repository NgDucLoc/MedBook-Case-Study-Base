# ADR-003: Lưu `status` trong bảng `slots` dù có thể suy ra được

- **Trạng thái:** Chấp nhận (có nợ kỹ thuật đã biết)
- **Ngày:** 2026-07-20
- **Liên quan:** [ADR-004](./004-transaction-lock-booking.md)

## Bối cảnh

Bảng `slots` có cột `status` nhận giá trị `available` hoặc `booked`.

Vấn đề: **thông tin này là thừa.** Có thể suy ra hoàn toàn từ bảng `appointments`:

```sql
-- Slot còn trống = slot không có lịch hẹn nào đang hoạt động
SELECT s.* FROM slots s
WHERE NOT EXISTS (
  SELECT 1 FROM appointments a
  WHERE a.slot_id = s.id AND a.status IN ('booked', 'confirmed')
);
```

Trong lý thuyết thiết kế cơ sở dữ liệu, lưu dữ liệu suy ra được là vi phạm nguyên tắc chuẩn hóa, và luôn kèm rủi ro **hai nguồn dữ liệu nói khác nhau**.

Nhưng có một tình huống nghiệp vụ khiến việc này trở nên hợp lý.

## Tình huống nghiệp vụ then chốt

Nhân viên cần **chặn một khung giờ mà không có bệnh nhân nào đặt**. Ví dụ thực tế:

- Bác sĩ đi họp giao ban lúc 10:00.
- Phòng khám B-105 đang sửa chữa.
- Bác sĩ nghỉ ốm đột xuất.

Nếu trạng thái slot chỉ suy ra từ `appointments`, thì muốn chặn slot ta buộc phải **tạo một lịch hẹn giả** - dữ liệu rác, và phải gán cho bệnh nhân nào? Rất gượng ép.

Có cột `status` riêng thì nhân viên chỉ cần đổi nó thành `booked`. Đơn giản và đúng ý nghĩa nghiệp vụ: *"khung giờ này không nhận bệnh nhân"*.

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| **Chuẩn hóa hoàn toàn** - bỏ cột `status`, mọi truy vấn dùng `LEFT JOIN` | Không bao giờ lệch dữ liệu. Chỉ một nguồn sự thật | Không chặn slot thủ công được. Mọi câu SQL đều phải thêm JOIN, kể cả câu đơn giản nhất |
| **Thêm bảng `slot_blocks`** riêng để ghi các khung giờ bị chặn | Vừa chuẩn hóa vừa chặn được | Thêm bảng thứ 7, mọi truy vấn phải JOIN hai bảng. Quá nặng cho demo |
| **Giữ `status`, chấp nhận có nguy cơ lệch** ✅ | Truy vấn cực đơn giản, chặn slot thủ công dễ dàng | Có thể lệch với `appointments` |
| **Giữ `status` + trigger tự đồng bộ** | Không lệch, vẫn đơn giản | Logic nghiệp vụ chui vào database, khó gỡ lỗi, khó dạy |

## Quyết định

**Giữ cột `slots.status`**, và bù lại bằng ba biện pháp phòng vệ:

### 1. Đường tự động luôn cập nhật cả hai bảng trong cùng transaction

Trong `appointmentService.js`, mỗi khi lịch hẹn đổi trạng thái thì slot cũng đổi theo, nằm chung một `BEGIN...COMMIT`:

```js
// Khi đặt lịch
await slotRepository.updateStatus(client, slotId, "booked");
await appointmentRepository.create(client, {...});

// Khi hủy lịch
await appointmentRepository.updateStatus(client, id, "cancelled");
await slotRepository.updateStatus(client, appointment.slot_id, "available");
```

Không có khả năng chỉ một bảng được cập nhật.

### 2. Database làm lưới an toàn cuối cùng

Partial unique index đảm bảo: **kể cả khi `slots.status` sai**, vẫn không thể tồn tại hai lịch hẹn hoạt động trên cùng một slot.

```sql
CREATE UNIQUE INDEX one_active_appointment_per_slot
  ON appointments(slot_id) WHERE status IN ('booked', 'confirmed');
```

Đây là lý do lỗi lệch dữ liệu **gây phiền chứ không phá hỏng**.

### 3. Seed biết tôn trọng dữ liệu thật

Khi khởi động lại app, seed không reset slot đang có lịch hẹn thật:

```sql
status = CASE
  WHEN EXISTS (SELECT 1 FROM appointments a
               WHERE a.slot_id = slots.id AND a.status IN ('booked','confirmed'))
  THEN 'booked'
  ELSE excluded.status
END
```

## Hệ quả

### Tích cực

- **Truy vấn ngắn gọn.** `WHERE s.status = 'available'` thay vì một mệnh đề `NOT EXISTS` lồng nhau. Đọc `slotRepository.js` là hiểu ngay.
- **Chặn slot thủ công đúng nghĩa nghiệp vụ**, không cần dữ liệu giả.
- **Nhanh hơn.** Điều kiện lọc trực tiếp trên một cột, không phải JOIN với bảng lớn nhất.
- **Dễ dạy.** Người học nhìn thấy trạng thái ngay trong bảng, không phải tưởng tượng.

### Tiêu cực - rủi ro lệch dữ liệu

Trước đây `slotService.updateSlot()` cho phép nhân viên đổi `status` **mà không kiểm tra bảng `appointments`**, dẫn tới kịch bản hỏng:

```
1. An đặt lịch slot #5      → slots #5 = 'booked', appointment #9 = 'booked'
2. Nhân viên bấm "Mở lại"   → slots #5 = 'available'  ⚠️ appointment #9 VẪN 'booked'
3. Linh thấy slot #5 trống, bấm đặt
4. INSERT bị partial unique index chặn
5. API trả 500 thay vì 409 thân thiện
```

**Đã vá** (xem "Cách 1" bên dưới): nay `updateSlot()` từ chối mở lại slot đang có lịch hẹn hoạt động, trả `409 "Không thể mở lại khung giờ đang có lịch hẹn"`.

Vẫn còn hai điểm chưa triệt để:

- **Chặn slot trống thủ công** vẫn tạo ra tình trạng `booked` mà không có lịch hẹn nào. Đây là **đúng ý đồ nghiệp vụ** (bác sĩ đi họp), nhưng khiến câu SQL dò lệch dữ liệu báo nhầm.
- **Vẫn còn hai nguồn sự thật.** Bản vá chỉ bịt một đường đi cụ thể, không xóa bỏ nguyên nhân gốc là việc lưu dữ liệu suy ra được.

### Cách phát hiện lệch dữ liệu

Chạy câu này định kỳ, kết quả đúng phải là **0 dòng**:

```sql
SELECT s.id AS slot_id, s.status AS trang_thai_slot,
       COUNT(a.id) AS so_lich_hoat_dong
FROM slots s
LEFT JOIN appointments a
  ON a.slot_id = s.id AND a.status IN ('booked', 'confirmed')
GROUP BY s.id, s.status
HAVING (s.status = 'booked'    AND COUNT(a.id) = 0)
    OR (s.status = 'available' AND COUNT(a.id) > 0);
```

Lưu ý: slot bị chặn thủ công (`booked` mà không có lịch hẹn) cũng xuất hiện trong kết quả. Đó là **đúng ý đồ**, không phải lỗi - đây là hạn chế của cách kiểm tra này.

### Ba cách vá, xếp theo công sức

**Cách 1 - Vá nhanh. ĐÃ TRIỂN KHAI.** Chặn việc mở lại slot đang có lịch hẹn:

```js
// src/services/slotService.js
if (normalizedStatus === "available") {
  const active = await appointmentRepository.countActiveBySlot(slotId);
  if (active > 0) {
    throw httpError(409, "Không thể mở lại khung giờ đang có lịch hẹn");
  }
}
```

Kèm hàm mới `appointmentRepository.countActiveBySlot(slotId)` và hai ca test:

- `staff cannot reopen a slot that still has an active appointment` → `409`
- `staff can reopen a slot once its appointment is cancelled` → `200`

Khoảng 10 dòng, bịt được kịch bản nguy hiểm nhất.

**Cách 2 - Phân biệt rõ hai loại "bận":** đổi `status` thành ba giá trị `available` / `booked` / `blocked`. `booked` chỉ do hệ thống đặt, `blocked` chỉ do nhân viên đặt. Không còn lẫn lộn ai là người thay đổi.

**Cách 3 - Chuẩn hóa triệt để:** bỏ cột `status`, thêm bảng `slot_blocks`, tính trạng thái bằng JOIN. Sạch nhất về lý thuyết nhưng phải sửa gần như toàn bộ `slotRepository.js`.

### Khi nào cần xem lại

- Khi có báo cáo thật về việc đặt lịch bị lỗi 500.
- Khi thêm chức năng đổi lịch (dời sang slot khác) - lúc đó số đường thay đổi trạng thái tăng lên, rủi ro lệch tăng theo.
- Khi có nhiều nhân viên thao tác cùng lúc trên cùng một ngày.
