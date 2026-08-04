# ADR-005: Migrate và seed tự động khi khởi động

- **Trạng thái:** Chấp nhận - **chỉ dành cho demo**
- **Ngày:** 2026-07-20
- **Cảnh báo:** Cách làm này **không được** áp dụng cho hệ thống thật.

## Bối cảnh

Database cần được tạo bảng trước khi app chạy. Câu hỏi: chạy lúc nào và ai chạy?

Ràng buộc của dự án:

1. **`docker compose up` phải ra ngay app dùng được.** Người xem demo không nên phải gõ thêm lệnh nào.
2. **Phải có sẵn dữ liệu để bấm.** Màn hình trống trơn thì không demo được gì.
3. **Container có thể khởi động lại nhiều lần.** Docker restart, CI chạy lại, người dùng `Ctrl+C` rồi `up` lại - lần nào cũng phải chạy được.
4. **Test cần dữ liệu sạch trước mỗi ca.** `tests/regression-core.test.js` gọi `migrateAndSeed({ reset: true })` ở `beforeEach`.

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| **Thư viện migration** (`node-pg-migrate`, `Flyway`, `Liquibase`) | Có phiên bản, rollback được, chuẩn công nghiệp | Thêm thư viện, thêm khái niệm phải dạy, thêm bước chạy trước khi khởi động |
| **File `.sql` gắn vào Docker** (`/docker-entrypoint-initdb.d/`) | Không cần code | **Chỉ chạy đúng một lần** khi volume trống. Sửa schema là phải `down -v` |
| **Bước riêng trong CI/CD** | Kiểm soát tốt, đúng chuẩn | Người dùng phải gõ thêm lệnh - phá vỡ yêu cầu số 1 |
| **Tự động khi app khởi động** ✅ | Một lệnh là xong, khởi động lại vẫn ổn | Không có phiên bản, không rollback, nguy hiểm nếu chạy nhiều bản sao |

## Quyết định

**Gọi `migrate()` rồi `seed()` ngay trong hàm khởi động của `server.js`**, trước khi `app.listen()`:

```js
async function start() {
  await waitForDatabase();     // đợi PostgreSQL sẵn sàng, thử tối đa 30 lần
  await migrateAndSeed();      // tạo bảng + đổ dữ liệu mẫu
  app.listen(PORT, ...);       // giờ mới nhận request
}
```

Điều kiện bắt buộc để cách này an toàn: **cả migrate lẫn seed phải chạy lại được nhiều lần mà không lỗi** (tính chất idempotent).

### Migrate an toàn nhờ `IF NOT EXISTS`

```sql
CREATE TABLE IF NOT EXISTS patients (...);
ALTER TABLE users ADD COLUMN IF NOT EXISTS demo_password varchar(80) NOT NULL DEFAULT 'demo123';
CREATE UNIQUE INDEX IF NOT EXISTS one_active_appointment_per_slot ...;
```

Mọi câu lệnh đều bỏ qua nếu đối tượng đã tồn tại. Chạy lần thứ 100 vẫn không lỗi.

### Seed an toàn nhờ `ON CONFLICT DO UPDATE`

```sql
INSERT INTO patients (id, name, phone) VALUES (1, 'Nguyễn Minh An', '0901 000 001')
ON CONFLICT (id) DO UPDATE SET name = excluded.name, phone = excluded.phone;
```

Chưa có thì chèn, có rồi thì cập nhật. Không bao giờ lỗi trùng khóa.

Ba chi tiết quan trọng trong seed:

**a) Ngày tương đối, không ghi cứng**

```sql
(1, 1, current_date,                    '08:00', '08:30', 'available'),
(3, 1, current_date + interval '1 day', '09:00', '09:30', 'available'),
```

Dữ liệu mẫu luôn nằm ở hôm nay và ngày mai. Nếu ghi cứng `'2025-01-15'` thì vài tháng sau mọi slot đều thuộc quá khứ, mà mọi truy vấn đều lọc `date >= current_date` → giao diện trống.

**b) Không phá dữ liệu người dùng vừa tạo**

```sql
status = CASE
  WHEN EXISTS (SELECT 1 FROM appointments a
               WHERE a.slot_id = slots.id AND a.status IN ('booked','confirmed'))
  THEN 'booked'
  ELSE excluded.status
END
```

Slot đang có lịch hẹn thật thì giữ nguyên `booked`. Không có đoạn này, mỗi lần khởi động lại app sẽ reset slot đã đặt về `available` → dữ liệu lệch ngay lập tức.

