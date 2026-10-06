# 02 · 03 — Thành phần và trách nhiệm

> **Mã:** WB2-02-03 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Tech Lead] · **Cổng:** CP-06
> **Nguồn:** `02-phuong-an-va-quyet-dinh.md` (ADR-008, phương án B), `01-yeu-cau/03-quy-tac-nghiep-vu.md` · **Bước WB-1:** WF-07

**Nguyên tắc:** Reuse trước Extend, chỉ New khi cần. **Mỗi quy tắc nghiệp vụ thuộc về đúng một thành phần** — nếu một quy tắc xuất hiện ở hai nơi, đó là dấu hiệu luật bắt đầu phân tán (DR-01).

---

## 1. Bảng thành phần

| ID | Thành phần | File | Loại | Trách nhiệm chính | BR chịu trách nhiệm | Tương tác với |
| --- | --- | --- | :---: | --- | --- | --- |
| **CMP-01** | `waitingListRepository` | `src/repositories/waitingListRepository.js` | New | Toàn bộ SQL trên đăng ký chờ. Chứa **câu truy vấn chọn ứng viên**, bản dịch trực tiếp của BR-02 + BR-03 | *(thực thi BR-02/03, không quyết định)* | Pool |
| **CMP-02** | `offerRepository` | `src/repositories/offerRepository.js` | New | Toàn bộ SQL trên đề xuất; các conditional UPDATE chuyển trạng thái; **chọn cột trả về cho bệnh nhân** | BR-11, BR-12 *(mức chọn cột)* | Pool |
| **CMP-03** | `offerEngineService` | `src/services/offerEngineService.js` | New | **Trái tim của tính năng.** Quyết định khi nào tạo đề xuất, cho ai, hạn bao lâu; xử lý chấp nhận / từ chối / hủy; chuỗi chuyển tiếp | **BR-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 14, 16** | CMP-01, 02, 07, 08, `slotRepository`, `appointmentRepository` |
| **CMP-04** | `offerExpirySweeper` | `src/services/offerExpirySweeper.js` | New | Chạy định kỳ, tìm đề xuất quá hạn, gọi CMP-03 xử lý. Có `start()`, `stop()`, `sweepOnce()` | *(cơ chế thực thi BR-06, BR-07)* | CMP-02, CMP-03 |
| **CMP-05** | `waitingListService` | `src/services/waitingListService.js` | New | Nghiệp vụ danh sách chờ: thêm, sửa mức ưu tiên, hủy, liệt kê; kiểm phân quyền | **BR-13** | CMP-01, CMP-03 *(khi hủy đăng ký đang giữ đề xuất)*, CMP-07 |
| **CMP-06** | Frontend | `public/js/views/patient.js`, `staff.js`, `waitingList.js` | Extend + New | Hiển thị đề xuất kèm đếm ngược, nút chấp nhận / từ chối; panel danh sách chờ cho staff | **BR-11, BR-12** *(mức hiển thị)* | API qua `public/js/api.js` |
| **CMP-07** | `offerEventRepository` | `src/repositories/offerEventRepository.js` | New | Ghi và đọc nhật ký. **Chỉ thêm** — không có hàm sửa hay xóa | **BR-15** | Pool |
| **CMP-08** | `notificationRepository` | `src/repositories/notificationRepository.js` | New | SQL trên thông báo. Tách riêng để sau này gắn kênh SMS/email mà không sửa CMP-03 | — | Pool |
| **CMP-09** | `appointmentService` | `src/services/appointmentService.js` | Extend | Giữ nguyên mọi trách nhiệm cũ. **Thêm đúng 2 lời gọi** tới CMP-03, sau `commit` | *(không nhận thêm BR)* | CMP-03 |
| **CMP-10** | `slotService` | `src/services/slotService.js` | Extend | Giữ nguyên. **Thêm 2 lời gọi** tới CMP-03 tùy chiều đổi trạng thái | *(không nhận thêm BR)* | CMP-03 |
| **CMP-11** | Route files | `src/routes/waiting-list.routes.js`, `offers.routes.js` | New | Ánh xạ HTTP → service; gắn `demoAuth` + `requireRole` | — | CMP-03, CMP-05 |
| — | `slotRepository`, `appointmentRepository` | — | Reuse | Không sửa một dòng | — | — |
| — | `demoAuth`, `requireRole`, `errors`, `validate` | — | Reuse | Không sửa | — | — |

