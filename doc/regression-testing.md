# Regression Testing — bộ test bảo vệ tính năng cũ

Tài liệu này mô tả `tests/regression-core.test.js` — bộ test tự động chỉ kiểm tra các
tính năng **đã có sẵn ở nhánh `main`**: demo auth, danh mục bác sĩ/chuyên khoa, quản lý
slot, đặt/hủy/xác nhận lịch hẹn.

Trên `main`, đây là file test **duy nhất** trong `tests/`. Khi bạn implement tính năng
mới trên một nhánh riêng, tests của tính năng đó nên nằm ở **file riêng** (vd.
`tests/ten-tinh-nang.test.js`) — không viết chung vào `regression-core.test.js` và
không chỉnh sửa file này. File này không được biết/giả định gì về tính năng bạn sắp
thêm — nó chỉ bảo vệ những gì đã có sẵn ở `main`.

## Dùng để làm gì

Khi bạn implement thêm một tính năng bổ sung trên nền code này, bộ test này giúp trả
lời: **"Tôi có lỡ làm hỏng luồng cũ không?"**

Quy trình khuyến nghị:

1. Code xong tính năng mới của bạn (có thể có unit test riêng cho tính năng đó).
2. Chạy `npm test` — nó sẽ chạy **cả** bộ regression này **lẫn** test của tính năng mới bạn viết.
3. Nếu có test trong `regression-core.test.js` fail → tính năng mới của bạn đã đụng vào
   hành vi cũ (API cũ đổi status code, đổi message lỗi, đổi field trả về...). Sửa lại code
   cho tới khi bộ regression pass trở lại, rồi mới tính là xong việc.

> **Quy tắc:** file `tests/regression-core.test.js` không sửa/xoá, không thêm test cho
> tính năng mới vào đây. Nếu bạn thấy 1 kịch bản trong này thực sự sai (hiếm khi xảy ra),
> hãy trao đổi trước khi sửa thay vì tự ý xoá test cho pass.

## Cách chạy

Cần Postgres đang chạy (dùng docker-compose sẵn có trong repo):

```bash
docker compose up -d db
npm test                                        # chạy toàn bộ tests/*.test.js
node --test tests/regression-core.test.js       # chỉ chạy riêng bộ regression
```

`npm test` được cấu hình chạy tuần tự (`--test-concurrency=1`) vì các file test dùng
chung 1 database và reset dữ liệu (`truncate ... cascade`) trước mỗi test — chạy song song
nhiều file sẽ bị deadlock ở bước migrate/reset.

Đọc kết quả: mỗi dòng `✔` là 1 kịch bản pass, `✖` là fail kèm traceback ngay bên dưới.
Tổng kết ở cuối (`tests`, `pass`, `fail`) là con số cần nhìn đầu tiên.

## Phạm vi (scope)

**Có kiểm tra** — API thuộc `main` (auth, doctors, slots, appointments):

| Nhóm | Endpoint | Kịch bản chính |
| --- | --- | --- |
| Health & routing | `GET /health`, route `/api/*` không tồn tại | 200 khi khỏe mạnh, 404 khi sai route |
| Auth | `GET /api/me`, `GET /api/demo-users`, `POST /api/demo-login` | thiếu/sai header, user không tồn tại, login đúng/sai mật khẩu, không lộ `demo_password` |
| Phân quyền | mọi route có `requireRole` | patient gọi route staff-only và ngược lại đều bị 403 |
| Bác sĩ / chuyên khoa | `GET /api/specializations`, `GET /api/doctors` | list đầy đủ, filter theo `specializationId`, filter theo `q` (không phân biệt hoa/thường) |
| Slot (đọc) | `GET /api/doctors/:id/slots`, `GET /api/slots/available`, `GET /api/slots` (staff) | chỉ trả slot `available` ở API công khai, staff thấy cả slot `booked`, filter theo `date` |
| Slot (staff quản lý) | `POST /api/slots`, `PUT /api/slots/:id` | thiếu field bắt buộc, slot không tồn tại, status không hợp lệ, không cho mở lại slot đang có lịch |
| Đặt lịch | `POST /api/appointments`, `GET /api/my-appointments` | thiếu `slotId`, slot không tồn tại, slot đã bị đặt, đặt trùng đồng thời (concurrency), chỉ thấy lịch của chính mình |
| Xác nhận (staff) | `POST /api/appointments/:id/confirm` | xác nhận lịch `booked` thành công, xác nhận lịch đã confirm/không tồn tại bị từ chối |
| Hủy lịch | `POST /api/appointments/:id/cancel` | chủ lịch hủy được, **patient khác không được hủy hộ**, staff hủy được lịch của bất kỳ ai, hủy lịch không tồn tại / đã hủy rồi đều bị từ chối, slot quay lại `available` sau khi hủy |

**Không kiểm tra** (cố tình): bất kỳ route/service/bảng nào được thêm sau `main` — dù đó
là tính năng gì. Đó là việc của bộ test riêng cho tính năng mới, không thuộc bộ regression
này.

## Vì sao cần bộ test này (bối cảnh)

Một số tính năng mới thường phải **sửa trực tiếp vào code cũ** để gắn hook (ví dụ: hủy
lịch hoặc mở lại slot cần bắn sự kiện cho hàng đợi chờ). Đây chính xác là loại thay đổi
dễ gây regression nhất — sửa 1 dòng trong service cũ, quên xử lý 1 nhánh lỗi, làm sai
status code hoặc message trả về mà không ai để ý vì tính năng mới vẫn chạy đúng. Bộ test
này tồn tại để bắt đúng loại lỗi đó.
