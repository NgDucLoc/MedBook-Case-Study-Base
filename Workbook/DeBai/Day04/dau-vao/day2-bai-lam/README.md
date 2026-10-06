# WB-2 — Yêu cầu và thiết kế: Dynamic Appointment Rescheduling & Waiting List

> **Mã:** WB2 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Đầu vào:** `dau-vao/` (bản chụp WB-1 v0.1), `de-bai/`, `source-code/` · **Đầu ra dùng cho:** WB-3 → WB-5
> **Tính năng:** khi một khung giờ khám trở nên khả dụng, hệ thống tự chọn bệnh nhân phù hợp trong danh sách chờ, gửi đề xuất, chờ phản hồi, hết hạn hoặc bị từ chối thì chuyển người kế tiếp.

**Hệ thống nền:** MedBook — Node.js 20 · Express 4 · PostgreSQL 16 · JS thuần. Chưa chạm code.

---

## 1. Bộ tài liệu này là gì

Hai sản phẩm đề bài yêu cầu, tổ chức thành **một chuỗi có mã** — mỗi thứ ở sau trỏ về được một thứ ở trước:

1. **Bộ yêu cầu** — user story và AC Given–When–Then, kèm câu hỏi làm rõ, quy tắc nghiệp vụ, rà soát, ưu tiên → thư mục `01-yeu-cau/`.
2. **Architecture Blueprint** — phân tích tác động, phương án, quyết định, thành phần, luồng, API, dữ liệu, rủi ro, truy vết → thư mục `02-thiet-ke/`.

Thêm hai phần nối với các WB khác: `03-trien-khai/` (task và định nghĩa "xong" — cầu nối sang WB-3) và `04-nhat-ky/` (ai quyết định gì).

**Luật chơi** lấy từ WB-1 (`dau-vao/05-nguyen-tac-chung.md`). Ba nguyên tắc chi phối cách bộ này được viết:
- **Yêu cầu tách khỏi thiết kế** (NT-04): `01-yeu-cau/` không có tên bảng, hàm, thư viện; `02-thiet-ke/` không thêm quy tắc mới.
- **Chỗ chưa chốt nói rõ là chưa chốt** (NT-03): `[CẦN XÁC NHẬN]`, `[ĐỀ XUẤT]`, và trạng thái `Open`.
- **Đổi hành vi thì sửa tài liệu trước** (NT-05): quy trình ở `02-thiet-ke/08-truy-vet.md` §8.

---

## 2. Cấu trúc

```
bai-nop/
  README.md                          file này
  HUONG-DAN-DOC.md                   task nào nạp file nào; khi nào phải dừng và hỏi
  dau-vao/                           bản chụp đầu vào từ WB-1 (chỉ đọc)
  00-boi-canh/
    01-he-thong-hien-tai.md          hệ thống MedBook đang chạy (đã đối chiếu code)
    02-thuat-ngu.md                  từ điển, trạng thái, actor, ký hiệu
  01-yeu-cau/                        CÁI GÌ và VÌ SAO
    01-boi-canh-nghiep-vu.md         kiểm tra sẵn sàng + Business Problem Canvas
    02-lam-ro.md                     Q-01 … Q-16
    03-quy-tac-nghiep-vu.md          BR-01 … BR-16  ← file quan trọng nhất
    04-user-story.md                 US-01 … US-11
    05-tieu-chi-chap-nhan.md         AC-01.1 … AC-09.2 (43 AC)
    06-ra-soat-yeu-cau.md            R-01 … R-18
    07-uu-tien.md                    MoSCoW, phạm vi MVP
  02-thiet-ke/                       LÀM THẾ NÀO
    01-phan-tich-anh-huong.md        Reuse / Extend / New
    02-phuong-an-va-quyet-dinh.md    3 phương án, trade-off, ADR-008
    03-thanh-phan.md                 CMP-01 … CMP-11
    04-luong-va-trang-thai.md        luồng chính / thay thế / ngoại lệ; vòng đời; bất biến
    05-api-va-su-kien.md             API-01 … API-10; biến môi trường
    06-du-lieu.md                    ENT-01 … ENT-04; migration; truy vấn chọn ứng viên
    07-bao-mat-do-tin-cay.md         RISK-01 … RISK-12
    08-truy-vet.md                   truy vết hai chiều; quy trình đổi hành vi; kiểm tra lệch
  03-trien-khai/                     cầu nối sang WB-3
    01-danh-sach-task.md             TASK-01 … TASK-09
    02-dinh-nghia-xong-va-kiem-thu.md   DoD + chiến lược kiểm thử
  04-nhat-ky/
    01-nhat-ky-quyet-dinh.md         HR2-01 … HR2-12; giả định của AI; câu hỏi mở
```

