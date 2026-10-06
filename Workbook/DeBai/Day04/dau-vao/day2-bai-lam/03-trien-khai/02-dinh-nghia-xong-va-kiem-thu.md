# 03 · 02 — Định nghĩa "xong" và chiến lược kiểm thử

> **Mã:** WB2-03-02 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Tech Lead + QA] · **Cổng:** CP-07
> **Nguồn:** `03-trien-khai/01-danh-sach-task.md`, `02-thiet-ke/08-truy-vet.md`, `01-yeu-cau/05-tieu-chi-chap-nhan.md`, K-01 → K-10 · **Bước WB-1:** WF-08

---

## Phần A — Định nghĩa "xong" cho một task

Một task chỉ xong khi **mọi** ô dưới đây được tick, có bằng chứng.

### 1. Chức năng
- [ ] Đúng phạm vi task — không thừa, không thiếu
- [ ] Mọi BR được giao đã hiện thực; **mỗi BR ghi vị trí trong coding-log**
- [ ] Mọi AC được giao có ít nhất một test trỏ về
- [ ] Không hiện thực quy tắc nào **không** có ở `01-yeu-cau/03-quy-tac-nghiep-vu.md`

### 2. Ràng buộc kiến trúc (ADR-008, K-xx)
- [ ] `package.json` **không đổi** (K-08) · `docker-compose.yml` **không đổi** (K-09)
- [ ] 16 endpoint hiện có giữ nguyên request / response / mã lỗi (K-10)
- [ ] 6 bảng hiện có không bị sửa cấu trúc
- [ ] Route không viết SQL; repository không chứa luật nghiệp vụ (K-06)
- [ ] `offerEngineService` không `require` service nào khác
- [ ] Lời gọi Offer Engine **sau `commit`**, bọc `try/catch`, nuốt lỗi

### 3. Chất lượng mã
- [ ] `npm run lint` sạch, không warning
- [ ] Mọi SQL parameterized (K-01)
- [ ] Alias camelCase làm bằng SQL, không bằng hàm map trong service
- [ ] Phép chuyển trạng thái dùng conditional UPDATE, không đọc-rồi-ghi
- [ ] Mọi giao dịch có đủ `begin` / `commit` / `rollback` / `client.release()`
- [ ] Thứ tự khóa `slots` trước, `appointments` sau (RISK-10)
- [ ] Thông báo lỗi tiếng Việt, đúng mã HTTP; không lộ SQL / tên bảng / stack
- [ ] Comment chỉ giải thích **vì sao**

### 4. Bảo mật và riêng tư
- [ ] Mọi thao tác trên đề xuất kiểm `offer.patient_id === req.user.patientId` **ở tầng service** (BR-14)
- [ ] Không `SELECT *` trong repository phục vụ bệnh nhân (RISK-07)
- [ ] Response cho bệnh nhân **không chứa** mức ưu tiên, vị trí hàng đợi, tổng số người chờ, thông tin bệnh nhân khác, lý do khám, chẩn đoán (BR-11, 12)
- [ ] Nhật ký **không** ghi mức ưu tiên (BR-15)
- [ ] Endpoint của staff có `requireRole('staff')`

### 5. Kiểm thử
- [ ] **14 test hiện có vẫn xanh**
- [ ] Test mới dùng `node:test` + `node:assert/strict`; gọi HTTP và PostgreSQL thật; **không mock DB**
- [ ] Mỗi ca tự reset dữ liệu; tên ca bằng tiếng Việt, mô tả hành vi nghiệp vụ
- [ ] Task chạm đồng thời: có ít nhất một test gửi request **đồng thời**
- [ ] Task có tác vụ quét: `stop()` được gọi cuối test, `npm test` **không treo**
- [ ] `npm test` chạy hai lần liên tiếp cho cùng kết quả

### 6. Dữ liệu
- [ ] Migration idempotent — chạy 3 lần không lỗi
- [ ] Dữ liệu mẫu idempotent, ngày tương đối
- [ ] Bốn truy vấn kiểm tra lệch (`02-thiet-ke/04-luong-va-trang-thai.md` §9) trả **0 dòng**

### 7. Bàn giao và truy vết
- [ ] coding-log có: task · file đã đổi · **BR đã hiện thực kèm mã** · giả định còn lại · file đã nạp làm ngữ cảnh
- [ ] Mọi giả định AI tự đưa ra đã được Human xác nhận hoặc bác bỏ
- [ ] Mọi `[CẦN XÁC NHẬN]` đã xử lý hoặc chuyển thành câu hỏi có chủ
- [ ] Đã chạy **danh sách kiểm tra lệch** (`02-thiet-ke/08-truy-vet.md` §9) và ghi kết quả
- [ ] Rủi ro còn lại ghi vào bàn giao — đặc biệt **RISK-06** (không có kênh báo ngoài app)

