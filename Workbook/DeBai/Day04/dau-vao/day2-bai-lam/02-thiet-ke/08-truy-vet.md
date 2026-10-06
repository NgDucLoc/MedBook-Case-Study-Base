# 02 · 08 — Truy vết và kiểm tra lệch

> **Mã:** WB2-02-08 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Tech Lead + BA] · **Cổng:** CP-06
> **Nguồn:** `01-yeu-cau/*`, `02-thiet-ke/01` → `07` · **Bước WB-1:** WF-07

Mục đích: chứng minh **mọi yêu cầu có thành phần hiện thực và có cách kiểm chứng**, và ngược lại, **không thành phần nào tồn tại mà không phục vụ yêu cầu nào**. Đây là file nối tài liệu với code và test ở WB-3, WB-4 (NT-01, NT-08).

---

## 1. Story → quy tắc → thiết kế → AC → task

| US | BR | Thành phần | API | Thực thể | AC | Task |
| --- | --- | --- | --- | --- | --- | --- |
| **US-01** Staff thêm đăng ký | BR-13, 15 | CMP-05, 01, 07 | API-01, 03 | ENT-01, 03 | AC-01.1 → 01.5 | TASK-01, 02, 03 |
| **US-02** Phát hiện slot, chọn ứng viên | BR-01, 02, 03, 04, 05, 08, 16 | CMP-03, 01, 09, 10 | *(nội bộ)* + tác dụng phụ trên 3 API cũ | ENT-01, 02, 03 | AC-02.1 → 02.11 | TASK-04, 05 |
| **US-03** Bệnh nhân nhận đề xuất | BR-05, 06, 11, 12 | CMP-02, 06, 08 | API-05, 06 | ENT-02, 04 | AC-03.1 → 03.4 | TASK-06, 08 |
| **US-04** Chấp nhận | BR-09, 14 | CMP-03, 02 | API-07 | ENT-02, `appointments` | AC-04.1 → 04.6 | TASK-06 |
| **US-05** Từ chối | BR-07, 14 | CMP-03 | API-08 | ENT-02 | AC-05.1 → 05.4 | TASK-06 |
| **US-06** Xử lý hết hạn | BR-06, 07, 08 | CMP-04, 03 | *(nội bộ)* | ENT-02, 03 | AC-06.1 → 06.5 | TASK-07 |
| **US-07** Staff xem danh sách chờ | BR-13 | CMP-05, 06 | API-02, 09 | ENT-01, 02 | AC-07.1, 07.2 | TASK-03, 08 |
| **US-08** Staff hủy đăng ký | BR-10, 13, 15 | CMP-05, 03 | API-04 | ENT-01, 02 | AC-08.1 → 08.4 | TASK-03 |
| **US-11** Staff xem nhật ký | BR-15 | CMP-07 | API-10 | ENT-03 | AC-09.1, 09.2 | TASK-02 |
| ~~US-09~~ | — | — | — | — | — | **Won't** — bác sĩ không có tài khoản |
| ~~US-10~~ | — | — | — | — | — | **Won't** — phụ thuộc Q-13 |

✅ Mọi story trong phạm vi có ít nhất một thành phần hỗ trợ.

## 2. Quy tắc → thành phần → AC → loại test

