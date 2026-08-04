# ADR-007: Frontend vanilla JS, không dùng framework

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-07-20

## Bối cảnh

Giao diện MedBook có hai màn hình chính (bệnh nhân và nhân viên), một màn hình đăng nhập, vài bộ lọc và danh sách. Không có luồng nhiều bước phức tạp, không có trạng thái lồng sâu.

Yêu cầu từ [prod.md](../prod.md):

> "Frontend cần đẹp, dễ dùng, tiếng Việt đầy đủ, nhưng không làm nghiệp vụ quá phức tạp."
> "Không dùng framework frontend nặng."

Điều kiện thực tế: người xem demo có thể mở thẳng file `public/js/views/patient.js` trong lúc trình bày và đọc hiểu ngay - đây là một phần của giá trị dạy học.

## Các phương án đã cân nhắc

| Phương án | Ưu | Nhược |
| --- | --- | --- |
| **React + Vite** | Quen thuộc, hệ sinh thái lớn, quản lý trạng thái tốt | Cần bước build, thêm `node_modules` nặng, thêm cấu hình. Người xem không đọc được code đã build |
| **Vue / Svelte** | Nhẹ hơn React | Vẫn cần build, vẫn phải học cú pháp riêng |
| **htmx** | Rất ít JavaScript | Backend phải trả HTML thay vì JSON - phá vỡ thiết kế API hiện tại |
| **Vanilla JS + ES Modules** ✅ | Không build, trình duyệt chạy thẳng, ai biết JavaScript là đọc được | Phải tự viết render, dễ dính lỗi XSS nếu bất cẩn |

## Quyết định

**Dùng JavaScript thuần với ES Modules gốc của trình duyệt.** Không thư viện, không bước build.

```html
<script type="module" src="/js/main.js"></script>
```

Express phục vụ thư mục `public/` bằng `express.static()`. Sửa file là F5 thấy ngay.

### Cách tổ chức

```
public/js/
├── state.js          Trạng thái dùng chung + bảng nhãn tiếng Việt
├── api.js            Gọi API + tiện ích (escapeHtml, toast, today)
├── ui.js             Thành phần hiển thị: time rail, chip, monogram, nhãn ngày
├── main.js           Khởi động, gắn sự kiện, đổi sáng/tối, điều phối
└── views/
    ├── login.js      Màn hình đăng nhập
    ├── patient.js    Màn hình bệnh nhân
    └── staff.js      Màn hình nhân viên
```

Nguyên tắc phân chia: `state` và `api` là nền tảng, `ui` là các mảnh giao diện dùng lại được, `views` ghép chúng thành màn hình, `main` chỉ nối dây.

### Bốn quy ước bắt buộc

**1. Một nơi giữ trạng thái duy nhất**

```js
export const state = {
  user: null, users: [], specializations: [], doctors: [], selectedDoctorId: null,
};
```

Không dùng biến toàn cục rải rác. Mọi module đều `import { state }`. Đây là bản rút gọn cực đơn giản của ý tưởng "một kho trạng thái chung".

**2. Mọi giá trị đưa vào HTML đều phải qua `escapeHtml()`**

Đây là quy tắc **không có ngoại lệ**. Vì code dùng `innerHTML` để vẽ, dữ liệu chưa lọc sẽ tạo lỗ hổng XSS:

```js
// ĐÚNG
`<strong>${escapeHtml(doctor.name)}</strong>`

// SAI - nếu tên bác sĩ chứa <script> thì thành lỗ hổng
`<strong>${doctor.name}</strong>`
```

Hàm này nằm ở `api.js`, xử lý 5 ký tự nguy hiểm: `&`, `<`, `>`, `"`, `'`.

**3. Bảng nhãn tiếng Việt tập trung một chỗ**

```js
export const labels = {
  patient: "Bệnh nhân",  staff: "Nhân viên",
  booked: "Chờ xác nhận", confirmed: "Đã xác nhận", cancelled: "Đã hủy",
  in_person: "Khám trực tiếp", online: "Tư vấn online", available: "Còn trống",
};
```

Backend trả về mã kỹ thuật (`booked`), frontend dịch sang tiếng Việt. Sửa cách gọi tên chỉ cần sửa một chỗ. Nếu sau này cần đa ngôn ngữ, đây là điểm mở rộng sẵn có.

**4. Vẽ lại toàn bộ, không cập nhật từng phần**

Sau mỗi thao tác ghi, gọi lại API và vẽ lại cả danh sách:

```js
await api("/api/appointments", { method: "POST", ... });
toast("Đặt lịch thành công");
await Promise.all([loadSlots(), loadMyAppointments(), loadDoctors()]);
```

Kém hiệu quả hơn cập nhật từng phần, nhưng **không bao giờ lệch** với dữ liệu thật trên server. Với danh sách vài chục dòng thì không ai nhận ra khác biệt.

### Hệ thống thiết kế

Không có framework CSS. Toàn bộ giao diện dựng trên một bộ biến CSS trong `public/styles.css`, chia ba nhóm: màu, chữ, khoảng cách.

**Thành phần chủ đạo là "time rail"** (`public/js/ui.js`). Thứ đặc trưng nhất của thế giới bệnh viện là lịch — một ngày bị cắt thành các khung nửa tiếng — nên mọi danh sách trong app đều dùng chung một cấu trúc: nhóm theo ngày, một trục dọc, cột giờ thẳng hàng, và vạch "Bây giờ" trên nhóm của ngày hôm nay. Cấu trúc này mang thông tin thật (thứ tự thời gian), không phải trang trí.

