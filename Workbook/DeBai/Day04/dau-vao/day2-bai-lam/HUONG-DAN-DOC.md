# Hướng dẫn đọc — task nào nạp file nào

> **Mã:** WB2-GUIDE · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Nguồn:** `dau-vao/05-nguyen-tac-chung.md` (NT-05, NT-06, NT-09), `03-trien-khai/01-danh-sach-task.md`

Dành cho **bất kỳ ai hoặc công cụ AI nào chuẩn bị làm một task** (WB-3). **Không nạp cả bộ tài liệu** — chỉ nạp phần liên quan trực tiếp (NT-06).

---

## 1. Nguyên tắc khi làm một task

1. **Chỉ làm đúng task được giao** ở `03-trien-khai/01-danh-sach-task.md`; không mở rộng phạm vi.
2. **Không dùng thư viện mới.** Repo chỉ có `express` và `pg`. Thêm dependency là đổi ADR-008 — phải qua Tech Lead.
3. **Không đổi API hiện có.** 16 endpoint giữ nguyên request, response, mã lỗi. Chỉ được **thêm** endpoint.
4. **Không nhảy tầng.** Route → Service → Repository → Pool. Route không viết SQL; repository không chứa luật nghiệp vụ.
5. **SQL thuần, parameterized** (`$1`, `$2`). Nối chuỗi vào SQL bị reject ngay ở review.
6. **Không sửa `slots.status` ngoài giao dịch** (K-03, K-04) — đây là chỗ dữ liệu từng bị lệch.
7. **Không tạo thêm quy tắc nghiệp vụ.** Quy tắc nào cần mà không có ở `01-yeu-cau/03-quy-tac-nghiep-vu.md` ⇒ dừng.

## 2. Nạp gì cho loại việc nào

| Loại task | File **bắt buộc** đọc | Code liên quan (chỉ đọc) |
| --- | --- | --- |
| Migration / schema (TASK-01) | `02-thiet-ke/06-du-lieu.md` §9, `04-luong-va-trang-thai.md` §4–§6 | `src/db/migrate.js`, `src/db/seed.js` |
| Repository mới (TASK-02, 04) | `02-thiet-ke/06-du-lieu.md`, `00-boi-canh/01-he-thong-hien-tai.md` §1 | `src/repositories/slotRepository.js` (mẫu) |
| Service nghiệp vụ (TASK-03, 05, 06) | `01-yeu-cau/03-quy-tac-nghiep-vu.md`, `02-thiet-ke/03-thanh-phan.md`, `04-luong-va-trang-thai.md` | `src/services/appointmentService.js` (mẫu giao dịch) |
| API endpoint (TASK-03, 06) | `02-thiet-ke/05-api-va-su-kien.md`, `01-yeu-cau/05-tieu-chi-chap-nhan.md` | `src/routes/appointments.routes.js` |
| Tác vụ quét hết hạn (TASK-07) | `04-luong-va-trang-thai.md` §3 (B), §8, `07-bao-mat-do-tin-cay.md` | `server.js` |
| Frontend (TASK-08) | `01-yeu-cau/04-user-story.md`, `02-thiet-ke/05-api-va-su-kien.md` | `public/js/views/patient.js` |
| Kiểm thử | `01-yeu-cau/05-tieu-chi-chap-nhan.md`, `03-trien-khai/02-dinh-nghia-xong-va-kiem-thu.md` | `tests/api.test.js` |

Luôn kèm `00-boi-canh/02-thuat-ngu.md` nếu không chắc một thuật ngữ.

## 3. Khi nào phải **dừng và hỏi Human** (NT-03)

- Cần một **giá trị số** mà tài liệu không ghi (hạn, ngưỡng, số lần thử).
- Phát hiện **hai quy tắc mâu thuẫn**.
- Task đòi **sửa một endpoint đang chạy**.
- Cần **thêm cột** vào `appointments` hoặc `slots`.
- AC **không đủ** để quyết định hành vi ở một nhánh.
- Gặp `[CẦN XÁC NHẬN]` hoặc câu `Open` (Q-07, Q-09 phần dời lịch, Q-13) liên quan tới task.

**Cách dừng đúng:** ghi rõ **thiếu thông tin gì**, **vì sao quan trọng**, **ai nên trả lời**. Không tự chọn giá trị mặc định rồi đi tiếp. Sau đó làm theo quy trình đổi hành vi ở `02-thiet-ke/08-truy-vet.md` §8.

## 4. Quy ước code (tóm tắt — rút từ code hiện có)

- **CommonJS**, không ESM; dấu `;` bắt buộc; dùng `"` cho chuỗi; `module.exports` ở cuối file.
- Repository: SQL alias sang camelCase (`s.doctor_id as "doctorId"`); hàm trong giao dịch nhận `client` làm tham số đầu.
- Service: ném lỗi bằng `httpError(status, "Thông báo tiếng Việt")`; không đụng `req`/`res`.
- Route: `try/catch` + `next(error)`; thành công `{ data }`; tạo mới `201`.
- Thông báo lỗi **tiếng Việt**, ngắn, không dấu chấm cuối, không lộ SQL hay stack.
- Comment chỉ giải thích **vì sao**, không mô tả lại code.

**Khuôn giao dịch bắt buộc dùng lại** (sao chép từ `appointmentService.bookAppointment`):

```js
const client = await getClient();
try {
  await client.query("begin");
  const slot = await slotRepository.findForUpdate(client, slotId);   // SELECT … FOR UPDATE
  // … kiểm tra + ghi
  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
}
```

Với phép chuyển trạng thái đơn lẻ, ưu tiên **conditional UPDATE** thay vì đọc-rồi-ghi:

```sql
update appointment_offers set status = 'accepted' where id = $1 and status = 'sent' returning id
```
Không có dòng trả về ⇒ ném xung đột (xem `02-thiet-ke/04-luong-va-trang-thai.md` §5 cho mẫu **riêng** của `accepted`).

## 5. Chạy và kiểm thử

```bash
docker compose up db -d
export DATABASE_URL="postgres://medbook:medbook@localhost:55432/medbook"
npm run db:migrate && npm run db:seed
npm run lint        # phải sạch
npm test            # 14 test cũ không được gãy
npm start           # http://localhost:4300
```

## 6. Xong khi nào

Xem `03-trien-khai/02-dinh-nghia-xong-va-kiem-thu.md` Phần A. Tối thiểu: lint sạch · 14 test cũ vẫn xanh · test mới phủ đúng AC được giao · coding-log ghi file đã đổi, **BR đã hiện thực**, giả định còn lại · đã chạy danh sách kiểm tra lệch (`02-thiet-ke/08-truy-vet.md` §9).
