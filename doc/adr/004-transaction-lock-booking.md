# ADR-004: Chống đặt trùng bằng khóa bi quan và ràng buộc ở database

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-07-20
- **Liên quan:** [ADR-003](./003-slot-status-denormalized.md)

## Bối cảnh

Quy tắc nghiệp vụ quan trọng nhất của MedBook:

> **Một khung giờ chỉ được có tối đa một lịch hẹn đang hoạt động.**

Nếu vi phạm, hậu quả ngoài đời thật rất nặng: hai bệnh nhân cùng tới phòng khám lúc 08:00, bác sĩ không biết tiếp ai, một người phải về.

Đây là bài toán kinh điển gọi là **race condition** - hai request chạy song song cùng thao tác trên một dữ liệu.

### Vì sao kiểm tra thông thường không đủ

Cách viết trực giác nhất:

```js
const slot = await findSlot(slotId);
if (slot.status !== "available") throw httpError(409, "...");
await updateSlot(slotId, "booked");
await createAppointment(...);
```

Đoạn code này **sai** khi có hai request đồng thời. Giữa dòng 1 (đọc) và dòng 3 (ghi) tồn tại một khoảng thời gian, dù chỉ vài mili giây:

| Thời điểm | An | Linh |
| --- | --- | --- |
| t1 | Đọc slot #1 → `available` ✓ | |
| t2 | | Đọc slot #1 → `available` ✓ *(An chưa kịp ghi)* |
| t3 | Ghi `booked` + tạo lịch #10 | |
| t4 | | Ghi `booked` + tạo lịch #11 |

Kết quả: **hai lịch hẹn trên slot #1.** Cả hai request đều báo thành công, không ai biết có vấn đề.

Lỗi này rất khó phát hiện khi test thủ công vì hiếm khi trùng đúng khoảnh khắc. Nó chỉ lộ ra khi lượng người dùng tăng - đúng lúc tệ nhất.

## Các phương án đã cân nhắc

| Phương án | Cơ chế | Ưu | Nhược |
| --- | --- | --- | --- |
| **Chỉ kiểm tra trong code** | `if (status !== available)` | Đơn giản | **Sai.** Không chống được race condition |
| **Khóa lạc quan** (optimistic) | Thêm cột `version`, ghi kèm `WHERE version = $x` | Không khóa dòng, throughput cao | Phải viết logic thử lại, thêm cột, phức tạp hơn |
| **Khóa bi quan** (pessimistic) ✅ | `SELECT ... FOR UPDATE` | Đúng chắc chắn, dễ hiểu, hợp với PostgreSQL | Request phải xếp hàng đợi |
| **Ràng buộc ở database** ✅ | Partial unique index | Không đường nào lách được | Lỗi trả về là 500 xấu xí |
| **Hàng đợi tuần tự** | Đưa mọi lệnh đặt lịch vào queue | Không bao giờ tranh chấp | Cần thêm hạ tầng, quá nặng |

## Quyết định

**Dùng đồng thời hai phương án: khóa bi quan trong transaction, cộng với ràng buộc ở database.** Tạo thành ba lớp bảo vệ.

### Lớp 1 - Kiểm tra trong service (cho thông báo lỗi đẹp)

```js
if (!slot) throw httpError(404, "Không tìm thấy khung giờ");
if (slot.status !== "available") throw httpError(409, "Khung giờ đã được đặt");
```

Xử lý trường hợp thông thường: slot đã được đặt từ trước, người dùng vừa mở trang cũ. Trả về 409 với thông báo tiếng Việt rõ ràng.

### Lớp 2 - Transaction + `FOR UPDATE` (chống chạy song song)

```js
await client.query("begin");
const slot = await slotRepository.findForUpdate(client, slotId);
// SELECT id, status FROM slots WHERE id = $1 FOR UPDATE
...
await client.query("commit");
```

`FOR UPDATE` khóa **dòng slot đó** cho tới khi transaction kết thúc. Bất kỳ transaction nào muốn đọc cùng dòng với `FOR UPDATE` đều phải **đợi**.

Diễn biến khi có khóa:

| Thời điểm | An | Linh |
| --- | --- | --- |
| t1 | `BEGIN`, đọc + **khóa** slot #1 → `available` ✓ | |
| t2 | | `BEGIN`, muốn đọc slot #1 → **bị chặn, xếp hàng** |
| t3 | `UPDATE` thành `booked`, `INSERT` lịch, `COMMIT` → nhả khóa | ...vẫn đang đợi... |
| t4 | | Được đọc → thấy `booked` → ném 409 ✓ |

Linh nhận đúng thông báo "Khung giờ đã được đặt". Không còn lịch trùng.

Điểm mấu chốt: **`FOR UPDATE` phải nằm trong transaction.** Ngoài transaction, khóa nhả ngay sau câu lệnh và không có tác dụng gì.

### Lớp 3 - Partial unique index (lưới an toàn tuyệt đối)

