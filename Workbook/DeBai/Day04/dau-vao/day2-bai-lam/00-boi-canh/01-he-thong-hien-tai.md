# 00 · 01 — Hệ thống MedBook hiện tại

> **Mã:** WB2-00-01 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Nguồn:** `source-code/` (đã đối chiếu `src/db/migrate.js`, `src/db/seed.js`, `src/routes/*`, `server.js`), `doc/adr/`, `doc/data-model.md`, `doc/backend-flows.md`; ràng buộc bất biến K-01 → K-10 ở `dau-vao/05-nguyen-tac-chung.md`

> **Bản chi tiết, có dẫn chứng từng dòng code, quy tắc đang thực thi, khoảng trống và lỗi đã tái hiện:** `Workbooks/boi-canh-chung/` (mã `HT-…`). File này là bản tóm tắt phục vụ thiết kế; khi hai bên khác nhau thì `boi-canh-chung/` đúng hơn.

Ảnh chụp hệ thống **đang chạy, trước khi có tính năng mới**. Tính năng mới phải sống chung với nó, không thay thế nó. Mọi thứ trong file này đã đối chiếu với code, không suy ra từ tài liệu.

---

## 1. Kiến trúc

```
Trình duyệt (HTML / CSS / JS thuần)
      │  HTTP + JSON, header X-Demo-User-Id
      ▼
  Express (server.js)
      │
  Routes ──► Services ──► Repositories ──► Pool ──► PostgreSQL 16
  (HTTP)     (nghiệp vụ)   (SQL thuần)     (kết nối)
```

| Tầng | Trách nhiệm | Không được làm |
| --- | --- | --- |
| Route | Nhận request, gọi service, trả `{ data }` hoặc chuyển lỗi qua `next(error)` | Viết SQL, chứa luật nghiệp vụ |
| Service | Luật nghiệp vụ, transaction, ném lỗi có mã HTTP | Đụng `req`/`res`, viết SQL |
| Repository | SQL thuần parameterized | Chứa luật nghiệp vụ, quyết định mã HTTP |
| Pool | Kết nối, cấp `client` cho transaction | — |

Cấu trúc thư mục:

```
server.js                        khởi động, middleware, error handler tập trung
src/db/          pool · migrate · seed
src/routes/      auth · doctors · appointments
src/services/    authService · slotService · appointmentService
src/repositories/ user · doctor · slot · appointment
src/middleware/  demoAuth · requireRole
src/utils/       validate     src/errors.js  httpError(status, message)
public/          index.html · styles.css · js/{state,api,ui,main}.js · js/views/{login,patient,staff}.js
tests/           api.test.js — 14 test tích hợp, không mock
```

---

## 2. Dữ liệu — 6 bảng

| Bảng | Cột chính | Ghi chú quan trọng |
| --- | --- | --- |
| `patients` | `id, name, phone` | **Không có** ngày sinh, mức ưu tiên y tế, chuyên khoa quan tâm |
| `users` | `id, name, email, demo_password, role, patient_id` | `role ∈ {patient, staff}`. `patient_id` rỗng với staff |
| `specializations` | `id, name` | 5 dòng seed |
| `doctors` | `id, name, title, room, specialization_id` | Bác sĩ **không có tài khoản đăng nhập** |
| `slots` | `id, doctor_id, date, start_time, end_time, status` | `status ∈ {available, booked}`. `date` và `time` **tách riêng**, hiểu theo giờ server |
| `appointments` | `id, patient_id, slot_id, status, type, created_at` | `status ∈ {booked, confirmed, cancelled}`; `type ∈ {in_person, online}` |

**Ràng buộc sống còn** — chỉ một lịch hẹn đang hoạt động cho mỗi slot:

```sql
create unique index one_active_appointment_per_slot
  on appointments(slot_id) where status in ('booked', 'confirmed');
```

**Vòng đời hiện có**
- `appointments`: (mới) → `booked` → `confirmed` → `cancelled`; `cancelled` là trạng thái cuối.
- `slots`: `available ⇄ booked`, đổi bằng hai đường — tự động (trong transaction) và thủ công (staff). Staff **không** mở lại được slot đang có lịch hẹn hoạt động.

**Dữ liệu seed:** 5 bệnh nhân, 8 tài khoản (2 nhóm: patient, staff; mật khẩu demo `demo123`), 5 chuyên khoa, 6 bác sĩ, 12 slot với ngày tương đối. Hai bác sĩ (id 1 và 4) cùng chuyên khoa Tim mạch.

---

## 3. API hiện có — 16 endpoint

| Method | Đường dẫn | Quyền | Ghi chú |
| --- | --- | --- | --- |
| GET | `/health` | công khai | |
| GET | `/api/demo-users` | công khai | |
| POST | `/api/demo-login` | công khai | |
| GET | `/api/me` | đăng nhập | |
| GET | `/api/specializations` | đăng nhập | |
| GET | `/api/doctors` | đăng nhập | lọc theo `specializationId`, `q` |
| GET | `/api/doctors/:id/slots` | đăng nhập | lọc theo `date` |
| GET | `/api/slots/available` | đăng nhập | |
| GET | `/api/slots` | staff | |
| POST | `/api/slots` | staff | |
| PUT | `/api/slots/:id` | staff | đổi trạng thái slot |
| POST | `/api/appointments` | patient | đặt lịch |
| GET | `/api/my-appointments` | patient | |
| GET | `/api/appointments` | staff | lọc theo `date` |
| POST | `/api/appointments/:id/confirm` | staff | `booked → confirmed` |
| POST | `/api/appointments/:id/cancel` | patient, staff | bệnh nhân chỉ hủy lịch của mình |

