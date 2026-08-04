# ADR-002: Xác thực demo bằng header, không dùng JWT

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-07-20
- **Cảnh báo:** Quyết định này **cố ý không an toàn**. Tuyệt đối không mang cách làm này ra sản phẩm thật.

## Bối cảnh

MedBook có hai vai trò với quyền khác nhau, nên bắt buộc phải phân biệt được người dùng. Nhưng mục tiêu của dự án là **dạy về quy trình phát triển phần mềm**, không phải dạy về bảo mật.

Tài liệu [prod.md](../prod.md) đã tuyên bố rõ nằm ngoài phạm vi: JWT thật, refresh token, đặt lại mật khẩu, tự đăng ký tài khoản.

Ba yêu cầu thực tế khi demo:

1. **Chuyển tài khoản nhanh.** Khi trình bày, phải nhảy qua lại giữa bệnh nhân và nhân viên liên tục. Đăng nhập lại mỗi lần rất mất thời gian.
2. **Test dễ viết.** Test tích hợp cần giả lập nhiều vai trò mà không phải mô phỏng cả luồng OAuth.
3. **Vẫn phải thấy được RBAC.** Người học cần hiểu cơ chế phân quyền theo vai trò - đây mới là bài học, không phải cách mã hóa token.

## Các phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| **JWT đầy đủ** (`jsonwebtoken` + `bcrypt`) | Giống thật, có thể mang đi dùng | Thêm 2 thư viện, phải xử lý hết hạn token, làm mới token, lưu token ở đâu. Chiếm mất thời lượng workshop mà không phục vụ bài học chính |
| **Session cookie** (`express-session`) | Đơn giản hơn JWT | Backend phải giữ trạng thái, cần kho lưu session, khó test |
| **Không xác thực gì cả** | Đơn giản nhất | Không minh họa được RBAC - mất luôn nội dung cần dạy |
| **Đăng nhập demo + header** ✅ | Có màn hình đăng nhập thật, có RBAC thật, không cần thư viện nào | Giả mạo được dễ dàng |

## Quyết định

**Xác thực gồm hai bước, cả hai đều là bản rút gọn có chủ đích.**

### Bước 1 - Đăng nhập

`POST /api/demo-login` nhận email và mật khẩu, so sánh **trực tiếp chuỗi thường** với cột `users.demo_password`:

```js
const user = await userRepository.findForLoginByEmail(normalizedEmail);
if (!user || user.demo_password !== demoPassword) {
  throw httpError(401, "Sai email hoặc mật khẩu demo");
}
```

Email là **con đường đăng nhập duy nhất**. Không có cách nào đăng nhập mà bỏ qua bước kiểm tra mật khẩu.

Không băm mật khẩu. Mọi tài khoản dùng chung mật khẩu `demo123`.

Kết quả trả về đã lọc bỏ cột `demo_password` bằng `stripPrivateUserFields()`.

### Bước 2 - Các request sau đó

Client gửi kèm header `X-Demo-User-Id: <id>`. Middleware `demoAuth` tra database và gán vào `req.user`:

```js
req.user = await authService.authenticateByHeader(req.header("X-Demo-User-Id"));
```

**Không phát token. Không có session. Backend không nhớ gì giữa các request.**

### Phần duy nhất làm nghiêm túc: phân quyền

Đây mới là nội dung cần dạy, nên được làm đầy đủ theo hai mức:

**Mức 1 - Theo vai trò**, dùng middleware:

```js
router.get("/slots", demoAuth, requireRole("staff"), handler);
```

**Mức 2 - Theo quyền sở hữu**, nằm trong service vì cần đọc database:

```js
if (user.role === "patient" && appointment.patient_id !== user.patientId) {
  throw httpError(403, "Không đủ quyền");
}
```

Phân biệt hai mức này là bài học quan trọng: middleware chỉ biết *bạn là vai gì*, nó không biết *bản ghi này có phải của bạn không*.

## Hệ quả

### Tích cực

- **Không thêm thư viện nào.** Vẫn chỉ `express` và `pg`.
- **Test cực gọn.** Đổi vai trò chỉ là đổi một con số:
  ```js
  headers(1)   // bệnh nhân
  headers(2)   // nhân viên
  ```
  Không cần đăng nhập, không cần mô phỏng token.
- **Demo mượt.** Ô "Tài khoản nhanh" trên giao diện cho phép nhảy vai trò trong 2 giây.
- **RBAC vẫn dạy được đầy đủ**, kể cả phần khó là phân quyền theo quyền sở hữu.
- **Dễ nâng cấp sau này.** Chỉ cần thay ruột hàm `authenticateByHeader()` thành giải mã JWT, mọi route giữ nguyên không đổi một dòng.

### Tiêu cực - phải nêu rõ ràng

| Lỗ hổng | Mức độ | Chi tiết |
| --- | --- | --- |
| **Giả mạo danh tính bằng một dòng lệnh** | Nghiêm trọng | `curl -H "X-Demo-User-Id: 2" ...` là thành nhân viên. Không cần biết mật khẩu |
| **Mật khẩu lưu chữ thường** | Nghiêm trọng | Truy cập được database là có toàn bộ mật khẩu |
| **Không có thời hạn** | Trung bình | Header không bao giờ hết hạn |
| **Không chống dò mật khẩu** | Trung bình | Không giới hạn số lần thử đăng nhập |
| **Truy vấn database mỗi request** | Thấp | Mỗi request tốn thêm một `SELECT`. JWT không cần vì thông tin nằm trong token |

### Bắt buộc phải làm

Vì đây là lựa chọn cố ý không an toàn, phải cảnh báo ở đủ ba nơi:

1. `README.md` - đã có: *"Backend vẫn có middleware demo auth đọc `X-Demo-User-Id` để minh họa RBAC, nhưng không verify token production."*
2. Giao diện đăng nhập - đã có nhãn "Demo AI-assisted SDLC" và ghi rõ mật khẩu chung.
3. Tài liệu này.

### Muốn nâng cấp lên thật thì làm gì

Nếu MedBook đi xa hơn demo, thứ tự ưu tiên:

1. ~~Xóa nhánh đăng nhập bằng `userId` không cần mật khẩu.~~ **Đã làm.** Nhánh này từng cho phép gửi `{ userId: 2 }` là đăng nhập thành công mà không cần mật khẩu. Nay `login()` chỉ nhận email + mật khẩu, và hàm `findForLoginById()` đã bị xóa khỏi repository.
2. Băm mật khẩu bằng `bcrypt` (10-12 vòng) hoặc `argon2`.
3. Phát JWT có thời hạn ngắn, lưu trong cookie `httpOnly` + `secure` + `sameSite`.
4. Thay ruột `authenticateByHeader()` thành xác minh chữ ký JWT. **Không route nào phải sửa.**
5. Thêm giới hạn số lần đăng nhập sai và ghi log các lần thất bại.
6. Chuyển toàn bộ sang HTTPS.

Bước 4 chính là lợi ích của việc đã tách middleware ngay từ đầu - điểm cần nâng cấp chỉ nằm ở một hàm duy nhất.

### Test bảo vệ

`tests/regression-core.test.js` có hai ca chốt lại hành vi đăng nhập:

- `demo login requires a correct password` - sai mật khẩu phải nhận `401`.
- `demo login cannot be bypassed with userId alone` - gửi `{ userId: 2 }` phải nhận `400`, không được đăng nhập.