```sql
CREATE UNIQUE INDEX one_active_appointment_per_slot
  ON appointments(slot_id) WHERE status IN ('booked', 'confirmed');
```

Ràng buộc này nằm ở tầng database nên **không đường nào vượt qua được**: không phải qua API, không phải qua script chạy tay, không phải qua code mới viết sai trong tương lai.

Mệnh đề `WHERE` rất quan trọng - nó cho phép **đặt lại slot sau khi đã hủy**. Nếu viết `UNIQUE(slot_id)` trơn thì một slot bị hủy sẽ vĩnh viễn không ai đặt được nữa.

### Vì sao cần cả ba?

| Lớp | Bắt được tình huống | Chất lượng thông báo lỗi |
| --- | --- | --- |
| 1. Kiểm tra trong code | Thông thường (99% trường hợp) | Tốt - 409 tiếng Việt |
| 2. `FOR UPDATE` | Hai người bấm cùng lúc | Tốt - vẫn rơi vào lớp 1 sau khi đợi xong |
| 3. Index | Mọi thứ còn lại: script tay, code mới, dữ liệu lệch | Xấu - 500 |

Càng xuống sâu càng khó vượt qua, nhưng thông báo càng xấu. Đó là đánh đổi hợp lý: lớp 3 chỉ kích hoạt trong tình huống đáng lẽ không được xảy ra.

## Hệ quả

### Tích cực

- **Đúng chắc chắn.** Không có kịch bản nào tạo được hai lịch hẹn hoạt động trên một slot.
- **Dễ hiểu.** Đọc `bookAppointment()` là thấy rõ trình tự: `BEGIN` → khóa → kiểm tra → ghi → `COMMIT`. Không có "phép thuật" ẩn.
- **Không cần hạ tầng thêm.** PostgreSQL làm hết. Không Redis, không queue.
- **Có test bảo vệ cả hai lớp đầu.** `tests/regression-core.test.js` có:
  - *"patient cannot book an already booked slot"* - kiểm tra lớp 1.
  - *"concurrent booking of the same slot produces exactly one success"* - bắn hai request song song vào cùng slot bằng `Promise.all`, khẳng định kết quả đúng là một `201` và một `409`. Đây là ca test trực tiếp chứng minh lớp 2 hoạt động.
- **Đúng tinh thần "ràng buộc quan trọng thì đặt ở database".** Code có thể viết sai, ràng buộc DB thì không.

### Tiêu cực

- **Request phải xếp hàng.** Hai người tranh cùng slot thì một người phải đợi. Ở đây không đáng lo vì tranh chấp trên *cùng một slot* rất hiếm, và transaction chỉ kéo dài vài mili giây.
- **Nguy cơ khóa chéo (deadlock) về lý thuyết.** Nếu sau này có luồng khóa nhiều slot cùng lúc (ví dụ đổi lịch: khóa slot cũ + slot mới), phải **luôn khóa theo thứ tự ID tăng dần** để tránh hai transaction khóa chéo nhau. Hiện tại chỉ khóa một dòng nên không có rủi ro.
- **Lớp 3 trả 500.** Khi index chặn, người dùng thấy "Lỗi máy chủ" khó hiểu. Có thể cải thiện bằng cách bắt riêng mã lỗi `23505` của PostgreSQL và đổi thành 409.

### Ranh giới transaction - đã sửa

Trước đây khối `catch` trong `bookAppointment()` gọi `ROLLBACK` cho **mọi** lỗi, kể cả lỗi phát sinh ở `findDetailedById()` - vốn chạy **sau** khi đã `COMMIT`. Rollback một transaction đã đóng không phá dữ liệu (PostgreSQL chỉ cảnh báo) nhưng về logic là sai.

Nay cả `bookAppointment()` lẫn `cancelAppointment()` đều theo đúng một khuôn:

```js
// 1. Kiểm tra đầu vào TRƯỚC khi mượn kết nối
const normalizedSlotId = toInt(required(slotId, "slotId"));

const client = await getClient();
let appointmentId;
try {
  await client.query("begin");
  // ... chỉ những thao tác thật sự thuộc transaction
  await client.query("commit");
  appointmentId = appointment.id;
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
}

// 2. Đọc lại dữ liệu SAU khi transaction đã đóng hẳn
return appointmentRepository.findDetailedById(appointmentId);
```

Hai lợi ích kèm theo:

- Đầu vào sai (thiếu `slotId`) không còn tốn một kết nối từ pool.
- Trong khối `try` chỉ còn đúng những gì cần nguyên tử, nên ranh giới transaction đọc là thấy ngay.

### Khi nào cần xem lại

- Khi lượng đặt lịch đồng thời tăng mạnh và đo được hiện tượng chờ khóa. Lúc đó cân nhắc khóa lạc quan.
- Khi thêm luồng khóa nhiều dòng cùng lúc - phải rà soát lại thứ tự khóa để tránh deadlock.
- Khi muốn nâng trải nghiệm: bắt mã lỗi `23505` để trả 409 thay vì 500.