| BR | Thành phần | Kiểm chứng lần hai | AC | Loại test |
| --- | --- | --- | --- | --- |
| BR-01 Kích hoạt | CMP-03 | — | AC-02.1, AC-02.2, AC-02.3 | Integration |
| BR-02 Ưu tiên | CMP-03 + 01 | — | AC-01.4, AC-02.5, AC-02.6, AC-02.7 | Unit + Integration |
| BR-03 Ứng viên | CMP-03 + 01 | — | AC-01.2, AC-01.3, AC-02.8, AC-02.9, AC-02.10 | Unit + Integration |
| BR-04 1 đề xuất / slot | CMP-03 | Chỉ mục `one_pending_offer_per_slot` | AC-05.1, AC-06.5 | Integration + Concurrency |
| BR-05 1 đề xuất / bệnh nhân | CMP-03 | Chỉ mục `one_pending_offer_per_patient` | AC-03.3 | Integration |
| BR-06 Hạn trả lời | CMP-03 | CMP-04 | AC-02.1, AC-03.1, AC-04.3, AC-06.1, AC-06.4 | Unit + Integration |
| BR-07 Chuyển tiếp | CMP-03 | CMP-04 | AC-05.1, AC-05.3, AC-06.1, AC-06.3, AC-08.2 | Integration |
| BR-08 Hết ứng viên | CMP-03 | CMP-07 | AC-02.4, AC-02.11, AC-05.2, AC-06.2 | Integration |
| BR-09 Chấp nhận toàn vẹn | CMP-03 | `one_active_appointment_per_slot` | AC-04.1, AC-04.2, AC-04.3, AC-04.4, AC-04.6 | Integration + Concurrency |
| BR-10 Slot mất khả dụng | CMP-03 | — | AC-04.2, AC-06.3, AC-08.2 | Integration |
| BR-11 Nội dung đề xuất | CMP-02 | CMP-06 | AC-03.1, AC-03.2, AC-03.4 | API contract |
| BR-12 Không lộ vị trí | CMP-02 | CMP-06 | AC-03.2 | API contract |
| BR-13 Quyền danh sách chờ | CMP-05 | `requireRole` ở CMP-11 | AC-01.1, AC-01.5, AC-07.1, AC-07.2, AC-08.1, AC-08.3, AC-08.4, AC-09.2 | Integration |
| BR-14 Kiểm chủ sở hữu | CMP-03 | — | AC-04.5, AC-05.4 | Integration |
| BR-15 Nhật ký | CMP-07 | — | AC-01.1, AC-02.1, AC-08.1, AC-09.1 | Integration |
| BR-16 Thời gian tối thiểu | CMP-03 | — | AC-02.4 | Unit + Integration |

✅ Mọi BR có đúng một thành phần chịu trách nhiệm và ít nhất một AC. (BR-06 → AC-04.3 nghĩa là hết hạn cũng được kiểm ở luồng chấp nhận.)

## 3. Thành phần → yêu cầu nó phục vụ (chiều ngược)

| Thành phần | Phục vụ US | Phục vụ BR | Có yêu cầu? |
| --- | --- | --- | :---: |
| CMP-01 `waitingListRepository` | US-01, 02, 07, 08 | BR-02, 03 *(thực thi)* | ✅ |
| CMP-02 `offerRepository` | US-03, 04, 05, 07 | BR-11, 12 | ✅ |
| CMP-03 `offerEngineService` | US-02, 03, 04, 05, 06 | 12 BR | ✅ |
| CMP-04 `offerExpirySweeper` | US-06 | *(cơ chế của BR-06, 07)* | ✅ |
| CMP-05 `waitingListService` | US-01, 07, 08 | BR-13 | ✅ |
| CMP-06 Frontend | US-03, 04, 05, 07 | BR-11, 12 | ✅ |
| CMP-07 `offerEventRepository` | US-11 | BR-15 | ✅ |
| CMP-08 `notificationRepository` | US-03 | — *(hỗ trợ, bỏ được mà hệ thống vẫn đúng)* | ⚠️ |
| CMP-09 `appointmentService` (extend) | US-02 | BR-01, 10 *(điểm móc)* | ✅ |
| CMP-10 `slotService` (extend) | US-02 | BR-01, 10 *(điểm móc)* | ✅ |
| CMP-11 Route files | tất cả | — | ✅ |

**⚠️ CMP-08 là thành phần duy nhất không gắn trực tiếp với một BR.** Đề xuất giữ lại vì: (a) hiện thực phần "thông báo đầy đủ cho các bên" của mô tả gốc; (b) là điểm mở rộng để gắn SMS/email sau (R-01, RISK-06). Nếu cắt phạm vi gấp, đây là thứ cắt được mà hệ thống vẫn đúng. `[CẦN XÁC NHẬN]` HR2-10.

## 4. API → story → AC

| API | US | AC chính |
| --- | --- | --- |
| API-01 | US-01 | AC-01.1 → 01.5, 08.4 |
| API-02 | US-07 | AC-07.1, 07.2, 08.3 |
| API-03 | US-01 | — |
| API-04 | US-08 | AC-08.1, 08.2 |
| API-05 | US-03 | AC-03.2 |
| API-06 | US-03 | AC-03.1 → 03.4 |
| API-07 | US-04 | AC-04.1 → 04.6 |
| API-08 | US-05 | AC-05.1 → 05.4 |
| API-09 | US-07 | — |
| API-10 | US-11 | AC-09.1, 09.2 |

