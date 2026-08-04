# MedBook — Case Study

**Hệ thống nền cho workbook 5 ngày _AI-Driven Software Development Lifecycle_.**

MedBook là một ứng dụng web quản lý lịch khám bệnh viện **đã được xây dựng sẵn và chạy được**. Học viên không phải dựng dự án từ đầu — toàn bộ khung hệ thống, database schema và API cơ bản đã có trong repo này. Việc của học viên là dùng AI để **phân tích, thiết kế và bổ sung một tính năng mới** vào codebase đang hoạt động, đi qua đủ 5 phase của SDLC.

> ⚠️ **Đây là bản demo phục vụ giảng dạy, không phải sản phẩm production.** Mật khẩu lưu dạng chữ thường, xác thực bằng header giả lập. Đừng triển khai ra Internet với dữ liệu thật. Chi tiết lý do: [ADR-002](./doc/adr/002-demo-auth.md).

---

## Mục lục

- [Chạy trong 2 phút](#chạy-trong-2-phút)
- [Tài khoản demo](#tài-khoản-demo)
- [Bối cảnh case study](#bối-cảnh-case-study)
- [Lộ trình 5 ngày](#lộ-trình-5-ngày)
- [Kiến trúc](#kiến-trúc)
- [API](#api)
- [Chạy không dùng Docker](#chạy-không-dùng-docker)
- [Kiểm thử và lint](#kiểm-thử-và-lint)
- [Xử lý sự cố](#xử-lý-sự-cố)
- [Tài liệu kỹ thuật](#tài-liệu-kỹ-thuật)

---

## Chạy trong 2 phút

**Cần có:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) đang chạy. Không cần cài Node.js hay PostgreSQL.

```bash
git clone https://github.com/trhuyyy13/MedBook-Case-Study.git
cd MedBook-Case-Study
docker compose up --build
```

Đợi tới khi log hiện `MedBook đang chạy tại http://localhost:4300`, rồi mở:

```
http://localhost:4300
```

App tự tạo schema và nạp dữ liệu mẫu ở lần khởi động đầu tiên — mở ra là bấm được ngay.

### Cổng sử dụng

| Dịch vụ | Cổng | Ghi chú |
| --- | --- | --- |
| Ứng dụng MedBook | `4300` | Express phục vụ **cả API lẫn giao diện** — không tách frontend/backend riêng |
| PostgreSQL | `55432` | Cổng lạ để tránh đụng PostgreSQL 5432 có sẵn trên máy |

Nếu cổng bị chiếm, sửa `docker-compose.yml` (đổi vế trái của `"4300:4300"`) rồi chạy lại.

### Các lệnh Docker hay dùng

```bash
docker compose up --build      # dựng và chạy
docker compose up -d           # chạy nền
docker compose logs -f app     # xem log ứng dụng
docker compose ps              # xem trạng thái container
docker compose down            # dừng, GIỮ lại dữ liệu
docker compose down -v         # dừng và XÓA SẠCH dữ liệu (reset về ban đầu)
```

---

## Tài khoản demo

Màn hình đầu tiên là đăng nhập. Chọn nhanh trong ô **"Tài khoản có sẵn"** hoặc nhập email.

**Mật khẩu cho mọi tài khoản: `demo123`**

| Vai trò | Email | Làm được gì |
| --- | --- | --- |
| Bệnh nhân | `an@medbook.local` | Tìm bác sĩ, giữ chỗ, hủy lịch của mình |
| Bệnh nhân | `linh@medbook.local` | |
| Bệnh nhân | `huy@medbook.local` | |
| Bệnh nhân | `nhi@medbook.local` | |
| Bệnh nhân | `nam@medbook.local` | |
| Nhân viên | `mai.staff@medbook.local` | Xem toàn bộ lịch hẹn, xác nhận/hủy, quản lý khung giờ |
| Nhân viên | `khanh.staff@medbook.local` | |
| Nhân viên | `lan.staff@medbook.local` | |

### Thử luồng demo trong 1 phút

1. Đăng nhập bằng `an@medbook.local`.
2. Chọn một bác sĩ → **Xem giờ** → **Giữ chỗ**.
3. Đăng xuất, đăng nhập lại bằng `mai.staff@medbook.local`.
4. Thấy lịch vừa đặt ở trạng thái *Chờ xác nhận* → bấm **Xác nhận**.
5. Ở panel **Lịch làm việc**, thêm một khung giờ mới hoặc **Chặn giờ** khi bác sĩ bận.
6. Quay lại tài khoản bệnh nhân để thấy trạng thái đã cập nhật.

Nút **Giao diện tối** nằm cuối thanh bên trái.

---

## Bối cảnh case study

### Tính năng đã có sẵn (pre-built)

**Phía bệnh nhân**

- Tìm bác sĩ theo tên, theo chuyên khoa
- Xem lịch làm việc và khung giờ còn trống của bác sĩ
- Đặt lịch khám (trực tiếp hoặc online)
- Hủy lịch hẹn của mình

**Phía nhân viên**

- Quản lý lịch làm việc: thêm khung giờ, chặn/mở lại khung giờ
- Xem danh sách lịch hẹn theo ngày
- Xác nhận hoặc hủy lịch hẹn

### 🎯 Tính năng CHƯA có — phần học viên sẽ xây

> Hệ thống hiện **chưa có bất kỳ cơ chế nào xử lý khi một khung giờ bị trống đột ngột**. Nhân viên đang xử lý thủ công hoàn toàn: gọi điện hoặc nhắn tin cho từng bệnh nhân trong danh sách chờ.

**Yêu cầu mới xuyên suốt 5 ngày — Quản lý linh hoạt danh sách chờ (waiting list):**

- Khi một khung giờ trở nên khả dụng, hệ thống **tự động xác định bệnh nhân phù hợp nhất** trong danh sách chờ
- Tiêu chí chọn: mức độ ưu tiên y tế, thời gian chờ, sự phù hợp chuyên khoa / bác sĩ
- Hệ thống gửi **đề xuất** cho bệnh nhân → bệnh nhân phản hồi trong X phút
- Nếu từ chối hoặc không phản hồi → chuyển sang bệnh nhân tiếp theo
- Xử lý xung đột lịch, thông báo đầy đủ cho tất cả các bên

Đây là tính năng **cố ý để trống**. Codebase hiện tại là điểm xuất phát, không phải lời giải.

---

## Lộ trình 5 ngày

| Ngày | Chủ đề | Có code? | Sản phẩm cần nộp |
| --- | --- | --- | --- |
| **1** | From Traditional SDLC to AI-Driven SDLC | ❌ | SDLC Artifact Map · AI Opportunity Matrix · Human-AI Responsibility Matrix · Future-State Workflow |
| **2** | AI-Driven Requirement Engineering & System Design | ❌ | AI-Assisted Requirement Package (user story + acceptance criteria Given-When-Then) · Architecture Blueprint |
| **3** | AI-Driven Development & Quality Engineering | ✅ | Development Package · Testing Package · Code Review Report |
| **4** | Human-AI Collaboration & Governance | ❌ | AI Failure Analysis Report · Human-AI Review Workflow · AI Governance Checklist |
| **5** | Designing AI-Driven SE Workflows (Capstone) | ❌ | AI Opportunity Map (updated) · Responsibility Matrix (final) · AI Validation Workflow · Success Metrics Proposal |

**Ngày 3 là ngày duy nhất chạm vào code.** Chuẩn bị trước khi vào Day 3:

- Toàn bộ artifact từ Day 2 (user story, acceptance criteria, architecture blueprint)
- Repo này đã clone và **chạy được trên máy** — làm theo mục [Chạy trong 2 phút](#chạy-trong-2-phút)
- Claude Code hoặc Claude.ai đang mở

Chi tiết activity, prompt gợi ý và checklist từng ngày: [`MedBook_CaseStudy_5Days.pdf`](./MedBook_CaseStudy_5Days.pdf).

---

## Kiến trúc

```
Trình duyệt (HTML/CSS/Vanilla JS)
        │  HTTP + JSON, header X-Demo-User-Id
        ▼
   Express (server.js)
        │
   Routes  ──►  Services  ──►  Repositories  ──►  Pool
   (HTTP)      (nghiệp vụ)      (SQL thuần)      (kết nối)
                                                     │
                                                     ▼
                                               PostgreSQL 16
```

Nguyên tắc: mỗi tầng chỉ gọi tầng ngay dưới nó, không nhảy cóc. Route nhận request, Service giữ quy tắc nghiệp vụ và transaction, Repository giữ toàn bộ SQL.

### Cấu trúc thư mục

```
.
├── server.js                  Khởi động, middleware, error handler
├── src/
│   ├── db/                    pool, migrate, seed
│   ├── routes/                3 file — tầng HTTP
│   ├── services/              3 file — nghiệp vụ, transaction
│   ├── repositories/          4 file — SQL
│   ├── middleware/            demoAuth, requireRole
│   ├── utils/                 validate
│   └── errors.js
├── public/                    Frontend, không có bước build
│   ├── index.html
│   ├── styles.css
│   └── js/                    state, api, ui (time rail), main, views/
├── tests/regression-core.test.js  47 test — bảo vệ tính năng cũ khi thêm tính năng mới
├── doc/                       Tài liệu kỹ thuật (xem cuối README)
└── docker-compose.yml
```

### Công nghệ

Node.js 20 · Express 4 · PostgreSQL 16 · `pg` (SQL thuần, **không ORM**) · Vanilla JS (**không framework**, không bước build) · Docker Compose · GitHub Actions

Chỉ có 2 dependency chạy thật: `express` và `pg`. Lý do từng lựa chọn nằm trong [ADR](./doc/adr/).

### Mô hình dữ liệu

6 bảng: `users`, `patients`, `specializations`, `doctors`, `slots`, `appointments`.

Quy tắc nghiệp vụ then chốt — **một khung giờ chỉ có tối đa một lịch hẹn đang hoạt động** — được bảo vệ bằng 3 lớp: kiểm tra trong service, `SELECT ... FOR UPDATE` trong transaction, và một partial unique index ở database. Chi tiết: [ADR-004](./doc/adr/004-transaction-lock-booking.md).

ERD đầy đủ và từ điển dữ liệu từng cột: [`doc/data-model.md`](./doc/data-model.md).

---

## API

Mọi endpoint trả JSON. Thành công → `{ "data": ... }`, thất bại → `{ "error": "..." }`.

Trừ 3 endpoint công khai đầu tiên, tất cả đều cần header `X-Demo-User-Id: <id>`.

| Method | Đường dẫn | Vai trò | Mô tả |
| --- | --- | --- | --- |
| `GET` | `/health` | công khai | Kiểm tra app và database |
| `GET` | `/api/demo-users` | công khai | Danh sách tài khoản demo |
| `POST` | `/api/demo-login` | công khai | Đăng nhập bằng `{ email, password }` |
| `GET` | `/api/me` | đã đăng nhập | Thông tin người dùng hiện tại |
| `GET` | `/api/specializations` | đã đăng nhập | Danh sách chuyên khoa |
| `GET` | `/api/doctors?specializationId=&q=` | đã đăng nhập | Tìm bác sĩ |
| `GET` | `/api/doctors/:id/slots?date=` | đã đăng nhập | Khung giờ trống của một bác sĩ |
| `GET` | `/api/slots/available` | đã đăng nhập | Tất cả khung giờ trống |
| `GET` | `/api/slots?date=` | staff | Khung giờ để điều phối |
| `POST` | `/api/slots` | staff | Thêm khung giờ |
| `PUT` | `/api/slots/:id` | staff | Sửa giờ hoặc trạng thái |
| `POST` | `/api/appointments` | patient | Đặt lịch `{ slotId, type }` |
| `GET` | `/api/my-appointments` | patient | Lịch của tôi |
| `GET` | `/api/appointments?date=` | staff | Lịch hẹn theo ngày |
| `POST` | `/api/appointments/:id/confirm` | staff | Xác nhận lịch |
| `POST` | `/api/appointments/:id/cancel` | patient, staff | Hủy lịch |

### Ví dụ gọi bằng curl

```bash
# Kiểm tra app sống
curl http://localhost:4300/health

# Đăng nhập
curl -X POST http://localhost:4300/api/demo-login \
  -H "Content-Type: application/json" \
  -d '{"email":"an@medbook.local","password":"demo123"}'

# Xem khung giờ trống (user id 1 = bệnh nhân An)
curl http://localhost:4300/api/slots/available -H "X-Demo-User-Id: 1"

# Đặt lịch
curl -X POST http://localhost:4300/api/appointments \
  -H "Content-Type: application/json" -H "X-Demo-User-Id: 1" \
  -d '{"slotId":1,"type":"online"}'
```

Sơ đồ tuần tự từng luồng và bảng đầy đủ 16 mã lỗi: [`doc/backend-flows.md`](./doc/backend-flows.md).

---

## Chạy không dùng Docker

Chỉ nên dùng khi bạn muốn sửa code và chạy lại nhanh.

**Cần có:** Node.js 20+ và một PostgreSQL đang chạy.

```bash
npm install

# Trỏ tới database của bạn
export DATABASE_URL="postgres://medbook:medbook@localhost:55432/medbook"

npm run db:migrate    # tạo bảng
npm run db:seed       # nạp dữ liệu mẫu
npm start             # chạy tại http://localhost:4300
```

Mẹo: chỉ bật database bằng Docker rồi chạy Node ở máy thật —

```bash
docker compose up db -d
export DATABASE_URL="postgres://medbook:medbook@localhost:55432/medbook"
npm start
```

Các biến môi trường (xem `.env.example`):

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `PORT` | `4300` | Cổng ứng dụng |
| `DATABASE_URL` | `postgres://medbook:medbook@localhost:55432/medbook` | Chuỗi kết nối PostgreSQL |

---

## Kiểm thử và lint

```bash
npm run lint                    # ESLint
npm test                        # 47 test regression — CẦN database đang chạy
npm run db:seed -- --reset      # xóa sạch và nạp lại dữ liệu mẫu
```

Test gọi HTTP thật vào Express và query thật vào PostgreSQL — không mock. Mỗi ca test tự reset dữ liệu trước khi chạy nên kết quả ổn định. Các file test chạy **tuần tự** (`--test-concurrency=1`) vì cùng dùng chung 1 database và tự reset dữ liệu — chạy song song sẽ deadlock ở bước migrate/reset.

`tests/regression-core.test.js` chỉ test các tính năng đã có ở `main` (auth, doctors, slots, appointments) và được thiết kế để chạy lại **sau khi bạn thêm tính năng mới**, nhằm phát hiện sớm nếu code mới lỡ làm hỏng luồng cũ. Chi tiết phạm vi và lý do: [`doc/regression-testing.md`](./doc/regression-testing.md).

```bash
# Cách chạy test nhanh nhất
docker compose up db -d
DATABASE_URL="postgres://medbook:medbook@localhost:55432/medbook" npm test
```

CI trên GitHub Actions tự chạy `lint → migrate → seed → test` với một PostgreSQL 16 thật mỗi khi có Pull Request hoặc push lên `main`. Xem [`doc/cicd.md`](./doc/cicd.md).

---

## Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| `port is already allocated` | Cổng 4300 hoặc 55432 đang bị chiếm | Đổi vế trái trong `docker-compose.yml`, hoặc `lsof -i :4300` để tìm tiến trình đang giữ |
| Trang trắng, không load được | App chưa khởi động xong | `docker compose logs -f app`, đợi dòng `MedBook đang chạy tại...` |
| `Không kết nối được PostgreSQL` | Database chưa sẵn sàng | App tự thử lại 30 lần. Nếu vẫn lỗi: `docker compose down -v` rồi `up --build` |
| Dữ liệu lộn xộn sau khi thao tác | Đã đặt/hủy nhiều lịch khi demo | `docker compose down -v && docker compose up --build` để về trạng thái gốc |
| `npm test` báo lỗi kết nối | Chưa bật database, hoặc thiếu `DATABASE_URL` | `docker compose up db -d` rồi đặt biến `DATABASE_URL` như mục trên |
| Sửa code mà không thấy đổi | Frontend cần tải lại; backend cần khởi động lại container | Frontend: `Cmd/Ctrl + Shift + R`. Backend: `docker compose restart app` |

---

## Tài liệu kỹ thuật

| Tài liệu | Nội dung |
| --- | --- |
| [`doc/prod.md`](./doc/prod.md) | PRD — phạm vi sản phẩm, vai trò, quy tắc nghiệp vụ, API contract |
| [`doc/data-model.md`](./doc/data-model.md) | ERD, từ điển dữ liệu từng cột, vòng đời trạng thái, index, hạn chế đã biết |
| [`doc/backend-flows.md`](./doc/backend-flows.md) | Sơ đồ tuần tự từng luồng, cách xác thực, xử lý lỗi, khi nào cần transaction |
| [`doc/adr/`](./doc/adr/) | 7 quyết định kiến trúc — vì sao không ORM, vì sao auth kiểu demo, vì sao chống đặt trùng như vậy |
| [`doc/cicd.md`](./doc/cicd.md) | Quy trình kiểm tra tự động |
| [`MedBook_CaseStudy_5Days.pdf`](./MedBook_CaseStudy_5Days.pdf) | Workbook đầy đủ 5 ngày |

Nếu bạn chuẩn bị sửa code ở Day 3, đọc `doc/backend-flows.md` trước — nó cho thấy một request đi qua những file nào.

---

## Giới hạn đã biết

Những điều dưới đây là **cố ý**, đã ghi lý do trong [ADR](./doc/adr/), không phải thiếu sót:

- Mật khẩu lưu dạng chữ thường, không băm
- Xác thực bằng header `X-Demo-User-Id` — giả mạo được bằng một dòng `curl`
- Migration không có phiên bản, chạy tự động mỗi lần khởi động
- Không có JWT, refresh token, đặt lại mật khẩu, tự đăng ký

Danh sách nợ kỹ thuật thật (khác với các mục trên) nằm ở cuối [`doc/data-model.md`](./doc/data-model.md#8-hạn-chế-đã-biết).
