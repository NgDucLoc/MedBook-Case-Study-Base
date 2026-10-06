# 03 · 01 — Danh sách task

> **Mã:** WB2-03-01 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Tech Lead + Dev] · **Cổng:** CP-07
> **Nguồn:** `02-thiet-ke/08-truy-vet.md`, `01-yeu-cau/07-uu-tien.md` · **Bước WB-1:** WF-08 · **Bàn giao:** HO-02 → WB-3

Chia tính năng thành các task nhỏ, **mỗi task trỏ BR và AC**, có ranh giới file và định nghĩa "xong" riêng. Đây là "Bước 0" của WB-3: nhóm chọn một task rồi bắt đầu dựng ngữ cảnh.

**Quy tắc cho mọi task (NT-05, NT-06, NT-09):** chỉ hiện thực BR/AC được giao · chỉ nạp file liệt kê ở cột "Ngữ cảnh" · gặp thiếu sót của tài liệu thì **dừng** và làm theo `02-thiet-ke/08-truy-vet.md` §8.

---

## 1. Tổng quan

| Task | Tên | US | Ưu tiên | Phụ thuộc | Cỡ |
| --- | --- | --- | :---: | --- | :---: |
| **TASK-01** | Migration 4 bảng + chỉ mục | mọi US | Must | — | S |
| **TASK-02** | `waitingListRepository` + `offerEventRepository` | US-01, 11 | Must | TASK-01 | M |
| **TASK-03** | `waitingListService` + API danh sách chờ | US-01, 07, 08 | Must | TASK-02 | M |
| **TASK-04** | `offerRepository` + truy vấn chọn ứng viên | US-02 | Must | TASK-01 | M |
| **TASK-05** | `offerEngineService` — tạo đề xuất + điểm móc | US-02 | Must | TASK-04 | **L** |
| **TASK-06** | Chấp nhận / từ chối + API đề xuất | US-03, 04, 05 | Must | TASK-05 | **L** |
| **TASK-07** | `offerExpirySweeper` | US-06 | Must | TASK-05 | M |
| **TASK-08** | Frontend: thẻ đề xuất + panel danh sách chờ | US-03, 07 | Must | TASK-03, 06 | M |
| **TASK-09** | Dữ liệu mẫu | mọi US | Should | TASK-01 | S |

**Đường găng:** TASK-01 → TASK-04 → TASK-05 → TASK-06.

**Gợi ý chọn task cho WB-3:** nếu chỉ làm một, chọn **TASK-04** (chạm nhiều BR nhất, dễ thấy AI tự thêm ngẫu nhiên hoặc nới điều kiện) hoặc **TASK-06** (đồng thời; AI hay bỏ điều kiện hết hạn và kiểm chủ sở hữu). Hai task này bộc lộ rõ nhất chỗ AI cần Human kiểm soát.

---

## 2. Chi tiết

### TASK-01 — Migration 4 bảng và chỉ mục
| Mục | Nội dung |
| --- | --- |
| US / BR / AC | mọi US · BR-04, 05 (hai chỉ mục duy nhất) · kiểm chứng gián tiếp |
| File | `src/db/migrate.js` |
| Ngữ cảnh | `02-thiet-ke/06-du-lieu.md` §9 (script đầy đủ) |
| Ràng buộc | Idempotent tuyệt đối (K-05). **Không** sửa 6 bảng cũ |
| **Xong khi** | `npm run db:migrate` chạy 3 lần không lỗi · đủ `CHECK` · 2 chỉ mục duy nhất tồn tại · `npm test` xanh |

### TASK-02 — Repository danh sách chờ và nhật ký
| Mục | Nội dung |
| --- | --- |
| US / BR / AC | US-01, 11 · BR-15 · AC-01.1, 09.1 |
| File | `src/repositories/waitingListRepository.js`, `offerEventRepository.js` *(mới)* |
| Mẫu tham chiếu | `src/repositories/slotRepository.js` |
| Ngữ cảnh | `00-boi-canh/01-he-thong-hien-tai.md`, `02-thiet-ke/06-du-lieu.md` |
| Hàm | `create`, `findById`, `list({status, doctorId, specializationId})`, `listByPatient`, `updateStatus(client?, id, status)`, `update`, `countActiveByPatientAndTarget`. `offerEventRepository`: **chỉ** `append`, `list` — **không** có sửa/xóa |
| **Xong khi** | Alias camelCase đúng chuẩn · parameterized 100% · `offerEventRepository` không xuất hàm ghi đè · lint sạch |