**c) Đồng bộ lại bộ đếm ID**

```sql
SELECT setval('patients_id_seq', COALESCE((SELECT MAX(id) FROM patients), 1));
```

Vì seed chèn ID cứng (1, 2, 3...) nên bộ đếm tự tăng vẫn đang ở 1. Không gọi `setval` thì bản ghi tiếp theo do app tạo sẽ nhận `id = 1` và lỗi trùng khóa. Rất dễ quên, rất khó tìm ra nguyên nhân.

### Chế độ xóa sạch cho test

```js
seed({ reset: true })  // gọi resetData() trước
```

`resetData()` chạy `TRUNCATE ... RESTART IDENTITY CASCADE` - xóa mọi dòng và đưa bộ đếm về 1. Nhờ vậy mỗi ca test bắt đầu từ trạng thái giống hệt nhau, kết quả ổn định.

## Hệ quả

### Tích cực

- **Một lệnh duy nhất.** `docker compose up --build` là có app đầy đủ dữ liệu.
- **Khởi động lại bao nhiêu lần cũng được.** Không phải nhớ gõ lệnh gì trước.
- **Test đáng tin.** Mỗi ca test có dữ liệu sạch, không ảnh hưởng lẫn nhau.
- **CI đơn giản.** File `ci.yml` chỉ cần `npm run db:migrate && npm run db:seed && npm test`.
- **Không thêm thư viện nào.**
- **Dữ liệu mẫu không bao giờ cũ** nhờ dùng ngày tương đối.

### Tiêu cực - vì sao không dùng được cho hệ thống thật

| Vấn đề | Chi tiết |
| --- | --- |
| **Không có phiên bản schema** | Không có bảng `schema_migrations`. Không ai biết database đang ở phiên bản nào |
| **Không rollback được** | Sửa nhầm schema thì chỉ có cách sửa tay hoặc xóa sạch database |
| **`IF NOT EXISTS` không xử lý được thay đổi phức tạp** | Đổi kiểu cột, đổi tên cột, tách bảng - không cú pháp `IF NOT EXISTS` nào làm được |
| **Chạy nhiều bản sao là hỏng** | Khởi động 3 container cùng lúc → 3 tiến trình cùng `CREATE TABLE` và `INSERT` → tranh chấp, lỗi |
| **Seed ghi đè dữ liệu thật** | `ON CONFLICT DO UPDATE` sẽ **ghi đè** tên và mật khẩu của user ID 1-8 mỗi lần khởi động. Trên hệ thống thật đây là mất dữ liệu |
| **Khởi động chậm hơn** | Mỗi lần chạy đều tốn thêm vài chục câu SQL |
| **Nợ kỹ thuật tích tụ** | `ALTER TABLE users ADD COLUMN IF NOT EXISTS demo_password` nằm giữa file migrate là dấu vết của một lần đổi schema. Càng nhiều lần đổi, file này càng rối |

### Lộ trình nâng cấp cho hệ thống thật

**Bước 1 - Tách file migration theo phiên bản:**

```
src/db/migrations/
├── 001_init.sql
├── 002_add_demo_password.sql
└── 003_add_indexes.sql
```

**Bước 2 - Thêm bảng theo dõi:**

```sql
CREATE TABLE schema_migrations (
  version    varchar(255) PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
```

Trình chạy migration đọc bảng này, chỉ chạy file chưa có trong đó.

**Bước 3 - Tách migrate ra khỏi khởi động app:**

```yaml
# Trong pipeline triển khai
- run: npm run db:migrate    # bước riêng, chạy đúng 1 lần
- run: kubectl rollout ...   # sau đó mới triển khai app
```

**Bước 4 - Bỏ seed ở môi trường thật:**

```js
if (process.env.NODE_ENV !== "production") {
  await seed();
}
```

**Bước 5 - Quy tắc bất di bất dịch:** *file migration đã merge vào nhánh chính thì không bao giờ được sửa.* Muốn thay đổi thì viết file mới. Sửa file cũ sẽ khiến database của những người đã chạy nó bị lệch so với người chưa chạy.

### Khi nào cần xem lại

Ngay lập tức, nếu MedBook đi ra khỏi phạm vi demo:

- Khi triển khai ra môi trường có dữ liệu thật.
- Khi chạy nhiều hơn một bản sao ứng dụng.
- Khi cần thay đổi schema mà `IF NOT EXISTS` không diễn đạt được.
- Khi có nhiều người cùng sửa schema và bắt đầu xung đột.
