# 02 · 02 — Phương án kiến trúc và quyết định (ADR-008)

> **Mã:** WB2-02-02 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt — **quyết định là đề xuất, Tech Lead chốt** · **Người duyệt:** [chờ Tech Lead] · **Cổng:** CP-05
> **Nguồn:** `01-phan-tich-anh-huong.md`, `01-yeu-cau/` (US-06 Must, BR-04 → BR-10), K-01 → K-10 · **Bước WB-1:** WF-06

AI đề xuất phương án và khuyến nghị; **quyết định cuối cùng thuộc về Tech Lead** (RSP-08). NT-11: đề xuất được phản biện độc lập trước khi trình duyệt (§4).

---

## 1. Ba phương án

### Phương án A — Xử lý đồng bộ ngay trong luồng hủy lịch

| Nội dung | Mô tả |
| --- | --- |
| **Ý tưởng** | Không có thành phần riêng. Trong `cancelAppointment()`, sau khi hủy xong thì chạy luôn việc chọn ứng viên và tạo đề xuất, cùng một request |
| **Mới** | 2 bảng + `waitingListRepository`. Không service mới |
| **Tái sử dụng** | `appointmentService`, `slotService`, các repository, toàn bộ middleware |
| **Tích hợp** | Nhúng thẳng vào service hiện có |
| **Đồng thời** | Dựa vào giao dịch sẵn có của `cancelAppointment` |
| **Nhất quán** | Mạnh nhất: đề xuất tạo trong cùng giao dịch với việc hủy |
| **Phục hồi lỗi** | **Không có.** Lỗi khi tạo đề xuất rollback luôn việc hủy lịch |
| **Ưu điểm** | Ít code nhất; ít thành phần để hỏng; dễ hiểu |
| **Hạn chế** | • **Không xử lý được hết hạn** — không có gì chạy nền ⇒ US-06 (Must) không thực hiện được<br>• Vi phạm SRP: `appointmentService` đã là service phức tạp nhất<br>• Người bấm hủy phải chờ cả quá trình chọn ứng viên<br>• Lỗi Offer Engine làm hỏng hành động hủy lịch |
| **Rủi ro** | **Cao:** luật mới nằm lẫn trong service đang giữ ràng buộc chống đặt trùng |
| **Phù hợp khi** | Chỉ cần "gợi ý một người", không hạn trả lời, không chuyển tiếp tự động |

### Phương án B — Offer Engine in-process + tác vụ quét định kỳ, cơ sở dữ liệu là nguồn sự thật ⭐

| Nội dung | Mô tả |
| --- | --- |
| **Ý tưởng** | Tách `offerEngineService` chịu trách nhiệm toàn bộ vòng đời đề xuất. Các service hiện có chỉ **báo sự kiện** (`onSlotBecameAvailable`, `onSlotTaken`) **sau khi giao dịch của mình đã commit**. Một tác vụ định kỳ trong cùng tiến trình quét đề xuất quá hạn. Toàn bộ trạng thái ở PostgreSQL, không có trạng thái trong bộ nhớ |
| **Mới** | 4 bảng · `offerEngineService` · `offerExpirySweeper` · `waitingListService` · 4 repository · 2 route file |
| **Tái sử dụng** | Các hàm `slotRepository`, `appointmentRepository` nêu ở `01-phan-tich-anh-huong.md` §4; `demoAuth`, `requireRole`, `httpError`; khuôn giao dịch và conditional UPDATE |
| **Tích hợp** | Gọi hàm trực tiếp, **một chiều**: service hiện có → Offer Engine. Lời gọi đặt sau `commit`, bọc try/catch |
| **Đồng thời** | Ba lớp, sao chép mô hình của K-04: (1) `SELECT … FOR UPDATE` trên slot; (2) conditional UPDATE trên đề xuất; (3) hai partial unique index |
| **Nhất quán** | Eventual trong khoảng rất ngắn: hủy lịch commit trước, đề xuất tạo ngay sau (< 1 giây). Trong khe hở đó slot còn trống bình thường, bệnh nhân vẫn đặt được, không có dữ liệu sai |
| **Phục hồi lỗi** | • Offer Engine lỗi ⇒ hủy lịch vẫn thành công, slot vẫn còn trống<br>• Ứng dụng khởi động lại ⇒ lượt quét sau tự dọn (trạng thái ở DB)<br>• Quét chồng nhau ⇒ conditional UPDATE bảo đảm mỗi đề xuất xử lý một lần |
| **Ưu điểm** | • **Không thêm dependency** (K-08)<br>• Vẫn `docker compose up` một lệnh (K-09)<br>• Xử lý được hết hạn ⇒ US-06 khả thi<br>• Mỗi quy tắc có đúng một chỗ ở<br>• Test được bằng bộ công cụ hiện có<br>• Rollback = xóa 4 bảng mới |
| **Hạn chế** | • Tác vụ quét gắn với vòng đời tiến trình; nhiều instance thì chạy song song<br>• Độ trễ phát hiện hết hạn tối đa bằng chu kỳ quét<br>• Khối lượng lớn thì không phải giải pháp lâu dài |
| **Rủi ro** | **Trung bình**, mỗi rủi ro đã có biện pháp. Rủi ro lớn nhất (nhiều instance) được chấp nhận vì demo chạy một instance |
| **Phù hợp khi** | Monolith một tiến trình, ràng buộc dependency chặt, cần xử lý theo thời gian với khối lượng nhỏ |