### TASK-03 — Service và API danh sách chờ
| Mục | Nội dung |
| --- | --- |
| US / BR / AC | US-01, 07, 08 · **BR-13**, 15 *(BR-10 qua CMP-03)* · AC-01.1 → 01.5, 07.1, 07.2, 08.1 → 08.4 |
| File | `src/services/waitingListService.js`, `src/routes/waiting-list.routes.js` *(mới)*, `server.js` (đăng ký router) |
| API | API-01 → API-05 |
| Ngữ cảnh | `02-thiet-ke/05-api-va-su-kien.md` §3, `01-yeu-cau/03-quy-tac-nghiep-vu.md` (BR-13) |
| Điểm dễ sai | AC-01.3 (bác sĩ **hoặc** chuyên khoa) · AC-01.5 (409 khi trùng) · API-05 **chỉ** trả 5 trường — không `SELECT *` |
| ⚠️ Phụ thuộc ngầm | **AC-08.2** (hủy đăng ký đang giữ đề xuất) cần `cancelOfferForEntry` của CMP-03, thuộc TASK-05. Làm TASK-03 trước thì hoàn tất AC-08.1, 08.3, 08.4; **AC-08.2 xong sau TASK-05**. Đừng tự viết lại logic hủy đề xuất trong `waitingListService` (BR-10 chỉ có một chủ: CMP-03) |
| **Xong khi** | 5 endpoint đúng contract · phân quyền test được (AC-08.3, 08.4) · API-05 không lộ mức ưu tiên · ghi `entry_created`/`entry_cancelled` |

### TASK-04 — Repository đề xuất và truy vấn chọn ứng viên ⭐
| Mục | Nội dung |
| --- | --- |
| US / BR / AC | US-02 · **BR-02, 03**, 11, 12 · AC-02.5 → 02.11, 03.2 |
| File | `src/repositories/offerRepository.js` *(mới)*, thêm `findNextCandidate` vào `waitingListRepository.js` |
| Ngữ cảnh | `02-thiet-ke/06-du-lieu.md` §10 **(câu SQL đầy đủ)**, `01-yeu-cau/03` (BR-02, 03) |
| Hàm | `findNextCandidate(slotId)` · `create({…})` · `findById` · `findPendingBySlot` · `findPendingByPatient` · `listByPatient(patientId, {includeHistory})` (cột tường minh) · `listExpired()` · `transitionStatus(client?, {id, fromStatus, toStatus, …})` (conditional UPDATE) |
| **Bốn điều cấm** | 1. không `order by random()` (AC-02.7) · 2. không nới lỏng `NOT EXISTS` · 3. không `SELECT *` trong `listByPatient` (RISK-07) · 4. không tự thêm tiêu chí xếp hạng ngoài BR-02 |
| **Xong khi** | `findNextCandidate` khớp **từng mệnh đề** với §10 · `transitionStatus` là conditional UPDATE có `returning id` · test AC-02.5 → 02.7 xanh |

### TASK-05 — Offer Engine: tạo đề xuất và điểm móc ⭐
| Mục | Nội dung |
| --- | --- |
| US / BR / AC | US-02 · **BR-01, 04, 05, 06, 08, 10, 16** · AC-02.1 → 02.4, 02.11, 03.3 |
| File | `src/services/offerEngineService.js` *(mới)* · `appointmentService.js`, `slotService.js` *(extend)* |
| Ngữ cảnh | `02-thiet-ke/03-thanh-phan.md` §3, §4 · `04-luong-va-trang-thai.md` §2 |
| Hàm public | `onSlotBecameAvailable(slotId)` · `onSlotTaken(slotId)` · `advanceChain(slotId)` *(nội bộ)* |
| **Bốn ràng buộc kiến trúc — vi phạm là reject** | 1. lời gọi Offer Engine **sau `commit`**, ngoài giao dịch · 2. try/catch **nuốt** lỗi, ghi log · 3. `offerEngineService` **không** `require` service nào khác · 4. tôn trọng `OFFER_ENGINE_ENABLED=false` |
| **Xong khi** | 4 điểm móc đúng vị trí · 14 test cũ vẫn xanh · AC-02.1 → 02.4 xanh · hạn = `min(now + timeout, giờ bắt đầu slot)` · ghi `offer_sent` / `no_candidate` |

### TASK-06 — Chấp nhận và từ chối đề xuất ⭐
| Mục | Nội dung |
| --- | --- |
| US / BR / AC | US-03, 04, 05 · **BR-07, 09, 10, 14** · AC-03.1 → 03.4, 04.1 → 04.6, 05.1 → 05.4 |
| File | `offerEngineService.js` *(extend)*, `src/routes/offers.routes.js` *(mới)*, `server.js` |
| API | API-06, 07, 08 |
| Ngữ cảnh | `04-luong-va-trang-thai.md` §2 (bước 14 → 23), §3 (D, E, G), §5 · `07-bao-mat-do-tin-cay.md` §2 |
| Giao dịch chấp nhận | `begin` → `findForUpdate(slot)` → kiểm slot còn trống → `appointmentRepository.create` (**Reuse**) → conditional UPDATE đề xuất (**đặt `appointment_id`**, có `expires_at > now()`) → `slotRepository.updateStatus(booked)` (**Reuse**) → đăng ký → `fulfilled` → `commit` |
| **Năm điểm AI hay sai** | 1. quên `and expires_at > now()` · 2. quên kiểm chủ sở hữu (BR-14) — chỉ dùng `requireRole` · 3. gộp ba lỗi 409 thành một · 4. gọi `appointmentService.bookAppointment()` thay vì `appointmentRepository.create()` (giao dịch lồng + vòng `require`) · 5. nhận hình thức khám từ body thay vì từ đề xuất |
| **Xong khi** | AC-04.1 → 04.6, 05.1 → 05.4 xanh · **có test đồng thời** (AC-04.6) · ba thông báo 409 phân biệt · API-06 không lộ dữ liệu cấm |

