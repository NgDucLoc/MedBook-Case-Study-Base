# MedBook — Hướng dẫn chạy

## Hai nhánh
| Nhánh | Nội dung |
|---|---|
| `main` | Code gốc MedBook (chưa có tính năng mới) |
| `day03` | **Đã bổ sung** tính năng *Dynamic Appointment Rescheduling & Waiting List* (waitlist + offer + timeout) |

## Chạy bằng Docker (khuyên dùng)
Cần **Docker Desktop** đang chạy. Không cần cài Node/PostgreSQL.

```bash
git clone https://github.com/trhuyyy13/MedBook-Case-Study.git
cd MedBook-Case-Study
git checkout day03          # nhánh có tính năng mới (bỏ dòng này nếu muốn xem bản gốc: main)
docker compose up --build
```

Đợi log hiện `MedBook đang chạy tại http://localhost:4300` rồi mở: **http://localhost:4300**
App tự tạo schema + nạp dữ liệu mẫu ở lần chạy đầu.

| Dịch vụ | Cổng |
|---|---|
| Ứng dụng | `4300` |
| PostgreSQL | `55432` |

### Đổi qua lại giữa 2 nhánh
```bash
git checkout main   && docker compose up --build   # xem bản gốc
git checkout day03  && docker compose up --build   # xem bản có tính năng
```
> Migration dùng `create table if not exists` nên chuyển nhánh an toàn; dữ liệu giữ trong volume. Muốn làm lại từ đầu: `docker compose down -v`.

### Lệnh Docker hay dùng
```bash
docker compose up -d          # chạy nền
docker compose logs -f app    # xem log
docker compose down           # dừng (giữ dữ liệu)
docker compose down -v        # dừng + xoá sạch dữ liệu
```

## Tài khoản demo (mật khẩu: `demo123`)
| Email | Vai trò |
|---|---|
| `an@medbook.local` | Bệnh nhân (patient) |
| `mai.staff@medbook.local` | Nhân viên (staff) |

*(Còn: `linh@`, `huy@`, `nhi@`, `nam@` — patient; `khanh.staff@`, `lan.staff@` — staff.)*

## Tính năng mới ở `day03`
Khi một slot trở nên trống (bệnh nhân huỷ lịch, hoặc staff mở lại slot), hệ thống **tự động** chọn bệnh nhân phù hợp trong danh sách chờ (FIFO) → gửi lời mời (offer) → xử lý chấp nhận/từ chối/hết hạn, **không đặt trùng lịch**.

API chính (prefix `/api`):
- `POST /waitlist`, `DELETE /waitlist/:id`, `GET /my-waitlist` (patient) · `GET /waitlist` (staff)
- `GET /my-offers`, `POST /offers/:id/accept`, `POST /offers/:id/decline` (patient) · `GET /offers` (staff)
- `GET /notifications`

Tham số cấu hình (biến môi trường, có mặc định):
- `OFFER_TIMEOUT_MINUTES=15` — thời hạn phản hồi offer
- `OFFER_JOB_INTERVAL_MS=60000` — chu kỳ job quét offer hết hạn

## (Tuỳ chọn) Chạy test
Cần PostgreSQL ở `localhost:55432` (bật bằng `docker compose up -d db`), rồi:

```bash
npm install
OFFER_JOB_DISABLED=1 npm test
```

`npm test` chạy `node --test --test-concurrency=1 tests/*.test.js`:
- `tests/regression-core.test.js` — 47 test regression, chỉ bảo vệ các tính năng đã có ở `main` (auth, doctors, slots, appointments). Có ở mọi nhánh.
- `tests/waitlist.test.js` — 18 test cho tính năng waitlist mới. Chỉ có ở nhánh `day03`.

Chi tiết mục đích và phạm vi của bộ regression: [`doc/regression-testing.md`](./doc/regression-testing.md).

> `--test-concurrency=1` là bắt buộc: các file test cùng dùng chung 1 database và tự reset dữ liệu trước mỗi ca, chạy song song sẽ deadlock.
> Lưu ý: nếu source đặt trong thư mục **iCloud (Desktop)**, `require` có thể chậm — nên đặt project ở ổ thường.