Vì rail giả định đọc xuôi theo giờ, `renderRail()` tự sắp xếp tăng dần trong mỗi ngày — API trả lịch hẹn theo thứ tự giảm dần nên nếu không sắp lại, vạch "Bây giờ" sẽ nằm sai chỗ.

**Chữ số dùng font đẳng chiều với `tabular-nums`** cho mọi giờ, ngày, số phòng, số điện thoại và số liệu. Các cột nhờ vậy thẳng hàng như bản in lịch trực.

**Hai chế độ màu, mặc định sáng.** Tất cả màu đều là biến, khai báo hai lần: `:root` cho giao diện sáng và `:root[data-theme="dark"]` cho giao diện tối.

App **không** đọc `prefers-color-scheme` — người mở lần đầu luôn thấy giao diện sáng, kể cả khi máy đang để chế độ tối. Đây là lựa chọn có chủ đích: bản demo hay được trình chiếu qua máy chiếu, nơi nền sáng dễ đọc hơn hẳn, và người trình bày không nên bị bất ngờ vì thiết lập của máy.

Muốn dùng nền tối thì bấm nút trong thanh bên; lựa chọn lưu ở `localStorage.medbookTheme` và được áp bằng một đoạn script nội tuyến trong `<head>` để trang không chớp màu khi tải lại. `color-scheme` cũng được đặt theo chế độ để date/time picker gốc của trình duyệt khớp màu.

### Giao tiếp giữa các màn hình

Khi nhân viên hủy một lịch, cả danh sách lịch hẹn lẫn danh sách slot đều phải tải lại. Thay vì để `staff.js` gọi hàm của module khác (gây phụ thuộc vòng), dùng sự kiện của trình duyệt:

```js
// staff.js phát tín hiệu
window.dispatchEvent(new CustomEvent("medbook:reload"));

// main.js lắng nghe và điều phối
window.addEventListener("medbook:reload", loadAll);
```

Các view không cần biết đến nhau. `main.js` là nơi duy nhất biết toàn cảnh.

## Hệ quả

### Tích cực

- **Không có bước build.** Không `npm run build`, không webpack, không Vite. Sửa file là chạy.
- **Đọc là hiểu.** Biết JavaScript là đọc được ngay, không cần biết vòng đời component hay hook.
- **Dockerfile cực gọn.** Chỉ cần chép file, không có giai đoạn build.
- **`node_modules` nhẹ.** Chỉ có `express`, `pg` và `eslint`.
- **Tải nhanh.** Không có gói JavaScript hàng trăm KB.
- **Dùng đúng tính năng chuẩn của trình duyệt.** ES Modules, `fetch`, `CustomEvent`, `classList` - đều là kiến thức không bao giờ lỗi thời.

### Tiêu cực

- **Tự viết render bằng chuỗi HTML.** Dài dòng hơn JSX và dễ sai cú pháp hơn.
- **Nguy cơ XSS luôn rình rập.** Chỉ cần một chỗ quên `escapeHtml()` là có lỗ hổng. Framework hiện đại tự lo việc này.
- **Gắn sự kiện thủ công sau mỗi lần vẽ.** Vì `innerHTML` xóa sạch phần tử cũ, phải gắn lại:
  ```js
  el("doctorList").querySelectorAll("[data-doctor]").forEach((button) => {
    button.addEventListener("click", () => loadSlots(...));
  });
  ```
  Quên bước này là nút bấm không phản hồi. Có thể cải thiện bằng cách gắn sự kiện lên phần tử cha một lần duy nhất.
- **Không có kiểm tra kiểu.** Gõ sai tên trường (`startTime` thành `starttime`) chỉ hiện ra khi chạy, dưới dạng chữ `undefined` trên màn hình.
- **Vẽ lại toàn bộ sẽ chậm nếu dữ liệu lớn.** Vài trăm dòng trở lên sẽ thấy giật.
- **Không có test cho frontend.** Chỉ có test cho backend. Kiểm thử giao diện đang làm thủ công.

### Khôi phục phiên đăng nhập - đã sửa

`login.js` từng ghi `localStorage.setItem("medbookUserId", ...)` nhưng **không nơi nào đọc lại**. Hàm `boot()` luôn gọi `showLogin()`, nên người dùng F5 là bị đăng xuất.

Nay có hàm `restoreSession()` trong `login.js`:

```js
export async function restoreSession() {
  const savedId = localStorage.getItem("medbookUserId");
  if (!savedId) return false;

  state.user = { id: Number(savedId) };   // để api() gửi được header
  try {
    state.user = await api("/api/me");     // server xác nhận user còn tồn tại
    showApp();
    return true;
  } catch (error) {
    state.user = null;
    localStorage.removeItem("medbookUserId");
    return false;
  }
}
```

`boot()` gọi hàm này trước khi quyết định hiện màn hình nào:

```js
if (await restoreSession()) {
  await loadAfterLogin();
} else {
  showLogin();
}
```

Điểm quan trọng: **không tin dữ liệu trong `localStorage`.** Nó chỉ dùng để gợi ý ID; danh tính thật lấy từ phản hồi của `GET /api/me`. Nếu tài khoản đã bị xóa, API trả 401 và phiên bị dọn sạch.

### Khi nào cần xem lại

Nên chuyển sang framework nếu:

- Số màn hình vượt khoảng 5-6, hoặc cần định tuyến nhiều cấp.
- Cần cập nhật thời gian thực (WebSocket) - lúc đó vẽ lại toàn bộ không còn khả thi.
- Xuất hiện form nhiều bước với trạng thái phức tạp.
- Nhóm cần TypeScript để có kiểm tra kiểu.
- Có bảng dữ liệu hàng nghìn dòng.

Ở phạm vi hiện tại, thêm framework là thêm công cụ mà không giải quyết vấn đề nào đang có.
