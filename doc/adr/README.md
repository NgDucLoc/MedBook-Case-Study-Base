# ADR - Nhật ký quyết định kiến trúc

## ADR là gì?

**ADR = Architecture Decision Record** - biên bản ghi lại một quyết định kỹ thuật quan trọng.

Mỗi ADR là một file ngắn trả lời ba câu hỏi:

1. **Bối cảnh** - Lúc đó chúng ta đang đứng trước vấn đề gì?
2. **Quyết định** - Chúng ta chọn làm gì?
3. **Hệ quả** - Chọn vậy thì được gì, mất gì?

## Vì sao cần viết?

Code cho bạn biết **hệ thống đang làm gì**, nhưng không cho biết **vì sao lại làm như vậy**.

Sáu tháng sau, một người mới vào dự án sẽ hỏi:

> "Sao không dùng ORM cho nhanh?"
> "Sao mật khẩu lại để chữ thường thế này?"
> "Sao `slots` có cột `status` trong khi suy ra từ `appointments` được?"

Không có ADR, bạn phải giải thích lại từ đầu mỗi lần. Tệ hơn, người mới có thể tưởng đó là **lỗi** và "sửa" đi, phá vỡ một quyết định vốn có chủ đích.

ADR biến kiến thức nằm trong đầu một người thành tài sản chung của cả nhóm.

## Nguyên tắc viết

- **Ngắn.** Một trang là đủ. Dài quá không ai đọc.
- **Không sửa lịch sử.** ADR đã ghi thì không xóa. Đổi ý thì viết ADR mới và đánh dấu ADR cũ là `Đã thay thế`.
- **Chỉ ghi quyết định quan trọng.** Đặt tên biến không phải quyết định kiến trúc. Chọn không dùng ORM thì có.
- **Trung thực về nhược điểm.** Phần "hệ quả tiêu cực" là phần giá trị nhất. Một ADR chỉ toàn ưu điểm là một ADR không đáng tin.

## Trạng thái

| Trạng thái | Ý nghĩa |
| --- | --- |
| `Đề xuất` | Đang bàn, chưa chốt |
| `Chấp nhận` | Đã chốt và đang áp dụng |
| `Đã thay thế` | Không còn đúng nữa, xem ADR thay thế |
| `Bãi bỏ` | Đã hủy, không thay bằng gì |

## Danh sách ADR của MedBook

| # | Quyết định | Trạng thái |
| --- | --- | --- |
| [001](./001-no-orm.md) | Dùng SQL thuần với `pg`, không dùng ORM | Chấp nhận |
| [002](./002-demo-auth.md) | Xác thực demo bằng header, không dùng JWT | Chấp nhận |
| [003](./003-slot-status-denormalized.md) | Lưu `status` trong bảng `slots` dù có thể suy ra | Chấp nhận |
| [004](./004-transaction-lock-booking.md) | Chống đặt trùng bằng khóa bi quan + index ở database | Chấp nhận |
| [005](./005-migration-strategy.md) | Migrate và seed tự động khi khởi động | Chấp nhận (chỉ cho demo) |
| [006](./006-layered-architecture.md) | Kiến trúc 3 tầng Route - Service - Repository | Chấp nhận |
| [007](./007-vanilla-frontend.md) | Frontend vanilla JS, không dùng framework | Chấp nhận |

## Cách thêm ADR mới

1. Chép mẫu bên dưới thành file `NNN-ten-ngan-gon.md` (số tăng dần).
2. Điền nội dung.
3. Thêm một dòng vào bảng phía trên.

### Mẫu

```markdown
# ADR-NNN: <Tiêu đề quyết định>

- **Trạng thái:** Đề xuất
- **Ngày:** YYYY-MM-DD

## Bối cảnh
<Vấn đề đang gặp. Ràng buộc. Vì sao phải quyết định ngay lúc này.>

## Các phương án đã cân nhắc
| Phương án | Ưu | Nhược |
| --- | --- | --- |

## Quyết định
<Chọn gì. Viết ở thể khẳng định: "Chúng ta sẽ...">

## Hệ quả
### Tích cực
### Tiêu cực
### Khi nào cần xem lại quyết định này
```