**Thống kê:** Reuse 4 nhóm · Extend 3 (CMP-06, 09, 10) · New 9.

---

## 2. Mỗi BR đúng một chủ

| BR | Thành phần chịu trách nhiệm | Nơi kiểm chứng lần hai |
| --- | --- | --- |
| BR-01 Kích hoạt | CMP-03 `onSlotBecameAvailable()` | — |
| BR-02 Thứ tự ưu tiên | CMP-03 *(quyết định)*, `ORDER BY` trong CMP-01 | — |
| BR-03 Điều kiện ứng viên | CMP-03 *(quyết định)*, `WHERE` trong CMP-01 | — |
| BR-04 Một đề xuất / slot | CMP-03 | **DB:** ràng buộc duy nhất từng phần |
| BR-05 Một đề xuất / bệnh nhân | CMP-03 | **DB:** ràng buộc duy nhất từng phần |
| BR-06 Hạn trả lời | CMP-03 | CMP-04 phát hiện quá hạn |
| BR-07 Chuyển tiếp | CMP-03 `advanceChain()` | CMP-04 kích hoạt nhánh hết hạn |
| BR-08 Hết ứng viên | CMP-03 | CMP-07 ghi sự kiện |
| BR-09 Chấp nhận toàn vẹn | CMP-03 `acceptOffer()` | **DB:** `one_active_appointment_per_slot` (có sẵn) |
| BR-10 Slot mất khả dụng | CMP-03 `onSlotTaken()` | Gọi từ CMP-09, CMP-10 |
| BR-11 Nội dung đề xuất | CMP-02 *(chọn cột)* | CMP-06 *(hiển thị)* |
| BR-12 Không lộ vị trí hàng đợi | CMP-02 | CMP-06 |
| BR-13 Quyền danh sách chờ | CMP-05 | `requireRole` ở CMP-11 |
| BR-14 Kiểm chủ sở hữu | CMP-03 | — |
| BR-15 Nhật ký | CMP-07 | — |
| BR-16 Thời gian tối thiểu | CMP-03 | — |

**Kiểm tra:** không BR nào xuất hiện ở hai cột "chịu trách nhiệm". Không thành phần nào chịu trách nhiệm một BR mà nó không có đủ dữ liệu để thực thi.

---

## 3. Giao diện công khai của CMP-03

CMP-03 là thành phần duy nhất các service khác chạm tới. Bề mặt cố tình hẹp:

```js
// Điểm móc sự kiện — gọi từ appointmentService / slotService, SAU commit
async function onSlotBecameAvailable(slotId)   // BR-01 → BR-16 → BR-03 → BR-02 → tạo đề xuất
async function onSlotTaken(slotId)             // BR-10 — hủy đề xuất đang treo trên slot

// Hành động của bệnh nhân — gọi từ routes/offers
async function acceptOffer({ offerId, user })  // BR-09, BR-14
async function declineOffer({ offerId, user }) // BR-07, BR-14
async function listMyOffers(patientId)         // BR-11, BR-12

// Dùng bởi tác vụ quét
async function expireOffer(offerId)            // BR-06, BR-07

// Dùng bởi waitingListService khi hủy đăng ký đang giữ đề xuất
async function cancelOfferForEntry(entryId, reason)   // BR-10
```

**Không xuất ra ngoài:** hàm chọn ứng viên, hàm tính hạn, hàm ghi nhật ký. Nếu lộ ra, service khác sẽ gọi và luật nghiệp vụ bắt đầu phân tán — chính là gốc của context drift ở WB-1.

## 4. Quy tắc gọi từ service hiện có

```js
// appointmentService.cancelAppointment() — SAU khối giao dịch
await client.query("commit");
// … client.release() ở finally …

try {
  await offerEngineService.onSlotBecameAvailable(appointment.slot_id);
} catch (error) {
  console.error("[offer-engine] onSlotBecameAvailable thất bại", { slotId, error });
}
return appointmentRepository.findDetailedById(id);
```