### Phương án C — Hướng sự kiện với message broker và worker riêng

| Nội dung | Mô tả |
| --- | --- |
| **Ý tưởng** | `appointmentService` phát sự kiện vào Redis/BullMQ; một worker riêng xử lý, hết hạn dùng delayed job |
| **Mới** | 4 bảng · Redis · BullMQ · producer · worker · service thứ ba trong compose · cấu hình retry và dead-letter |
| **Tái sử dụng** | Các repository (worker phải import lại toàn bộ tầng dưới) |
| **Tích hợp** | Bất đồng bộ qua hàng đợi; hai tiến trình chia sẻ DB và Redis |
| **Đồng thời** | Hàng đợi tuần tự hóa theo khóa; vẫn cần khóa DB cho luồng chấp nhận (đến từ HTTP) |
| **Nhất quán** | Eventual, khe hở lớn hơn B. Có bài toán **dual write**: commit DB xong nhưng publish lỗi ⇒ mất sự kiện; muốn chắc phải thêm transactional outbox |
| **Phục hồi lỗi** | Tốt nhất: retry, backoff, dead-letter, delayed job chính xác đến giây |
| **Ưu điểm** | Hết hạn chính xác; scale ngang; lỗi worker không ảnh hưởng API; "chuẩn" ở quy mô lớn |
| **Hạn chế** | • **Vi phạm K-08** (thêm ≥ 2 dependency)<br>• **Vi phạm K-09** (compose thêm Redis và worker)<br>• Bài toán dual write cần outbox<br>• CI phải dựng thêm Redis<br>• Debug khó hơn<br>• Với 12 slot và 5 bệnh nhân mẫu, hạ tầng này là thừa |
| **Rủi ro** | **Cao trong bối cảnh này** — rủi ro về **độ phù hợp**, không phải kỹ thuật |
| **Phù hợp khi** | Đã có message broker; nhiều instance API; khối lượng lớn; cần hết hạn chính xác đến giây |

### So sánh nhanh

| Khía cạnh | A | **B** | C |
| --- | :---: | :---: | :---: |
| Dependency mới | 0 | **0** | ≥ 2 |
| Xử lý hết hạn (US-06 Must) | ❌ | **✅** | ✅ |
| Lỗi làm hỏng luồng hủy lịch | Có | **Không** | Không |
| Số tiến trình cần chạy | 1 | **1** | 3 |
| `docker compose up` một lệnh | ✅ | **✅** | ⚠️ nặng |
| Độ trễ phát hiện hết hạn | — | **≤ 30 giây** | ≤ 1 giây |
| Scale ngang | ❌ | ⚠️ cần khóa phối hợp | ✅ |
| Rollback | Dễ | **Dễ** | Khó |
| Quy tắc bị phân tán | Nhiều | **0** | 0 |

**Điều kiện áp dụng:** A nếu bỏ US-06. **B** nếu K-08, K-09 là bất di bất dịch và độ trễ hết hạn ≤ 30 giây chấp nhận được. C nếu sắp có nhiều instance, hoặc cần hết hạn chính xác đến giây, hoặc đã có sẵn Redis.

---

## 2. Trade-off matrix

Thang 1 (thấp) – 5 (cao). Trọng số do AI đề xuất theo ràng buộc dự án, tổng = 100 — **Tech Lead có thể đổi**.

