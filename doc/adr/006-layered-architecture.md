# ADR-006: Kiến trúc 3 tầng Route - Service - Repository

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-07-20
- **Liên quan:** [ADR-001](./001-no-orm.md)

## Bối cảnh

Backend Express nhỏ có thể viết theo nhiều kiểu. Kiểu nhanh nhất là nhét hết vào file route:

```js
router.post("/appointments", async (req, res) => {
  const client = await pool.connect();
  await client.query("begin");
  const slot = await client.query("SELECT ... FOR UPDATE", [req.body.slotId]);
  if (slot.rows[0].status !== "available") {
    return res.status(409).json({ error: "..." });
  }
  // ... thêm 30 dòng nữa
});
```

Chạy được, nhưng trộn lẫn ba việc khác nhau: xử lý HTTP, quy tắc nghiệp vụ, và truy vấn database.

Ba lý do khiến việc tách tầng đáng làm ở dự án này:

1. **Mục tiêu dạy học.** Người học cần thấy đâu là "nghiệp vụ", đâu là "kỹ thuật". Trộn lẫn thì không phân biệt được.
2. **Nghiệp vụ có phần thật sự phức tạp.** Đặt lịch và hủy lịch cần transaction, khóa dòng, kiểm tra quyền sở hữu. Nhét vào route sẽ thành hàm 50 dòng khó đọc.
3. **Test dễ hơn.** Có thể gọi thẳng service để test quy tắc nghiệp vụ, không cần dựng cả HTTP.

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
| --- | --- | --- |
| **Gộp hết vào route** | Ít file, viết nhanh | Trộn lẫn trách nhiệm, khó test, không dạy được gì |
| **Route + Service** (2 tầng) | Gọn hơn 3 tầng | SQL nằm rải rác trong service, khó tìm khi cần tối ưu |
| **Route + Service + Repository** ✅ | Ranh giới rõ, SQL tập trung một chỗ | Nhiều file hơn, đôi khi phải viết hàm "chuyển tiếp" |
| **Kiến trúc lục giác / Clean Architecture** | Rất linh hoạt | Quá nặng cho 6 bảng. Nhiều interface, nhiều thư mục, tỉ lệ code hạ tầng / code nghiệp vụ quá cao |

## Quyết định

**Ba tầng, mỗi tầng chỉ được gọi tầng ngay dưới. Không nhảy cóc, không gọi ngược lên.**

```
src/routes/        → src/services/      → src/repositories/   → src/db/pool.js
(HTTP)               (nghiệp vụ)          (SQL)                  (kết nối)
```

### Hợp đồng của từng tầng

| Tầng | **Phải làm** | **Cấm làm** |
| --- | --- | --- |
| **Route** | Đọc `req.query` / `req.body` / `req.params`. Gọi đúng một hàm service. Trả `res.json({ data })`. Chuyển lỗi bằng `next(error)` | Viết SQL. Chứa `if` nghiệp vụ |
| **Service** | Kiểm tra và chuẩn hóa đầu vào. Áp quy tắc nghiệp vụ. Quản lý transaction. Ném lỗi kèm mã HTTP | Đụng vào `req` hoặc `res`. Viết SQL trực tiếp |
| **Repository** | Viết SQL. Đổi tên cột sang `camelCase`. Trả về dữ liệu thuần | Chứa quy tắc nghiệp vụ. Ném lỗi HTTP |

### Khuôn mẫu chung của mọi route

Toàn bộ 16 endpoint đều viết theo đúng một dạng:

```js
router.post("/slots", demoAuth, requireRole("staff"), async (req, res, next) => {
  try {
    res.status(201).json({ data: await slotService.createSlot(req.body) });
  } catch (error) {
    next(error);
  }
});
```

Ba đến năm dòng. Không route nào dài hơn. Nhìn vào là biết ngay: ai được gọi, gọi service nào, trả mã gì.

### Quy tắc quản lý transaction

**Chỉ tầng Service được mở transaction.** Repository nhận `client` từ bên ngoài truyền vào:

```js
// Service mở và đóng transaction
const client = await getClient();
await client.query("begin");
const slot = await slotRepository.findForUpdate(client, slotId);   // truyền client vào
await slotRepository.updateStatus(client, slotId, "booked");        // cùng client
await appointmentRepository.create(client, {...});                  // cùng client
await client.query("commit");
```