API-03 và API-09 không có AC riêng — là thao tác phụ trợ, phủ bằng smoke test (`03-trien-khai/02`). Đây là **quyết định có ý thức**, cần Human xác nhận.

## 5. Thực thể → quy tắc

| Thực thể | BR đòi hỏi | Cột phục vụ |
| --- | --- | --- |
| ENT-01 `waiting_list_entries` | BR-02, 03, 13 | `medical_priority` + `created_at` + `id` → BR-02 · `doctor_id`/`specialization_id`/`desired_*` → BR-03 · `created_by_user_id` → R-13, Q-13 |
| ENT-02 `appointment_offers` | BR-04, 05, 06, 09 | `expires_at` → BR-06 · chỉ mục `slot_id where sent` → BR-04 · `patient_id where sent` → BR-05 · `appointment_id` → BR-09 |
| ENT-03 `offer_events` | BR-15 | Toàn bộ bảng |
| ENT-04 `notifications` | — *(hỗ trợ R-01)* | — |

## 6. AC → API → mã HTTP kỳ vọng

AC viết theo hành vi quan sát được; bảng này giúp người viết test ở WB-3 biết gọi gì và kỳ vọng mã nào (theo `05-api-va-su-kien.md` §1).

| AC | Gọi | Kỳ vọng |
| --- | --- | --- |
| AC-01.1, 01.2 | API-01 | `201` |
| AC-01.3, 01.4 | API-01 | `400` |
| AC-01.5 | API-01 | `409` |
| AC-02.1, 02.4 | Hủy lịch (có sẵn) rồi quan sát đề xuất / nhật ký | hủy lịch `200`, hành vi trả về không đổi |
| AC-02.2 | Sửa slot (có sẵn) | `200` |
| AC-02.3 | Tạo slot (có sẵn) | `201`; không đề xuất |
| AC-02.5 → 02.11 | Kích hoạt như AC-02.1 rồi đọc qua API-09 / API-06 | — |
| AC-03.1 → 03.4 | API-06 | `200` (mảng rỗng khi không có) |
| AC-04.1 | API-07 | `201` |
| AC-04.2, 04.3, 04.4, 04.6 | API-07 | `409` (ba thông báo khác nhau) |
| AC-04.5, 05.4, 08.3, 08.4, 09.2 | API tương ứng | `403` |
| AC-05.1, 05.2 | API-08 | `200` |
| AC-05.3 | API-08 | `409` |
| AC-06.1 → 06.5 | Gọi `sweepOnce()` trực tiếp trong test | — |
| AC-07.1, 07.2 | API-02 | `200` |
| AC-08.1, 08.2 | API-04 | `200` |
| AC-09.1 | API-10 | `200` |

## 7. Kết quả kiểm tra chéo

| Câu hỏi của WB-2 Bước 8 | Kết quả | Bằng chứng |
| --- | --- | --- |
| Yêu cầu nào chưa được hiện thực hóa? | **Không** trong phạm vi. US-09, US-10 loại tường minh sang Won't | §1 |
| Quy tắc nào bị bỏ sót? | **Không.** 16/16 BR có thành phần và AC | §2 |
| AC nào chưa được hỗ trợ? | **Không.** Mọi AC truy được tới thành phần và task | §1, §2 |
| Thành phần nào không phục vụ yêu cầu nào? | CMP-08 gián tiếp — đã xem xét, giữ có lý do | §3 |
| API nào dư thừa? | **Không** | §4 |

**Yêu cầu thiếu:** không. **AC thiếu:** API-03 và API-09 chưa có AC riêng (§4). **Quy tắc thiếu:** BR-17 (Q-07) cố ý để trống, giữ mã. **Thành phần dư:** không. **Câu hỏi còn mở:** Q-07, Q-09 (phần dời lịch), Q-13, R-05, R-13, **R-17** — không câu nào chặn WB-3, R-17 cần Human quyết.

