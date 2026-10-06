# 04 · 01 — Nhật ký quyết định

> **Mã:** WB2-04-01 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Nguồn:** toàn bộ WB-2 · **Cổng:** mọi cổng CP-01 → CP-07

Nhật ký ghi **ai quyết định gì, vì sao**. Nếu một quyết định không nằm ở đây, nó chưa có người chịu trách nhiệm (NT-07).

Toàn bộ mục dưới đây là **đề xuất do AI soạn**; cột "Quyết định của Human" để trống (`☐`) cho tới khi bạn duyệt. AI không tự điền.

---

## 1. Quyết định cần duyệt — theo từng cổng

| ID | Cổng | Nội dung cần Human duyệt | Người nên duyệt | Điểm cần cân nhắc | Quyết định |
| --- | :---: | --- | --- | --- | :---: |
| **HR2-01** | CP-01 | Business Problem Canvas và phạm vi In / Out. **Đặc biệt:** slot **mới tạo** không kích hoạt đề xuất — chỉ slot bị trống đột ngột (BR-01) | BA + stakeholder | Nếu bệnh viện muốn slot mới cũng kích hoạt, BR-01 và AC-02.3 đổi | ☐ |
| **HR2-02** | CP-02 | 16 câu làm rõ: 1 `Case`, 12 `Đề xuất`, 2 `Open`, 1 hỗn hợp. **Ba giá trị quan trọng nhất cần xác nhận:** hạn 15 phút (Q-04), tuần tự (Q-05), thời gian tối thiểu 30 phút (Q-11). Xác nhận cho 3 câu `Open` được để trống ở phiên bản 1 | BA + Medical Staff + Ban giám đốc | Đổi giá trị ⇒ sửa BR trước (NT-05) | ☐ |
| **HR2-03** | CP-03 | 11 story và 43 AC. **Điểm cần cân nhắc:** giữ US-02 và US-06 với actor *System* dù không đúng dạng story chuẩn | BA + QA | Ép về góc nhìn người dùng thì hành vi hết hạn dễ bị chôn trong US-03 và bị bỏ sót khi viết test (DR-02 của WB-1) | ☐ |
| **HR2-04** | CP-03 | Số đo trong AC: ≤ 5 giây (S1), ≤ 60 giây (S2) `[ĐỀ XUẤT]` | BA + QA + Tech Lead | Đây là ngưỡng do AI đặt để AC kiểm thử được; cần bệnh viện xác nhận | ☐ |
| **HR2-05** | CP-05 | Ma trận tác động. **Điểm cần cân nhắc:** lời gọi Offer Engine **sau `commit`** — nâng từ khuyến nghị lên **ràng buộc kiến trúc** | Tech Lead | Gọi trong giao dịch sẽ làm lỗi Offer Engine rollback cả việc hủy lịch (RISK-03) | ☐ |
| **HR2-06** | CP-05 | **Chọn phương án B** (432 điểm; A = 318, C = 284) | **Tech Lead** | B vẫn đứng đầu khi bỏ hết trọng số (430 so với 340 và 270). Điều kiện chuyển sang C ở ADR-008 §6 | ☐ |
| **HR2-07** | CP-06 | 11 thành phần. **Điểm cần cân nhắc:** giữ CMP-03 là **một** service (12/16 BR) thay vì tách ba | Tech Lead | Tách ba ⇒ ba file coupling chặt và một vòng phụ thuộc. Bù bằng: mỗi hàm public ≤ 40 dòng | ☐ |
| **HR2-08** | CP-06 | 4 bảng mới. **Điểm cần cân nhắc:** đề xuất là **thực thể độc lập**, `appointments` không thêm cột | Tech Lead | Thêm trạng thái vào `appointments` sẽ làm hỏng ràng buộc duy nhất hiện có | ☐ |
| **HR2-09** | CP-06 | 12 rủi ro. Đề xuất chấp nhận RISK-01, 04, 06 (với điều kiện ghi vào bàn giao); chuyển RISK-05 cho bệnh viện | Tech Lead + BA | RISK-06 (không có kênh báo ngoài app) có thể làm tính năng không tạo giá trị thật | ☐ |
| **HR2-10** | CP-06 | Truy vết 16/16 BR có thành phần và AC. **Điểm cần cân nhắc:** CMP-08 không gắn trực tiếp với BR — giữ hay cắt | Tech Lead + BA | Giữ: điểm mở rộng cho SMS. Cắt: hệ thống vẫn đúng | ☐ |
| **HR2-11** | CP-04 | Ưu tiên MoSCoW. **Ba điểm ⚠️:** US-06 → Must, US-05 → Should, US-09 → Won't. Có giữ US-05 trong MVP không | BA + Tech Lead + Product Owner | Xem `01-yeu-cau/07-uu-tien.md` §1 | ☐ |
| **HR2-12** | CP-04 | **R-17, R-18:** (17) đề bài mô tả "đổi lịch", "thông báo lịch khám", Admin mà hệ thống thật không có — đề xuất lấy **hệ thống thật** làm chuẩn; (18) múi giờ dữ liệu chưa quy ước, ảnh hưởng BR-06 và BR-16 | BA + Tech Lead | Đây là phát hiện mới; ảnh hưởng nếu ai đó kỳ vọng tái sử dụng chức năng không tồn tại | ☐ |

---

## 2. Các chỗ AI đã suy luận và không có căn cứ trực tiếp trong đề bài

Danh sách này để Human **biết đâu là giả định** khi duyệt (NT-03).

