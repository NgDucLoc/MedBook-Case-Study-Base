# Development Quality Gate

## 1. Checklist đánh giá
| Tiêu chí | Đạt / Chưa đạt | Bằng chứng (trích từ artifact) | Vấn đề còn tồn tại |
|---|---|---|---|
| Development Context | **Đạt** | `development-context.md` — 12 mục đầy đủ, truy vết tới đúng BR/AC | — |
| Coding Plan | **Đạt** | `coding-plan.md` — 3 task (T1→T3), thứ tự triển khai theo đường găng §6.5 | — |
| Chức năng được thực hiện đúng phạm vi | **Đạt** | `coding-log.md` mục 3 — 23 file đổi, khớp bảng ánh xạ §6.1 (8 mới, 8 sửa, 6 dùng nguyên + phần dọn code cũ) | Có 2 hàm service nhỏ ngoài §6.2 (`listForStaff`, `listEvents`) — đã ghi rõ lý do ở Deviations |
| Business rules đã được hiện thực hoá | **Đạt** | `coding-log.md` mục 5 — BR-01 → BR-08 đều có file/component chịu trách nhiệm cụ thể | — |
| Unit Test đạt yêu cầu | **Đạt** | `unit-test-report.md` — 51/51 pass (37 mới + 14 regression), ổn định 4 lần chạy lại, lint sạch | NFR-03 test 20 vòng thay vì 100 (ghi rõ lý do) |
| AI Code Review hoàn thành | **Đạt** | `code-review.md` — 3 issue (1 Critical, 2 Major), toàn bộ đã Accept và xử lý | — |
| Không còn các critical issues | **Đạt** | CR-01 (Critical) đã giải quyết bằng viết lại toàn bộ theo spec FROZEN; CR-02/CR-03 (Major) đã sửa | — |

## 2. Tổng kết
### Điểm mạnh
- Phát hiện và khắc phục một sai lệch **hệ thống** (không phải lỗi vặt): code cũ trong `day03` bám
  theo một tài liệu spec đã lỗi thời, khác hoàn toàn bộ 9 file FROZEN — đây là bài học thực tế có
  giá trị sư phạm cho học viên về tầm quan trọng của việc xác nhận **đúng phiên bản spec** trước
  khi để AI sinh code.
- Toàn bộ 8 Business Rule (BR-01 → BR-08) đều truy vết được tới đúng component và AC kiểm chứng.
- Phát hiện 1 lỗi logic thật (CR-02, phân biệt sai 2 trong 3 mã 409 của BR-07) thông qua unit test
  tự động, không phải qua review bằng mắt.
- 14 test tích hợp cũ (NFR-05 — tương thích ngược) không bị ảnh hưởng.
- Đã xác minh bằng luồng curl thật đầu-cuối (staff thêm waitlist → huỷ lịch → offer tự sinh →
  bệnh nhân xem/chấp nhận → nhật ký ghi đúng thứ tự), không chỉ dừng ở test tự động.

### Rủi ro còn lại
- UI chưa được xác minh bằng browser automation thật do môi trường phát triển không có công cụ
  này — đã bù bằng kiểm tra cú pháp ES module + đối chiếu toàn bộ ID DOM + curl đúng luồng API
  UI sử dụng, nhưng vẫn khuyến nghị QA/Human tự bấm thử qua trình duyệt trước khi release thật.
- Form staff nhập `patientId` bằng số thay vì dropdown (do không có endpoint liệt kê bệnh nhân
  trong phạm vi 10 endpoint đã chốt) — chấp nhận cho MVP.
- NFR-03 (100 vòng đồng thời) mới test 20 vòng — cơ chế bảo vệ (khoá hàng + conditional UPDATE)
  không phụ thuộc số vòng lặp nên rủi ro thấp, nhưng chưa có bằng chứng thực nghiệm ở quy mô đủ.

## 3. Quyết định
- [x] **PASS** — sẵn sàng bàn giao sang Quality Assurance
- [ ] **FAIL** — cần hoàn thành các việc sau trước khi chuyển sang QA:
  - ...

---

**Human decision (Human-on-the-loop):** Sau khi AI tổng hợp bằng chứng và báo cáo, Human xem xét
bằng chứng ở mục 1–2, xác nhận **PASS** — không còn Critical/Major issue mở, 51/51 test xanh ổn
định, luồng nghiệp vụ chính đã xác minh thật qua HTTP. Rủi ro còn lại (UI chưa qua browser thật,
NFR-03 quy mô nhỏ hơn) được chuyển sang QA như Known Risk, không chặn bàn giao.