## 3. Thứ tự đọc

**Lần đầu mở:** `01-yeu-cau/03-quy-tac-nghiep-vu.md` → `02-thiet-ke/02-phuong-an-va-quyet-dinh.md` → `02-thiet-ke/08-truy-vet.md` → `03-trien-khai/01-danh-sach-task.md`.
**Muốn duyệt nhanh:** `04-nhat-ky/01-nhat-ky-quyet-dinh.md` §1 rồi đi theo liên kết.
**AI agent chuẩn bị làm một task:** đọc `HUONG-DAN-DOC.md` — **không** nạp cả bộ.

---

## 4. Hệ thống mã

Mã chỉ cấp một lần, không tái sử dụng. Bỏ một mục thì đánh `[BỎ]`, giữ mã (NT-02).

| Tiền tố | Nghĩa | File nguồn |
| --- | --- | --- |
| `Q-xx` | Câu hỏi làm rõ | `01-yeu-cau/02-lam-ro.md` |
| `A-xx` | Giả định | `01-yeu-cau/01-boi-canh-nghiep-vu.md` |
| `P`, `S`, `C` | Pain point · tiêu chí thành công · ràng buộc | `01-yeu-cau/01` |
| **`BR-xx`** | **Quy tắc nghiệp vụ** | `01-yeu-cau/03-quy-tac-nghiep-vu.md` |
| `US-xx` | User story | `01-yeu-cau/04-user-story.md` |
| `AC-xx.y` | Tiêu chí chấp nhận của US-xx | `01-yeu-cau/05-tieu-chi-chap-nhan.md` |
| `R-xx` | Vấn đề / khoảng trống của yêu cầu | `01-yeu-cau/06-ra-soat-yeu-cau.md` |
| `CMP-xx` | Thành phần | `02-thiet-ke/03-thanh-phan.md` |
| `API-xx` | Endpoint mới | `02-thiet-ke/05-api-va-su-kien.md` |
| `ENT-xx` | Thực thể dữ liệu mới | `02-thiet-ke/06-du-lieu.md` |
| `RISK-xx` | Rủi ro | `02-thiet-ke/07-bao-mat-do-tin-cay.md` |
| `TASK-xx` | Task | `03-trien-khai/01-danh-sach-task.md` |
| `HR2-xx` | Quyết định cần duyệt | `04-nhat-ky/01-nhat-ky-quyet-dinh.md` |

Mã kế thừa từ WB-1 (`dau-vao/`): `NT-xx` nguyên tắc · `K-xx` ràng buộc kỹ thuật · `CP-xx` cổng · `WF-xx` bước · `HO-xx` bàn giao · `RSP-xx` trách nhiệm.

---

## 5. Hợp đồng vào/ra

| | Nội dung |
| --- | --- |
| **Đầu vào** | `dau-vao/` (WB-1 v0.1, `Chờ duyệt`) · đề bài · source code |
| **Đầu ra cho WB-3 (HO-02)** | `01-yeu-cau/` (BR, US, AC) · `02-thiet-ke/` (ADR-008, CMP, API, ENT, RISK, truy vết) · `03-trien-khai/` (TASK, DoD) · `HUONG-DAN-DOC.md` |
| **Điều kiện để WB-3 bắt đầu** | 7 cổng CP-01 → CP-07 ở trạng thái `Đã duyệt` (hiện `Chờ duyệt`) |
| **Sẽ dùng ở WB-4, WB-5** | `04-nhat-ky/` và `02-thiet-ke/08-truy-vet.md` làm nguyên liệu phân tích lỗi AI; `03-trien-khai/01` làm cơ sở đo |

## 6. Trạng thái

| Mục | Số lượng |
| --- | ---: |
| Quy tắc nghiệp vụ (BR) | 16 (+ BR-17 giữ chỗ) |
| User story (US) | 11 — 9 trong phạm vi, 2 Won't |
| Tiêu chí chấp nhận (AC) | 43 |
| Vấn đề rà soát (R) | 18 — 8 High |
| Thành phần / API / thực thể / rủi ro / task | 11 / 10 / 4 / 12 / 9 |
| Câu làm rõ | 16 — 1 `Case`, 12 `Đề xuất`, 2 `Open`, 1 hỗn hợp |
| Quyết định cần Human duyệt (HR2) | 12 |

**Ba việc nên làm trước khi duyệt:** xác nhận các giá trị `Đề xuất` quan trọng nhất (Q-04, Q-05, Q-11) · quyết R-17 (đề bài mô tả hiện trạng không khớp hệ thống thật) và R-18 (múi giờ của dữ liệu) · chốt phương án B (HR2-06).