### 8. Human review (CP-08)
- [ ] Có ít nhất một người đọc **toàn bộ diff**, không chỉ tóm tắt của AI
- [ ] Mọi đề xuất của AI trong review đã được **quyết định**: chấp nhận, điều chỉnh, hoặc từ chối kèm lý do

**Ba tiêu chí không thể thương lượng** — thiếu một là task **không** được chuyển sang QA:
1. **14 test hiện có vẫn xanh.**
2. **`package.json` không đổi** (đổi là đổi ADR-008, phải qua Tech Lead).
3. **Kiểm chủ sở hữu ở tầng service (BR-14).**

**Mẫu cổng chất lượng (CP-08 → CP-09)**

| Tiêu chí | Đạt / Chưa | Bằng chứng |
| --- | :---: | --- |
| Task đúng phạm vi | | so với `01-danh-sach-task.md` |
| BR và AC đã hiện thực | | coding-log |
| Test đã chạy và đạt | | output `npm test` |
| Code review hoàn thành | | báo cáo review |
| Không còn vấn đề nghiêm trọng chưa xử lý | | báo cáo review |
| Đã chạy kiểm tra lệch | | kết quả `08-truy-vet.md` §9 |
| Hạn chế, giả định, rủi ro đã ghi | | tài liệu bàn giao |

---

## Phần B — Chiến lược kiểm thử

**Ràng buộc:** dùng đúng bộ công cụ hiện có — `node --test` + PostgreSQL thật, **không mock DB**, không thêm framework (K-08).

### 1. Hiện trạng
`tests/api.test.js` — 14 test tích hợp: gọi HTTP thật, query PostgreSQL thật, mỗi ca tự reset dữ liệu. Ca **hai request đặt cùng slot đồng thời** (đúng một thành công, một nhận 409) là **mẫu chuẩn** cho mọi test đồng thời mới — sao chép cấu trúc của nó.

### 2. Phân tầng

| Tầng | Phạm vi | Khi nào |
| --- | --- | --- |
| Unit | Hàm thuần: tính hạn, kiểm BR-16, chuẩn hóa enum | WB-3 |
| Integration / API | Endpoint qua HTTP + DB thật | WB-3 |
| Concurrency | Race condition bằng `Promise.all` | **Bắt buộc** cho TASK-06 |
| E2E thủ công | Luồng demo qua giao diện | WB-3 (QA) |

> Phần lớn logic nằm trong **SQL** (truy vấn chọn ứng viên, conditional UPDATE, chỉ mục duy nhất). Unit test với DB giả **không** kiểm chứng được BR-02, 03, 04, 05, 09. Trọng tâm là integration test với PostgreSQL thật.

### 3. Ma trận AC → loại test

| AC | Loại | Ghi chú kỹ thuật |
| --- | --- | --- |
| AC-01.1 → 01.5 | Integration | CRUD + validate |
| AC-02.1 | Integration | Hủy lịch → kiểm đề xuất tạo trong ≤ 5 giây |
| AC-02.2, 02.3 | Integration | Phân biệt sửa slot với tạo slot mới |
| AC-02.4 | Integration | Slot bắt đầu sau 20 phút → không có đề xuất |
| **AC-02.5, 02.6, 02.7** | Integration | **Cốt lõi BR-02.** AC-02.7 lặp 10 lần, assert cùng kết quả |
| AC-02.8 → 02.11 | Integration | Từng mệnh đề `NOT EXISTS` của BR-03 |
| AC-03.1, 03.4 | API contract | Mảng rỗng, không phải 404 |
| **AC-03.2** | API contract | Assert response **không chứa** khóa cấm (§5) |
| AC-04.1 | Integration | Kiểm 4 bảng sau giao dịch |
| AC-04.2 | Integration | Đặt chủ động trước, rồi chấp nhận |
| AC-04.3 | Integration | Lùi hạn về quá khứ bằng SQL (§4a) |
| AC-04.4 | Integration | Chấp nhận 2 lần, assert chỉ 1 lịch hẹn |
| AC-04.5, 05.4 | Integration | Đổi header sang bệnh nhân khác → 403 |
| **AC-04.6** | Concurrency | `Promise.all([chấp nhận, đặt chủ động])` — mẫu ca đồng thời sẵn có |
| AC-05.1, 05.2 | Integration | Từ chối → kiểm đề xuất mới cho người kế tiếp |
| **AC-06.1 → 06.3** | Integration | Gọi `sweepOnce()` trực tiếp, **không** chờ chu kỳ thật |
| AC-06.4 | Unit | Hàm tính hạn |
| AC-06.5 | Concurrency | `Promise.all([sweepOnce(), sweepOnce()])` |
| AC-07.1 → 08.4 | Integration | Phân quyền |
| AC-09.1 | Integration | Assert đúng 4 dòng, đúng thứ tự |

### 4. Bốn kỹ thuật cần cho tính năng này

**a) Điều khiển thời gian mà không mock `Date`.** Dựng dữ liệu ở trạng thái mong muốn bằng SQL:

