# MedBook — Hướng dẫn sử dụng

## Cách 1 — Chạy trên GitHub Codespaces (khuyên dùng)
Không cần cài Docker/Node/PostgreSQL trên máy — mọi thứ chạy trên trình duyệt.

### Bước 1: Đăng nhập GitHub
1. Vào [github.com](https://github.com) → **Sign in** (nếu chưa có tài khoản thì **Sign up** trước, miễn phí).
2. Đăng nhập xong, vào trang repo: `https://github.com/trhuyyy13/MedBook-Case-Study`.

### Bước 2: Tạo Codespace
1. Bấm nút xanh **Code** ở góc phải trên repo.
2. Chọn tab **Codespaces** → **Create codespace on main**.
3. Đợi vài chục giây tới vài phút để Codespace khởi tạo (lần đầu chậm hơn các lần sau) — trình duyệt sẽ mở ra một cửa sổ VS Code chạy trên web.

### Bước 3: Chạy ứng dụng trong Codespace
Trong terminal của Codespace (menu **Terminal → New Terminal** nếu chưa có sẵn):
```bash
docker compose up --build
```
Đợi log hiện `MedBook đang chạy tại http://localhost:4300`.

### Bước 4: Mở ứng dụng
Codespaces tự phát hiện cổng `4300` đang chạy và hiện thông báo nhỏ ở góc dưới màn hình:
**"Your application running on port 4300 is available."** — bấm **Open in Browser**.

Nếu bỏ lỡ thông báo đó: mở tab **PORTS** ở panel dưới cùng của VS Code (cạnh tab Terminal) →
tìm dòng cổng `4300` → bấm biểu tượng **hình cầu/quả địa cầu** (Open in Browser) ở cột cuối.

> **Chia sẻ link cho người khác xem:** mặc định cổng forward là **Private** (chỉ tài khoản có
> quyền vào repo mới xem được). Muốn share công khai: tab **PORTS** → chuột phải vào dòng cổng
> `4300` → **Port Visibility** → **Public**.
>
> **Đóng Codespace khi xong việc** (tránh tốn giờ miễn phí hàng tháng của GitHub): vào
> [github.com/codespaces](https://github.com/codespaces) → chọn Codespace đang chạy → **Stop
> codespace**, hoặc **Delete** nếu không cần dùng lại.

## Cách 2 — Chạy trên máy local bằng Docker
Cần **Docker Desktop** đang chạy trên máy. Không cần cài Node/PostgreSQL.

```bash
git clone https://github.com/trhuyyy13/MedBook-Case-Study.git
cd MedBook-Case-Study
docker compose up --build
```

Đợi log hiện `MedBook đang chạy tại http://localhost:4300` rồi mở: **http://localhost:4300**
App tự tạo schema + nạp dữ liệu mẫu ở lần chạy đầu.

| Dịch vụ | Cổng |
|---|---|
| Ứng dụng | `4300` |
| PostgreSQL | `55432` |

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

## (Tuỳ chọn) Chạy test
Cần PostgreSQL ở `localhost:55432` (bật bằng `docker compose up -d db`), rồi:

```bash
npm install
npm test
```

`npm test` chạy `node --test --test-concurrency=1 tests/regression-core.test.js` — bộ test
bảo vệ các tính năng cốt lõi (auth, doctors, slots, appointments). Chi tiết mục đích và phạm vi:
[`doc/regression-testing.md`](./doc/regression-testing.md).

> Lưu ý: nếu source đặt trong thư mục **iCloud (Desktop)**, `require` có thể chậm — nên đặt project ở ổ thường.
