# ADR-001: Dùng SQL thuần với `pg`, không dùng ORM

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-07-20
- **Liên quan:** [ADR-006](./006-layered-architecture.md)

## Bối cảnh

MedBook cần đọc ghi PostgreSQL. Hệ sinh thái Node.js có nhiều thư viện ORM phổ biến: Prisma, TypeORM, Sequelize, Knex...

Ba yếu tố chi phối lựa chọn:

1. **Mục tiêu là dạy học.** Đây là case study về quy trình phát triển phần mềm có AI hỗ trợ. Người đọc cần thấy rõ chuyện gì đang xảy ra, không phải học thêm cú pháp của một thư viện.
2. **Quy mô rất nhỏ.** 6 bảng, 16 endpoint, khoảng 20 câu SQL. Không có truy vấn động phức tạp.
3. **Có một chỗ cần SQL đặc thù.** Cơ chế chống đặt trùng dựa vào `SELECT ... FOR UPDATE` và partial unique index - hai tính năng riêng của PostgreSQL mà ORM thường che giấu hoặc hỗ trợ vụng về.

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| **Prisma** | Tự sinh kiểu dữ liệu, công cụ migration tốt, cộng đồng lớn | Cần bước sinh code, thêm file schema riêng, `FOR UPDATE` phải dùng `$queryRaw` - mất luôn lợi thế |
| **Sequelize / TypeORM** | Quen thuộc với người từ Java/Rails | Nhiều "phép thuật" ngầm, khó biết SQL thật là gì, nặng cho 6 bảng |
| **Knex** (query builder) | Nhẹ hơn ORM, vẫn gần SQL | Vẫn phải học API riêng, mà lợi ích so với SQL thuần rất ít ở quy mô này |
| **`pg` + SQL thuần** ✅ | Không có lớp trung gian, ai biết SQL là đọc được, dùng được mọi tính năng PostgreSQL | Phải tự viết ánh xạ tên cột, không có kiểm tra kiểu lúc biên dịch |

## Quyết định

**Dùng thư viện `pg` và viết SQL thuần.** Toàn bộ câu lệnh SQL tập trung trong thư mục `src/repositories/`, không được xuất hiện ở tầng nào khác.

Kèm ba quy ước bắt buộc:

**1. Luôn dùng tham số hóa, tuyệt đối không nối chuỗi**

```js
// ĐÚNG
query("SELECT * FROM users WHERE id = $1", [id]);

// SAI - lỗ hổng SQL injection
query(`SELECT * FROM users WHERE id = ${id}`);
```

**2. Đổi tên cột ngay trong SQL**

Database dùng `snake_case`, JavaScript dùng `camelCase`. Việc đổi tên làm bằng `AS` trong câu SQL, không viết hàm ánh xạ riêng:

```sql
SELECT s.doctor_id AS "doctorId",
       to_char(s.start_time, 'HH24:MI') AS "startTime"
```

**3. Gom câu SELECT dùng chung thành hàm**

`slotRepository.slotSelect(where)` và `appointmentRepository.appointmentSelect(where)` trả về chuỗi SQL cơ sở, các hàm khác chỉ truyền vào mệnh đề `WHERE`. Tránh chép đi chép lại 15 dòng JOIN.

## Hệ quả

### Tích cực

- **Đọc là hiểu.** Không cần biết MedBook cũng đọc được `slotRepository.js` nếu biết SQL.
- **Dùng được tính năng mạnh của PostgreSQL.** `FOR UPDATE`, partial index, `COUNT(*) FILTER (WHERE ...)`, `to_char()`, `COALESCE` - tất cả dùng trực tiếp, không phải lách.
- **Chỉ 2 dependency.** `package.json` có đúng `express` và `pg`. Cài nhanh, ít lỗ hổng bảo mật, ít rủi ro nâng cấp.
- **Không có bước build.** Sửa file là chạy được ngay.
- **Biết chính xác app đang chạy SQL gì.** Không có vấn đề "N+1 query" ẩn - kinh điển với ORM.

### Tiêu cực

- **Không có kiểm tra kiểu.** Gõ sai tên cột chỉ phát hiện lúc chạy. ORM sẽ báo lỗi ngay lúc viết code.
- **Ánh xạ thủ công.** Mỗi câu SELECT phải tự viết `AS "camelCase"`. Quên một cột là frontend nhận `undefined`.
- **Không có công cụ migration.** Xem [ADR-005](./005-migration-strategy.md).
- **SQL bị lặp.** Đã giảm bằng `slotSelect()` / `appointmentSelect()` nhưng không triệt để.
- **Đổi loại database sẽ tốn công.** SQL này gắn chặt với PostgreSQL. Chấp nhận được - không có kế hoạch đổi.

### Khi nào cần xem lại

Xem xét dùng ORM hoặc query builder nếu:

- Số bảng vượt khoảng 15-20.
- Xuất hiện nhu cầu truy vấn động phức tạp (bộ lọc do người dùng tự ghép).
- Nhóm chuyển sang TypeScript và muốn kiểu dữ liệu tự sinh từ schema.
- Có nhiều người không thạo SQL tham gia dự án.

Ở quy mô hiện tại, thêm ORM là thêm việc mà không giải quyết vấn đề nào.