| Tiêu chí | Trọng số | A | B ⭐ | C |
| --- | ---: | :---: | :---: | :---: |
| Phù hợp kiến trúc hiện tại | 15 | 3 | **5** | 2 |
| Độ đơn giản triển khai | 12 | 5 | **4** | 1 |
| Khả năng bảo trì | 12 | 2 | **4** | 4 |
| Khả năng mở rộng | 8 | 1 | 3 | **5** |
| Độ tin cậy | 15 | 1 | **4** | 5 |
| Bảo mật và quyền riêng tư | 8 | 3 | **4** | 3 |
| Chi phí vận hành | 10 | 5 | **5** | 2 |
| Khả năng rollback | 8 | 4 | **5** | 2 |
| Phù hợp năng lực đội ngũ | 7 | 5 | **5** | 2 |
| Thời gian triển khai | 5 | 5 | **4** | 1 |
| **Tổng có trọng số** | **100** | **318** | **⭐ 432** | **284** |

**Kiểm tra độ nhạy:** nếu bỏ hết trọng số (mọi tiêu chí bằng nhau, mỗi tiêu chí 10) thì A = 340, **B = 430**, C = 270. B vẫn đứng đầu — kết luận **không phụ thuộc vào cách đặt trọng số**.

**Ô quyết định kết quả**

| Ô | Điểm | Lý do |
| --- | :---: | --- |
| A — Độ tin cậy | 1 | Không xử lý được hết hạn; US-06 là **Must** ⇒ không đáp ứng yêu cầu bắt buộc. Riêng điều này đủ loại A |
| A — Khả năng bảo trì | 2 | Luật chọn ứng viên nằm lẫn trong `appointmentService`, chỗ nhạy cảm nhất hệ thống |
| B — Phù hợp kiến trúc | 5 | Thêm một service đúng tầng, dùng lại nguyên các khuôn có sẵn |
| B — Độ tin cậy | 4 | Không đạt 5 vì tác vụ quét gắn với tiến trình và có độ trễ; nhưng trạng thái ở DB nên khởi động lại không mất dữ liệu |
| C — Phù hợp kiến trúc | 2 | Phá K-08 và K-09 — hai ràng buộc cứng |
| C — Khả năng mở rộng | 5 | Thực sự tốt nhất — nhưng trọng số chỉ 8 vì hệ thống hiện có 12 slot và 5 bệnh nhân mẫu |

---

## 3. Đề xuất quyết định

| Nội dung | Đề xuất |
| --- | --- |
| Phương án được AI xếp cao nhất | **B** (432 điểm) |
| Phương án đề xuất chọn | **B** |
| Lý do | Đáp ứng mọi yêu cầu Must; không phá ràng buộc cứng nào; tái sử dụng các khuôn đồng thời đã được kiểm chứng ở K-04 |
| Trade-off chấp nhận | Không scale ngang nếu không thêm khóa phối hợp; hết hạn có độ trễ tới chu kỳ quét; tác vụ quét gắn vòng đời tiến trình |
| Rủi ro còn lại | RISK-03, RISK-04, RISK-06 |
| Người quyết định | **Tech Lead** — `[CẦN XÁC NHẬN]` HR2-06 |

### Bốn ràng buộc kiến trúc của quyết định này

1. **Offer Engine được gọi SAU `commit`, NGOÀI giao dịch** của service gọi nó. Lỗi của nó không bao giờ rollback việc hủy lịch hay đổi trạng thái slot.
2. **Không có trạng thái trong bộ nhớ.** Mọi thứ tác vụ quét cần đều đọc từ DB mỗi lượt.
3. **Một chiều.** `appointmentService`/`slotService` → `offerEngineService`. Offer Engine **không** `require` ngược lên service nào — chỉ gọi xuống repository.
4. **Offer Engine không tự đổi `slots.status`**, trừ đúng một chỗ: trong giao dịch chấp nhận. Đây là hàng rào chống vòng lặp sự kiện.

### Vì sao không chọn A và C

- **Không A:** không đáp ứng US-06 (Must). Đây là vấn đề **phạm vi**: A giải một bài toán nhỏ hơn bài toán được giao.
- **Không C:** về kỹ thuật thuần túy, C là kiến trúc đúng cho bài toán "tác vụ có hạn, cần retry, cần scale". Nhưng nó **vi phạm hai ràng buộc cứng** và giải một bài toán quy mô mà hệ thống chưa có. Chọn C là tối ưu cho một tương lai giả định, đổi lấy chi phí thật ở hiện tại. Điều kiện chuyển sang C ghi ở §6 để không phải tranh luận lại từ đầu.

---

## 4. Phản biện độc lập (NT-11)

Đóng vai **Software Architecture Reviewer** phản biện chính đánh giá ở trên.

