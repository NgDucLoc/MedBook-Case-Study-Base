# WB-1 · 05 — Nguyên tắc chung

> **Mã:** WB1-05 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Nguồn:** `01-artifact-map.md` (DR-xx), `03-responsibility-matrix.md` (CP-xx, RSP-xx), `04-future-state-workflow.md` (WF-xx, HO-xx), ADR 001–007

Đây là **luật chơi** cho WB-2 → WB-5: những điều mọi tài liệu, mọi công cụ AI và mọi người tham gia đều phải tuân theo. Mỗi nguyên tắc trả lời một điểm đứt gãy có thật (DR-xx), không phải khẩu hiệu.

Đọc file này **trước** khi bắt đầu bất kỳ WB nào sau. Muốn đổi nguyên tắc: ghi một mục vào nhật ký quyết định (`06-nhat-ky-quyet-dinh.md`) và cập nhật file này, **không** bỏ qua âm thầm.

---

## 1. Các nguyên tắc

| ID | Nguyên tắc | Chống điểm đứt gãy | Kiểm tra bằng cách nào |
| --- | --- | --- | --- |
| **NT-01** | **Tài liệu đã duyệt là nguồn đúng duy nhất.** Code, test và giải thích của AI đều suy ra từ đó. Khi tài liệu và code mâu thuẫn, coi là lỗi cần xử lý, không coi code là đúng theo mặc định | DR-04 | CP-09: đối chiếu tài liệu ↔ code |
| **NT-02** | **Không có quy tắc nghiệp vụ nào không có mã và nguồn quyết định.** Mã chỉ cấp một lần, không tái sử dụng. Bỏ một mục thì đánh `[BỎ]`, giữ mã | DR-01, DR-02 | Mọi BR có cột "Nguồn" và "Thành phần chịu trách nhiệm" |
| **NT-03** | **Chỗ chưa chốt phải nói rõ là chưa chốt.** Gắn `[CẦN XÁC NHẬN]`. AI **không được** tự lấp bằng giá trị hợp lý; phải dừng và hỏi. Người trả lời ghi vào nhật ký | DR-01 | Tìm nhãn còn lại ở cổng CP-02, CP-03: mỗi nhãn có chủ và không chặn |
| **NT-04** | **Tách "cái gì và vì sao" khỏi "làm thế nào".** Yêu cầu (BR, US, AC) không nhắc công nghệ; thiết kế (ADR, CMP, API, ENT) không thêm quy tắc mới | DR-01, DR-03 | Đọc file yêu cầu: không có tên bảng, hàm, thư viện |
| **NT-05** | **Đổi hành vi thì sửa tài liệu trước, code sau.** Phát hiện tài liệu sai hoặc thiếu: dừng, mở lại cổng CP-02/03, sửa và duyệt, rồi mới sửa code. Không sửa code cho "đúng ý" rồi bỏ tài liệu lại | DR-04 | PR mô tả đổi hành vi phải trỏ tới BR/AC đã được sửa |
| **NT-06** | **Mỗi task chỉ nạp ngữ cảnh liên quan.** Có bản đồ "loại việc → file phải đọc". Không nạp toàn bộ bộ tài liệu cho AI | DR-01, DR-03 | `HUONG-DAN-DOC.md` có bảng này; coding-log liệt kê file đã nạp |
| **NT-07** | **Sản phẩm của AI chưa có hiệu lực cho tới khi Human duyệt.** Trạng thái tài liệu: `Nháp` → `Chờ duyệt` → `Đã duyệt`. Chỉ tài liệu `Đã duyệt` được dùng làm đầu vào của phase sau | DR-04, DR-05 | Mỗi file có đầu trang trạng thái và người duyệt |
| **NT-08** | **Test viết từ AC, không viết từ code.** Mỗi AC có ít nhất một test; mỗi test trỏ về AC. AC nào không có số đo được thì trả lại CP-03 | DR-02, DR-05 | Bảng AC ↔ test không có ô trống |
| **NT-09** | **Ràng buộc kỹ thuật của hệ thống nền là bất biến**, trừ khi Human duyệt ngoại lệ bằng một mục nhật ký (bảng §2) | DR-03 | Review PR đối chiếu bảng §2 |
| **NT-10** | **Mỗi tài liệu có đầu trang chuẩn**: mã, phiên bản, ngày, trạng thái, người duyệt, nguồn (các mã đầu vào). Đọc đầu trang là biết tài liệu từ đâu và đã được ai duyệt chưa | DR-03, DR-05 | Thiếu đầu trang = chưa qua cổng |
| **NT-11** | **Phải phản biện trước khi chấp nhận đề xuất quan trọng của AI.** Ở các cổng quyết định (CP-05, CP-06), yêu cầu AI đóng vai người phản biện độc lập cho chính đề xuất của nó, ghi kết quả và cách xử lý | DR-04 | Nhật ký có mục "phản biện" cho mỗi quyết định kiến trúc |