**Quy ước phản hồi:** thành công `{ "data": … }`; lỗi `{ "error": "…" }`; tạo mới → `201`, còn lại → `200`. Thông báo lỗi **tiếng Việt**, không có dấu chấm cuối.

| Tình huống | HTTP | Thông báo |
| --- | :---: | --- |
| Thiếu dữ liệu bắt buộc | 400 | `Thiếu <tên trường>` |
| Sai vai trò / không phải của mình | 403 | `Không đủ quyền` |
| Không tìm thấy | 404 | `Không tìm thấy khung giờ` / `Không tìm thấy lịch hẹn` |
| Slot đã được đặt | 409 | `Khung giờ đã được đặt` |
| Lịch đã hủy | 409 | `Lịch hẹn đã bị hủy` |
| Xác nhận lịch không ở trạng thái chờ | 409 | `Chỉ xác nhận được lịch đang chờ xác nhận` |
| Mở lại slot đang có lịch | 409 | `Không thể mở lại khung giờ đang có lịch hẹn` |
| Lỗi không lường trước | 500 | Ý định là `Lỗi máy chủ`, nhưng **thực tế trả nguyên văn thông báo lỗi**, kể cả của PostgreSQL (HT-GAP-06). Tính năng mới không được kế thừa hành vi này |

---

## 4. Xác thực và phân quyền (ADR-002)

- Không JWT. Frontend lưu `currentUser` trong `localStorage`; mọi request gửi `X-Demo-User-Id: <users.id>`.
- Middleware `demoAuth` tra DB và gán `req.user`; `requireRole('staff' | 'patient')` chặn sai vai trò.
- **Giả mạo được bằng một dòng `curl`** — chủ ý của bản demo.

**Hệ quả:** kiểm quyền **sở hữu** dữ liệu (ví dụ "đây có phải offer của người này không") bắt buộc nằm ở tầng service (K-02).

---

## 5. Quyết định kiến trúc đã có

| ADR | Quyết định | Ràng buộc đặt lên tính năng mới |
| --- | --- | --- |
| 001 | Không ORM | SQL thuần, parameterized (K-01) |
| 002 | Auth demo bằng header | Kiểm quyền sở hữu ở service (K-02) |
| 003 | `slots.status` là dữ liệu denormalized | Đổi `slots.status` chỉ trong transaction (K-03) |
| 004 | Transaction + `FOR UPDATE` + partial unique index | Dùng đúng khuôn này cho thao tác tương tự (K-04) |
| 005 | Migration không phiên bản, chạy mỗi lần khởi động | Idempotent (K-05) |
| 006 | Kiến trúc phân lớp | Không nhảy tầng (K-06) |
| 007 | Frontend JS thuần | Không framework, không build (K-07) |

---

## 6. Hạn chế đã biết ảnh hưởng tính năng mới

| # | Hạn chế | Ảnh hưởng | Nơi xử lý |
| ---: | --- | --- | --- |
| 1 | `patients` không có mức ưu tiên y tế | Luật chọn bệnh nhân cần dữ liệu này | `02-thiet-ke/06-du-lieu.md` (R-04) |
| 2 | Không bảng nào có `updated_at` | Khó truy vết thời điểm đổi trạng thái | Bảng mới có `updated_at` |
| 3 | Không có nhật ký thao tác | Không biết ai làm gì | BR-15, ENT-03 |
| 4 | Giờ hiểu theo giờ server, không múi giờ | Tính hạn trả lời dễ sai | BR-06 dùng `timestamptz` |
| 5 | Migration không rollback | Không quay lui được schema | Chỉ **thêm** bảng mới ⇒ rollback = xoá bảng mới |
| 6 | Không chặn slot chồng giờ của cùng bác sĩ | Ảnh hưởng luật lọc trùng giờ | R-08, ngoài phạm vi |
| 7 | Không có kênh SMS/email/push | Không báo được ngoài app | RISK-06 |
| 8 | Chỉ hai vai trò; bác sĩ không đăng nhập | Story của actor Doctor không thực thi được | US-09 → Won't |

---

## 7. Môi trường chạy

| Thành phần | Giá trị |
| --- | --- |
| Cổng app / PostgreSQL | `4300` / `55432` (máy chủ), `5432` (trong container) |
| Biến môi trường hiện có | `NODE_ENV`, `PORT`, `DATABASE_URL`, `DEMO_AUTH_ENABLED` |
| Node | 20 |
| Dependency runtime | `express`, `pg` — **chỉ 2** (K-08) |
| Lệnh | `npm run db:migrate` · `db:seed` · `lint` · `test` · `start` |
| CI | GitHub Actions: lint → migrate → seed → test, PostgreSQL 16 thật |