| # | Giả định của AI | Ở đâu | Cách kiểm |
| ---: | --- | --- | --- |
| 1 | Tuần tự thay vì song song; mỗi bệnh nhân một đề xuất | Q-05, Q-06 → BR-04, BR-05 | Hỏi Ban giám đốc |
| 2 | Hạn 15 phút, tối thiểu 30 phút, quét mỗi 30 giây | Q-04, Q-11; `05-api` §7 | Hỏi Medical Staff và Tech Lead |
| 3 | Đăng ký chờ theo bác sĩ **hoặc** chuyên khoa; có khoảng ngày mong muốn; không mời lại người đã từ chối cùng slot | Q-03; BR-03 (e), (f) | (e), (f) do AI bổ sung — cần Medical Staff xác nhận |
| 4 | Ba mức ưu tiên `urgent` / `high` / `normal`, staff gán tay | A-02, BR-02 | Hỏi Medical Staff |
| 5 | Nội dung đề xuất giới hạn ở 8 trường; không hiện vị trí hàng đợi | Q-10, Q-14 → BR-11, BR-12 | Hỏi Ban giám đốc, IT |
| 6 | Chạy một instance; giữ nhật ký vô thời hạn | A-03, Q-15 | Hỏi IT |
| 7 | Chọn phương án B | ADR-008 | Tech Lead |

---

## 3. Câu hỏi còn mở

| ID | Câu hỏi | Chặn WB-3? | Trạng thái |
| --- | --- | :---: | --- |
| Q-07 | Tạm dừng đăng ký sau N lần từ chối? | Không | **Open** — chờ Ban giám đốc + Medical Staff |
| Q-09 (phần dời lịch) | Có đề xuất dời lịch thay vì loại ứng viên? | Không | **Open** — chờ Medical Staff |
| Q-13 | Bệnh nhân tự đăng ký chờ ở phiên bản sau? | Không | **Open** — chờ Ban giám đốc |
| R-05 | Lọc theo ngày có đủ, hay cần lọc theo giờ trong ngày? | Không | **Mở** — chờ bệnh viện |
| R-13 | Có cần quy trình duyệt việc gán mức `urgent`? | Không | **Mở** — chờ bệnh viện |
| **R-17** | Lấy hệ thống thật làm chuẩn hiện trạng? | **Nên quyết trước WB-3** | **Mở** — chờ Human |
| **R-18** | Múi giờ chuẩn của dữ liệu slot và của phép tính hạn / thời gian tối thiểu | **Nên quyết trước WB-3** (BR-06, BR-16 phụ thuộc) | **Mở** — chờ Human + Tech Lead |

---

## 4. Ba câu trả lời cho phần trình bày (WB-2) — đề xuất, chờ Human

**AI hỗ trợ tốt nhất ở bước nào? Vì sao?**
Đề xuất: **làm rõ yêu cầu** (`01-yeu-cau/02`) và **phân tích tác động** (`02-thiet-ke/01`). Cả hai là việc **duyệt rộng và có hệ thống** — liệt kê mọi khía cạnh cần hỏi, đọc mọi file để tìm chỗ bị ảnh hưởng. AI không mệt và đọc được cả ràng buộc nằm trong ADR mà người mới không thấy.

**Bước nào Human phải quyết?**
Ba loại: (1) **đánh đổi giá trị nghiệp vụ** — tuần tự hay song song, cắt gì khi hết giờ; (2) **ranh giới kiến trúc** — tách hay gộp thành phần, chấp nhận rủi ro nào; (3) **điều AI không đọc được từ tài liệu** — hành vi thực của bệnh nhân, ràng buộc chính trị và quy trình của bệnh viện.

**Nếu giao bộ tài liệu này cho AI Developer, đã đủ ngữ cảnh chưa?**
Đủ, với ba điều kiện: (a) AI đọc `HUONG-DAN-DOC.md` trước và **chỉ nạp** file liên quan tới task; (b) mọi quy tắc tham chiếu bằng mã, không diễn đạt lại; (c) các `[CẦN XÁC NHẬN]` giữ nguyên trạng thái — nếu AI tự lấp, bộ tài liệu mất giá trị. **Thông tin cần bổ sung:** xác nhận các câu `Đề xuất` và quyết R-17 trước khi bắt đầu WB-3.

---

## 5. Bản đồ với các cổng của WB-1

| Cổng | Sản phẩm | Trạng thái |
| --- | --- | --- |
| CP-01 | `01-yeu-cau/01` | Chờ duyệt — HR2-01 |
| CP-02 | `01-yeu-cau/02`, `03` | Chờ duyệt — HR2-02 |
| CP-03 | `01-yeu-cau/04`, `05` | Chờ duyệt — HR2-03, HR2-04 |
| CP-04 | `01-yeu-cau/06`, `07` | Chờ duyệt — HR2-11, HR2-12 |
| CP-05 | `02-thiet-ke/01`, `02` | Chờ duyệt — HR2-05, HR2-06 |
| CP-06 | `02-thiet-ke/03` → `08` | Chờ duyệt — HR2-07 → HR2-10 |
| CP-07 | `03-trien-khai/01`, `02` | Chờ duyệt |

**Điều kiện bàn giao HO-02 (WB-2 → WB-3):** cả 7 cổng ở trạng thái `Đã duyệt`. Hiện là `Chờ duyệt` — WB-3 chưa được coi là có đầu vào đã duyệt (NT-07).