**Ba điều bắt buộc:** (1) nằm **sau** `commit`; (2) bọc `try/catch`, **nuốt** lỗi, ghi log — người dùng hủy lịch không nhận lỗi vì Offer Engine hỏng; (3) **không** `await` bên trong giao dịch — kéo dài thời gian giữ khóa.

| Service | Hàm | Điều kiện | Gọi |
| --- | --- | --- | --- |
| `appointmentService` | `cancelAppointment()` | luôn | `onSlotBecameAvailable(slotId)` |
| `appointmentService` | `bookAppointment()` | luôn | `onSlotTaken(slotId)` |
| `slotService` | `updateSlot()` | chuyển sang còn trống | `onSlotBecameAvailable(slotId)` |
| `slotService` | `updateSlot()` | chuyển sang đã đặt | `onSlotTaken(slotId)` |

## 5. Chống phụ thuộc vòng

```
routes ──► services ──► repositories ──► pool
             │
             ├─ appointmentService ──► offerEngineService   ✅ hợp lệ
             └─ offerEngineService ──► appointmentService   ❌ CẤM — vòng require
```

`offerEngineService` chỉ được `require` các **repository**. Khi cần tạo lịch hẹn, nó gọi thẳng `appointmentRepository.create(client, {…})` trong giao dịch của chính nó, **không** gọi `appointmentService.bookAppointment()`. Đây không phải lặp code: `bookAppointment()` mở giao dịch riêng; gọi nó từ trong một giao dịch khác tạo giao dịch lồng, thứ `pg` không hỗ trợ như người ta tưởng.

---

## 6. Rà soát thiết kế thành phần (NT-11)

| Tiêu chí | Đánh giá | Vấn đề | Xử lý |
| --- | :---: | --- | --- |
| Trách nhiệm đơn | ⚠️ → ✅ | Bản đầu để CMP-03 gánh cả vòng đời đề xuất **và** CRUD danh sách chờ | Tách CMP-05 |
| Cohesion | ✅ | Mọi hàm của CMP-03 xoay quanh một vòng đời | — |
| Coupling | ⚠️ → ✅ | CMP-09, 10 phụ thuộc trực tiếp CMP-03 | Chấp nhận: một chiều, bề mặt 2 hàm, không vòng. Thêm event bus nội bộ để "giảm coupling" sẽ làm luồng khó truy vết hơn mà không có giá trị thật ở quy mô này |
| Tái sử dụng | ✅ | 4 repository và 2 middleware dùng lại nguyên | — |
| Mở rộng | ✅ | Thêm SMS = thêm adapter đọc CMP-08, không sửa CMP-03 | — |
| Bảo trì | ⚠️ | CMP-03 nhận 12/16 BR — nguy cơ phình | Chấp nhận **có ý thức**: đây là các luật của **cùng một** vòng đời. Bù: mỗi hàm public ≤ 40 dòng; coding-log ghi rõ BR mỗi hàm thực thi |

### Phương án đã xem xét và không chọn: tách CMP-03 thành ba service

Đề xuất: `offerCreationService`, `offerResponseService`, `offerLifecycleService`, "để tuân thủ SRP". **Không chọn**, vì ba service này dùng chung repository, chung bảng, chung ràng buộc, và phải gọi lẫn nhau (tạo → phản hồi → chuyển tiếp → tạo): kết quả là ba file coupling chặt cộng một vòng phụ thuộc thay cho một file mạch lạc.

> **Ranh giới thành phần theo ranh giới của vòng đời dữ liệu, không theo ranh giới của động từ.**

`[CẦN XÁC NHẬN]` HR2-07 — Tech Lead xác nhận việc gộp này.

---

## 7. Đối chiếu tiêu chí của cổng CP-06 (phần thành phần)

| Tiêu chí | AI đánh giá |
| --- | :---: |
| Phù hợp Architecture Decision | ✅ |
| Reuse trước Extend, New khi cần | ✅ |
| Mỗi thành phần có trách nhiệm rõ | ✅ (sau khi tách CMP-05) |
| BR không phân tán | ✅ (§2) |
| Coupling thấp, cohesion cao | ✅ |
| Không dư thừa | ⚠️ CMP-08 không gắn BR trực tiếp — xem `08-truy-vet.md` §3 |