### TASK-07 — Tác vụ xử lý hết hạn
| Mục | Nội dung |
| --- | --- |
| US / BR / AC | US-06 · BR-06, 07, 08 · AC-06.1 → 06.5 |
| File | `src/services/offerExpirySweeper.js` *(mới)*, `server.js` |
| Ngữ cảnh | `04-luong-va-trang-thai.md` §3 (B), §8 |
| Bắt buộc | `start()`, `stop()` (**bắt buộc** — không có thì test treo), `sweepOnce()` (gọi trực tiếp trong test, không chờ chu kỳ). Mỗi đề xuất trong try/catch **riêng** (RISK-09). **Không** tự chạy khi `NODE_ENV === 'test'` hoặc `OFFER_ENGINE_ENABLED=false`. Đọc lại trạng thái slot trước `advanceChain` (AC-06.3) |
| **Xong khi** | `sweepOnce()` test được không cần chờ · `stop()` hoạt động, `npm test` không treo · AC-06.1 → 06.5 xanh |

### TASK-08 — Frontend
| Mục | Nội dung |
| --- | --- |
| US / BR / AC | US-03, 07 · **BR-11, 12** · AC-03.1, 03.2, 07.1 |
| File | `public/js/views/patient.js`, `staff.js` *(extend)* · `waitingList.js` *(mới)* · `public/js/api.js` · `public/styles.css` |
| Ngữ cảnh | `02-thiet-ke/05-api-va-su-kien.md`, K-07 |
| Bệnh nhân | Thẻ "Đề xuất khung giờ sớm hơn" với đếm ngược từ `remainingSeconds`; nút Chấp nhận / Từ chối; `remainingSeconds ≤ 0` ⇒ vô hiệu hóa nút. Nhãn phải ghi **"Đề xuất — cần xác nhận trong X phút"**, không để bệnh nhân tưởng đã có lịch |
| Staff | Bảng danh sách chờ (tên, SĐT, bác sĩ/chuyên khoa, mức ưu tiên, trạng thái, thời gian chờ, đề xuất treo); nút thêm và hủy |
| **Xong khi** | JS thuần, không dependency, không build · gọi API qua `api.js` · text tiếng Việt · màn hình bệnh nhân **không** hiển thị mức ưu tiên hay vị trí · smoke test 3 luồng |

### TASK-09 — Dữ liệu mẫu
| Mục | Nội dung |
| --- | --- |
| File | `src/db/seed.js` |
| Ngữ cảnh | `02-thiet-ke/06-du-lieu.md` §11 |
| Ràng buộc | Idempotent bằng `on conflict do nothing` (**không** `do update`: seed hiện có dùng `do update` nên hồi sinh dữ liệu đã hủy và có thể chặn khởi động lại — HT-GAP-01, 02) · ngày tương đối · `setval` lại sequence · **không** seed sẵn đề xuất |
| **Xong khi** | `npm run db:seed` chạy 3 lần cho kết quả giống nhau · hủy một lịch có sẵn (slot đủ xa) thì đề xuất sinh cho Huy (`urgent`), không phải Linh (`normal`, vào trước) |

---

## 3. Mẫu ngữ cảnh task (điền rồi đưa cho AI ở WB-3)

```
Mã task:            TASK-06
Tên task:           Chấp nhận và từ chối đề xuất
Mục tiêu:           Hiện thực API-06/07/08 và phần phản hồi của offerEngineService,
                    đúng BR-07, BR-09, BR-10, BR-14.
Story liên quan:    US-04 (Must), US-05 (Should), US-03 (Must)
AC phải thỏa:       AC-03.1→03.4, AC-04.1→04.6, AC-05.1→05.4
BR phải hiện thực:  BR-07, BR-09, BR-10, BR-14
File được sửa:      src/services/offerEngineService.js, src/routes/offers.routes.js (mới), server.js
File chỉ đọc:       src/services/appointmentService.js (mẫu giao dịch),
                    src/repositories/{slot,appointment}Repository.js
Ràng buộc:          K-01…K-10; không thêm dependency; không sửa API hiện có;
                    conditional UPDATE cho mọi phép chuyển trạng thái.
Khi thiếu thông tin: DỪNG, ghi thiếu gì / vì sao / ai trả lời (NT-03).
```