Vì sao? Vì một transaction thường trải qua **nhiều repository** (ở đây là `slotRepository` và `appointmentRepository`). Chỉ tầng service mới nhìn thấy toàn cảnh để biết đâu là ranh giới của transaction.

Hệ quả: repository có hai loại hàm:

| Loại | Chữ ký | Dùng khi |
| --- | --- | --- |
| Độc lập | `listAvailable()` | Truy vấn đơn lẻ, tự lấy kết nối từ pool |
| Trong transaction | `findForUpdate(client, id)` | Nhận `client` từ service, chạy chung transaction |

### Ngoại lệ được phép: bỏ qua tầng Service

Một số route gọi thẳng repository:

```js
router.get("/specializations", demoAuth, async (req, res, next) => {
  res.json({ data: await doctorRepository.listSpecializations() });
});
```

Lý do: **không có quy tắc nghiệp vụ nào để áp dụng.** Thêm một service chỉ để viết `return repository.listSpecializations()` là code thừa, không mang lại giá trị gì.

Nguyên tắc: *có nghiệp vụ thì có service; chỉ đọc dữ liệu thuần thì gọi thẳng repository.*

Các route được phép bỏ qua service: `/specializations`, `/doctors`, `/doctors/:id/slots`, `/slots/available`.

## Hệ quả

### Tích cực

- **Biết ngay phải sửa file nào.** Đổi quy tắc nghiệp vụ → mở `services/`. Tối ưu truy vấn → mở `repositories/`. Đổi mã HTTP → mở `routes/`.
- **File nhỏ.** File lớn nhất là `appointmentService.js` với 93 dòng. Không có file nào quá tải.
- **Nghiệp vụ tập trung.** Toàn bộ quy tắc về lịch hẹn nằm gọn trong một file, không rải rác.
- **SQL tập trung.** Muốn biết app chạy những câu SQL nào, chỉ cần đọc 4 file trong `repositories/`.
- **Đổi giao diện API không ảnh hưởng nghiệp vụ.** Muốn thêm GraphQL hay gRPC? Viết tầng route mới, service giữ nguyên.
- **Test đúng tầng.** Test hiện tại chạy qua HTTP (test tích hợp). Sau này muốn test đơn vị cho service thì gọi trực tiếp được, không cần dựng server.

### Tiêu cực

- **Nhiều file hơn.** 14 file backend cho một app 16 endpoint. Người quen viết gọn sẽ thấy dư thừa.
- **Có hàm chỉ để chuyển tiếp.** Ví dụ:
  ```js
  async function listMyAppointments(patientId) {
    return appointmentRepository.listByPatient(patientId);
  }
  ```
  Service này không làm gì ngoài gọi tiếp. Chấp nhận để giữ tính nhất quán - mọi API dành cho bệnh nhân đều đi qua service.
- **Ranh giới không phải lúc nào cũng rõ.** "Kiểm tra dữ liệu đầu vào" thuộc route hay service? Dự án này chọn **service**, để route thật mỏng.
- **Phải mở 3 file để lần một luồng.** Đổi lại mỗi file rất ngắn.

### Nợ kỹ thuật đã xử lý

Hàm `toInt()` từng bị chép nguyên xi ở **bốn** file (`doctors.routes.js`, `appointmentService.js`, `authService.js`, `slotService.js`), còn `required()` bị chép ở **hai** file.

Nay cả hai nằm ở `src/utils/validate.js`, mọi nơi đều `require` từ đó:

```js
const { toInt, required } = require("../utils/validate");
```

Đây là tầng thứ tư nhưng **không nằm trong chuỗi gọi Route → Service → Repository** - nó là tiện ích dùng chung, tầng nào cũng gọi được mà không phá vỡ quy tắc "không nhảy cóc".

### Khi nào cần xem lại

- **Khi số endpoint vượt khoảng 40:** nên chuyển từ chia theo *tầng* sang chia theo *tính năng* (`src/appointments/{routes,service,repository}.js`). Lúc đó một tính năng nằm gọn một thư mục, dễ tìm hơn.
- **Khi có nhu cầu thay đổi loại database:** cần thêm interface cho repository. Hiện tại chưa có nhu cầu.
- **Khi service bắt đầu gọi lẫn nhau nhiều:** dấu hiệu ranh giới đang sai, cần vẽ lại.