**Đề xuất cải thiện:** (1) sau WB-3, đo thời gian thực từ lúc hủy lịch tới lúc đề xuất được tạo, đối chiếu S1; (2) nếu Q-07 được trả lời, thêm cột đếm từ chối — không phá schema; (3) khi có kênh SMS, viết adapter đọc `notifications`, **không** sửa CMP-03.

---

## 8. Quy trình đổi hành vi (NT-05)

Khi phát hiện một quy tắc sai hoặc thiếu — ở bất kỳ đâu, kể cả khi đang viết code ở WB-3:

| Bước | Việc | Ai | Nơi ghi |
| ---: | --- | --- | --- |
| 1 | **Dừng.** Không sửa code cho "đúng ý" | Người phát hiện | — |
| 2 | Ghi câu hỏi hoặc vấn đề: thiếu gì, vì sao quan trọng, ai trả lời | Người phát hiện | `01-yeu-cau/02-lam-ro.md` (Q mới) hoặc `06-ra-soat-yeu-cau.md` (R mới) |
| 3 | Human trả lời | Stakeholder / BA | Cùng file, đổi trạng thái |
| 4 | **Sửa BR** (`03-quy-tac-nghiep-vu.md`), duyệt qua cổng CP-02 | BA | Nhật ký quyết định |
| 5 | Sửa AC ảnh hưởng (`05-tieu-chi-chap-nhan.md`), duyệt qua CP-03 | BA + QA | Nhật ký quyết định |
| 6 | Sửa thiết kế ảnh hưởng, theo bảng "tra ngược" dưới đây | Tech Lead | Nhật ký quyết định |
| 7 | Cập nhật bảng truy vết (file này) | Tech Lead | — |
| 8 | **Mới** sửa code và test, tham chiếu BR/AC vừa đổi | Dev | coding-log |

**Tra ngược — một BR đổi thì xem những file nào:** file này §2 (BR → thành phần, AC) rồi `03-thanh-phan.md`, `04-luong-va-trang-thai.md`, `05-api-va-su-kien.md`, `06-du-lieu.md`, `07-bao-mat-do-tin-cay.md`; cuối cùng `03-trien-khai/01-danh-sach-task.md` cho task bị ảnh hưởng.

## 9. Danh sách kiểm tra lệch (dùng ở cổng CP-09, WB-3 → WB-4)

Kiểm tra **tài liệu ↔ code ↔ test**. Mọi ô "không" là một lệch cần xử lý hoặc ghi nhận.

| # | Câu hỏi | Kiểm bằng | Nếu "không" |
| ---: | --- | --- | --- |
| 1 | Mọi BR trong phạm vi task có vị trí hiện thực trong coding-log? | Đọc coding-log ↔ §2 | Thiếu hiện thực hoặc coding-log sai |
| 2 | Mọi AC có ít nhất một test trỏ về? | Tên test / chú thích ↔ AC | AC chưa được kiểm chứng |
| 3 | Có hành vi trong code mà **không** có BR nào yêu cầu? | Đọc diff ↔ `03-quy-tac-nghiep-vu.md` | AI tự thêm luật (NT-02) — hoặc BR thiếu, mở lại CP-02 |
| 4 | Có endpoint hoặc bảng nào ngoài `05` và `06`? | Đối chiếu route và migration ↔ API-xx, ENT-xx | Vượt phạm vi |
| 5 | Có ràng buộc K-xx nào bị vi phạm? | `package.json` không đổi; SQL parameterized; 14 test cũ xanh | Reject ở review (NT-09) |
| 6 | Bốn truy vấn kiểm tra lệch dữ liệu trả 0 dòng? | `04-luong-va-trang-thai.md` §9 | Bug đồng thời |
| 7 | Mọi `[CẦN XÁC NHẬN]` mà AI gặp có được ghi lại thay vì tự lấp? | Đọc coding-log, nhật ký | Vi phạm NT-03 |
| 8 | Test có kiểm tra điều **cấm** (không lộ dữ liệu, không ngẫu nhiên) chứ không chỉ điều **cho phép**? | Đọc test AC-02.7, AC-03.2 | Test xanh giả |

**Kết luận của cổng CP-06 (AI đề xuất):** thiết kế sẵn sàng cho WB-3 **với điều kiện** Human duyệt HR2-xx ở `04-nhat-ky/01`.