```js
// Làm đề xuất hết hạn: lùi CẢ sent_at LẪN expires_at về quá khứ
await query(
  `update appointment_offers
   set sent_at = now() - interval '20 minutes', expires_at = now() - interval '1 minute'
   where id = $1`, [offerId]);
await sweeper.sweepOnce();
```
> ⚠️ **Phải lùi cả `sent_at`.** Bảng có ràng buộc `check (expires_at > sent_at)`; chỉ sửa `expires_at` sẽ bị từ chối với `violates check constraint` — thông báo không nói gì về ý định của bạn, rất dễ mất thời gian.

**b) Gọi tác vụ quét trực tiếp.** Không bao giờ `await sleep(30000)` trong test. Vì vậy TASK-07 bắt buộc có `sweepOnce()`.

**c) Test đồng thời** — sao chép cấu trúc ca sẵn có:
```js
const [r1, r2] = await Promise.allSettled([
  fetch(`${BASE}/api/offers/${offerId}/accept`, { method: "POST", headers: patientA }),
  fetch(`${BASE}/api/appointments`, { method: "POST", headers: patientB, body: JSON.stringify({ slotId }) }),
]);
assert.deepEqual([r1.value.status, r2.value.status].sort(), [201, 409]);
// và assert DB chỉ có 1 lịch hẹn hoạt động cho slot
```

**d) Dựng kịch bản ưu tiên xác định** — kiểm soát `created_at` chính xác bằng `insert … created_at = now() - interval '2 hours'` cho AC-02.5 → 02.7.

### 5. Test quyền riêng tư — kiểu test **phủ định** (bắt buộc)

```js
test("Đề xuất gửi cho bệnh nhân không chứa dữ liệu nhạy cảm", async () => {
  const body = JSON.stringify((await (await fetch(`${BASE}/api/my-offers`, { headers })).json()).data);
  for (const forbidden of ["medicalPriority", "medical_priority", "queuePosition", "totalWaiting", "note", "diagnosis"]) {
    assert.ok(!body.includes(forbidden), `Response chứa trường cấm: ${forbidden}`);
  }
});
```
Test này bắt được cả trường hợp về sau đổi repository sang `SELECT *` (RISK-07).

### 6. Kiểm tra bất biến dữ liệu
Sau mỗi kịch bản phức tạp, chạy bốn truy vấn ở `02-thiet-ke/04-luong-va-trang-thai.md` §9 và assert cả bốn trả 0 dòng (viết thành helper `assertNoDataDrift()`). Đây là lưới an toàn hiệu quả nhất cho tính năng nhiều trạng thái đồng thời.

### 7. Smoke test thủ công (E2E)

| # | Kịch bản | Kỳ vọng |
| ---: | --- | --- |
| 1 | Staff thêm Huy (`urgent`) và Linh (`normal`) vào danh sách chờ | Cả hai hiện trong panel |
| 2 | An hủy lịch của mình (slot đủ xa, BR-16) | Slot còn trống |
| 3 | Đăng nhập Huy (vào **sau** Linh) | **Thấy thẻ đề xuất** — chứng minh BR-02 |
| 4 | Đăng nhập Linh | **Không** thấy đề xuất |
| 5 | Huy bấm Chấp nhận | Lịch hẹn mới ở "Lịch của tôi"; slot đã đặt |
| 6 | Staff xem nhật ký | `offer_sent` rồi `offer_accepted` |
| 7 | Lặp bước 2, để Huy không phản hồi | Sau ≤ 60 giây Huy mất đề xuất, Linh thấy đề xuất |
| 8 | Xem màn hình Huy trong lúc chờ | **Không** thấy mức ưu tiên hay vị trí (BR-12) |

Kịch bản 3 + 4 là bằng chứng trực quan của BR-02; kịch bản 7 là bằng chứng của US-06.

### 8. Cố ý KHÔNG test

| Không test | Lý do |
| --- | --- |
| Cơ chế `demoAuth` | Đã có test cũ; ngoài phạm vi |
| Hiệu năng dưới tải | Không có yêu cầu tải (R-10 chỉ đặt ngưỡng độ trễ) |
| Nội dung SMS / email | Không tồn tại trong phạm vi (RISK-06) |
| Tác vụ quét trên nhiều instance | Chấp nhận giới hạn một instance (RISK-04) |
| Hành vi sau khi Q-07 được trả lời | Chưa có luật |

**Ghi rõ các khoảng trống này trong báo cáo kiểm thử.** Không test là một quyết định, không phải thiếu sót — nhưng chỉ khi được nói ra.

### 9. Lệnh chạy

```bash
docker compose up db -d
export DATABASE_URL="postgres://medbook:medbook@localhost:55432/medbook"
npm run db:migrate && npm run db:seed
npm run lint
npm test
```
CI (lint → migrate → seed → test, PostgreSQL 16 thật) **không cần sửa** — hệ quả trực tiếp của việc ADR-008 không thêm dependency.