---

## 2. Ràng buộc kỹ thuật bất biến của hệ thống nền (NT-09)

Rút từ ADR trong repo (`source-code/doc/adr/`) và source code đang chạy. Mọi thiết kế và code sau này phải tuân thủ, trừ ngoại lệ có duyệt.

| Mã | Ràng buộc | Nguồn |
| --- | --- | --- |
| **K-01** | Không dùng ORM. SQL thuần, parameterized; cấm nối chuỗi vào SQL | ADR-001 |
| **K-02** | Auth demo bằng header giả mạo được ⇒ mọi kiểm quyền sở hữu phải ở **tầng service**, không dựa vào `requireRole` | ADR-002 |
| **K-03** | `slots.status` là dữ liệu denormalized ⇒ mọi thay đổi nằm trong transaction cùng bảng nghiệp vụ | ADR-003 |
| **K-04** | Chống đặt trùng bằng transaction + `SELECT … FOR UPDATE` + partial unique index. Thao tác tương tự phải dùng đúng khuôn này | ADR-004 |
| **K-05** | Migration không phiên bản, chạy mỗi lần khởi động ⇒ phải idempotent (`if not exists`) | ADR-005 |
| **K-06** | Kiến trúc phân lớp Route → Service → Repository → Pool; không nhảy tầng | ADR-006 |
| **K-07** | Frontend JS thuần, không framework, không build step | ADR-007 |
| **K-08** | Chỉ hai dependency runtime: `express`, `pg` | `package.json` |
| **K-09** | Chạy được bằng một lệnh `docker compose up` | `docker-compose.yml`, `HUONG-DAN-CHAY.md` |
| **K-10** | Không đổi contract của các endpoint đang chạy; 14 test tích hợp hiện có phải giữ xanh | `tests/api.test.js` |

---

## 3. Cách các nguyên tắc chạy qua các cổng

| Cổng | Nguyên tắc được kiểm tra |
| --- | --- |
| CP-01, CP-02 | NT-02, NT-03, NT-04 |
| CP-03 | NT-02, NT-08 (AC đo được) |
| CP-04 | NT-03 (câu `Open` có chủ, không chặn) |
| CP-05, CP-06 | NT-04, NT-09, NT-11 |
| CP-07 | NT-06, NT-09 |
| CP-08 | NT-05, NT-06, NT-09 |
| CP-09 | NT-01, NT-08 |
| CP-10, CP-11 | NT-07, NT-10 |

---

## 4. Khi nào phải dừng và hỏi Human

Áp dụng cho mọi công cụ AI ở mọi phase.

- Cần một **giá trị số** mà tài liệu không ghi (hạn, ngưỡng, số lần thử).
- Hai quy tắc **mâu thuẫn** nhau.
- Một thay đổi sẽ **vi phạm** một ràng buộc K-xx.
- AC **không đủ** để quyết định hành vi ở một nhánh.
- Nhiệm vụ đòi **sửa hành vi đang chạy** ngoài phạm vi được giao.

**Cách dừng đúng:** ghi rõ (1) thiếu thông tin gì, (2) vì sao quan trọng, (3) ai nên trả lời. Không tự chọn giá trị mặc định rồi đi tiếp.