| # | Phản biện | Đánh giá | Đã xử lý ở |
| ---: | --- | --- | --- |
| 1 | Trọng số "Khả năng mở rộng" chỉ 8 là thấp — hệ thống y tế thật có thể có hàng nghìn bệnh nhân | **Có lý một phần.** Nhưng đây là hệ thống demo với ràng buộc rõ, không phải hệ thống bệnh viện thật. Kiểm tra độ nhạy (§2) cho thấy B vẫn thắng khi bỏ trọng số | §6 — điều kiện chuyển sang C |
| 2 | Đánh giá bỏ sót rủi ro **tác vụ quét chạy song song khi triển khai nhiều instance** | **Đúng, thiếu sót thật** | RISK-04; ghi giới hạn "một instance" (A-03) |
| 3 | Độ trễ quét 30 giây có thể không chấp nhận được với slot sát giờ | **Đúng.** Nếu slot bắt đầu sau 35 phút và đề xuất hết hạn sau 15 phút, thêm 30 giây là ~1,4% cửa sổ — chấp nhận được, nhưng phải nói bằng con số | S2 (≤ 60 giây), AC-06.1; chu kỳ quét đặt ở cấu hình |
| 4 | Phương án B không nói gì về việc **slot bị đặt chủ động trong lúc đề xuất đang treo** | **Đúng, lỗ hổng nghiệp vụ thật**, không phải chi tiết cài đặt | BR-10; thêm điểm móc ở `bookAppointment()`; AC-04.2 |

Hai vấn đề (#2, #4) thuộc loại "ca biên của trạng thái đồng thời" — loại lỗi tốn thời gian nhất nếu lọt xuống WB-3.

---

## 5. Hệ quả

**Tích cực**
- `package.json` và `docker-compose.yml` **không đổi**.
- CI hiện tại (lint → migrate → seed → test) chạy được ngay, không thêm dịch vụ.
- Rollback = xóa 4 bảng mới + gỡ lời gọi ở 4 điểm móc; không đụng dữ liệu cũ.
- Mọi quy tắc về đề xuất nằm trong đúng một file (`offerEngineService.js`).

**Tiêu cực (chấp nhận có ý thức)**

| Hệ quả | Mức chấp nhận | Ghi ở |
| --- | --- | --- |
| Tác vụ quét gắn với tiến trình; nhiều instance chạy song song | Chấp nhận ở phiên bản 1 | RISK-04 |
| Độ trễ phát hiện hết hạn tới 30 giây | Chấp nhận, đã cụ thể hóa thành S2 | AC-06.1 |
| Tác vụ quét chạy mãi trong test nếu không tắt | Phải có `stop()`; không tự chạy khi test | TASK-07 |
| Không phải giải pháp cho khối lượng lớn | Chấp nhận; điều kiện chuyển ở §6 | — |

**Ràng buộc mới đặt lên WB-3**
1. Không thêm dependency — vi phạm là reject ở review.
2. Lời gọi Offer Engine sau `commit`, trong `try/catch` nuốt lỗi.
3. Mọi phép chuyển trạng thái đề xuất dùng conditional UPDATE, không đọc-rồi-ghi.
4. Hai partial unique index (BR-04, BR-05) là **bắt buộc**.

---

## 6. Khi nào xem lại quyết định

Chuyển sang C khi **một** trong các điều kiện xuất hiện:
- MedBook chạy nhiều hơn một instance API.
- Bệnh viện yêu cầu độ chính xác hết hạn dưới 5 giây.
- Số đăng ký chờ đang hoạt động vượt ~10.000.
- Cần gửi thông báo ra ngoài (SMS/email) với retry và dead-letter.

Bước trung gian rẻ hơn nhiều: giữ nguyên kiến trúc, chỉ thêm khóa phối hợp (`pg_advisory_lock`) cho tác vụ quét.

## 7. Quan hệ với ADR hiện có

| ADR | Quan hệ |
| --- | --- |
| 001 Không ORM | **Tuân thủ** — mọi truy vấn mới là SQL thuần |
| 002 Auth demo | **Bù đắp** — BR-14 kiểm quyền sở hữu ở service |
| 003 `slots.status` denormalized | **Tuân thủ và củng cố** — Offer Engine không đổi `slots.status` ngoài giao dịch chấp nhận |
| 004 Giao dịch + khóa chống đặt trùng | **Sao chép nguyên khuôn** cho luồng chấp nhận và hai ràng buộc mới |
| 005 Migration không phiên bản | **Tuân thủ** — 4 bảng mới, `if not exists` |
| 006 Kiến trúc phân lớp | **Tuân thủ** |
| 007 Frontend JS thuần | **Tuân thủ** |
