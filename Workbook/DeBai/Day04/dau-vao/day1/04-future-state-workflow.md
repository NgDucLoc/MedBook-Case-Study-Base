# WB-1 · 04 — Future-State Workflow

> **Mã:** WB1-04 · **Phiên bản:** v0.1 · **Ngày:** 2026-09-24
> **Trạng thái:** Chờ duyệt · **Người duyệt:** [chờ Human]
> **Nguồn:** `01-artifact-map.md` (DR-xx), `02-ai-opportunity-matrix.md` (OPP-xx), `03-responsibility-matrix.md` (RSP-xx, CP-xx) · **Đáp ứng:** Activity 4

Mục tiêu: quy trình phát triển tính năng waiting list có Human–AI collaboration, chỉ rõ **điểm bàn giao** giữa các phase và **thông tin nào phải đi qua** mỗi điểm.

File này là **xương sống của cả 5 WB**: mỗi WB sau đảm nhận một đoạn của quy trình này (§5).

---

## 1. Ý tưởng thay đổi

Trong quy trình cũ, thông tin đi giữa các phase bằng lời văn và nằm trong ngữ cảnh riêng của từng công cụ AI. Quy trình mới đổi **một điều**: giữa các phase, thông tin đi qua **một bộ tài liệu chung nằm trong repo**, có mã định danh, đã qua cổng duyệt của Human. Mọi công cụ AI ở mọi phase đọc từ bộ này và ghi lại vào bộ này.

```
                        ┌────────────────────────────────────────────┐
                        │   BỘ TÀI LIỆU CHUNG (trong repo, có mã)    │
                        │   BR · US · AC · ADR · CMP · API · ENT ·   │
                        │   RISK · TASK · nhật ký quyết định         │
                        └───▲────────▲────────▲────────▲────────▲────┘
                            │ đọc/ghi│        │        │        │
   PH-1 Requirements        │        │        │        │        │
   BA + AI(Collaborator)────┘        │        │        │        │
     WF-01 → WF-05                   │        │        │        │
        │ CP-01…04                   │        │        │        │
        ▼  HO-01                     │        │        │        │
   PH-2 Design                       │        │        │        │
   Tech Lead + AI(Collaborator)──────┘        │        │        │
     WF-06 → WF-08                            │        │        │
        │ CP-05…07                            │        │        │
        ▼  HO-02                              │        │        │
   PH-3 Development                           │        │        │
   Dev + AI(Copilot)──────────────────────────┘        │        │
     WF-09  (từng task, ngữ cảnh hẹp)                  │        │
        │ CP-08                                        │        │
        ▼  HO-03                                       │        │
   PH-4 Test                                           │        │
   QA + AI(Copilot)────────────────────────────────────┘        │
     WF-10                                                      │
        │ CP-09                                                 │
        ▼  HO-04                                                │
   PH-5 Ops                                                     │
   Tech Lead/Dev + AI(Assistant)────────────────────────────────┘
     WF-11 → WF-12 ──► HO-05 ──► quay về PH-1 (WF-01/03)
        CP-10, CP-11
```

**Ba điểm khác biệt so với hiện trạng:**

1. **Nơi chung.** Một bộ tài liệu, mọi AI cùng đọc. Không còn "hội thoại riêng" giữ quyết định (sửa DR-03).
2. **Mã định danh.** Mỗi quy tắc, story, AC, thành phần, task đều có mã; mỗi thứ ở phase sau trỏ về phase trước (sửa DR-01, DR-02, DR-05).
3. **Cổng duyệt và đường quay lại.** Sản phẩm của AI chỉ có hiệu lực sau khi Human duyệt; phát hiện sai thì sửa tài liệu **trước**, rồi mới sửa code (sửa DR-04); phản hồi vận hành quay về backlog (sửa DR-06).

---

## 2. Các bước của quy trình

| ID | Phase | Bước | AI (vai trò) | Human | Đầu vào | Đầu ra (mã) | Cổng |
| --- | --- | --- | :---: | --- | --- | --- | :---: |
| **WF-01** | PH-1 | Dựng ngữ cảnh nghiệp vụ: vấn đề, mục tiêu, phạm vi, ràng buộc, tiêu chí thành công | Assistant (tóm tắt) | BA duyệt | IN-xx, hệ thống hiện tại | Business Problem | CP-01 |
| **WF-02** | PH-1 | Làm rõ yêu cầu: liệt kê khoảng trống, hỏi stakeholder, ghi câu trả lời | Collaborator (hỏi) | BA, stakeholder trả lời | Business Problem | Q-xx | CP-02 |
| **WF-03** | PH-1 | Chốt quy tắc nghiệp vụ, mỗi quy tắc có nguồn quyết định | Assistant (ghi) | **Human quyết** | Q-xx đã trả lời | BR-xx | CP-02 |
| **WF-04** | PH-1 | Soạn story và AC Given–When–Then, mỗi AC trỏ BR | Copilot | BA, QA duyệt | BR-xx | US-xx, AC-xx.y | CP-03 |
| **WF-05** | PH-1 | Rà soát nhất quán; xếp ưu tiên MoSCoW | Collaborator | BA, Tech Lead quyết | US, AC, BR | R-xx, backlog ưu tiên | CP-04 |
| **WF-06** | PH-2 | Phân tích tác động; đề xuất ≥ 2 phương án; phản biện; **chọn** | Assistant → Collaborator | **Tech Lead quyết** | Yêu cầu đã duyệt, ADR hiện có | ADR mới | CP-05 |
| **WF-07** | PH-2 | Thiết kế chi tiết: thành phần, API, dữ liệu, trạng thái; rủi ro; bảng truy vết | Copilot | Tech Lead, BA duyệt | ADR, BR, AC | CMP, API, ENT, RISK, truy vết | CP-06 |
| **WF-08** | PH-2→3 | Chia task; định nghĩa "xong"; chiến lược test | Copilot | Tech Lead, Dev duyệt | Thiết kế, truy vết | TASK-xx, DoD | CP-07 |
| **WF-09** | PH-3 | Hiện thực **từng task** với ngữ cảnh hẹp (chỉ nạp file liên quan); ghi coding-log | Copilot | Dev sở hữu; Dev khác review | 1 TASK, các BR/AC/CMP liên quan | Code, PR, coding-log | CP-08 |
| **WF-10** | PH-4 | Sinh test từ AC; chạy; **kiểm tra lệch** tài liệu ↔ code | Copilot (sinh) · Assistant (chạy) | QA, BA kết luận | AC, coding-log, code | Test trỏ AC, báo cáo lệch | CP-09 |
| **WF-11** | PH-5 | Cập nhật runbook, cấu hình, CI; phát hành | Assistant | Tech Lead, Dev | Coding-log, báo cáo test | Runbook, release | CP-10 |
| **WF-12** | PH-5→1 | Đo số đo; thu phản hồi; đề xuất mục backlog | Collaborator | BA, stakeholder | Số đo, nhật ký sự kiện | Mục backlog mới trỏ BR/US | CP-11 |

**Đường quay lại (bắt buộc):** khi ở WF-09 hoặc WF-10 phát hiện tài liệu sai hoặc thiếu, **dừng**, mở lại WF-03/WF-04 (RSP-14), sửa tài liệu qua cổng CP-02/CP-03, rồi mới sửa code (NT-05).

---

## 3. Điểm bàn giao (handoff)

Định dạng bàn giao chung: **markdown có mã, nằm trong repo**, kèm trạng thái `Đã duyệt`. Bàn giao bằng lời hoặc bằng hội thoại AI riêng **không được tính**.

| ID | Từ → Đến | Thông tin bắt buộc truyền | Điều kiện nhận (không đạt → **dừng**, không đi tiếp) | Sửa điểm đứt gãy |
| --- | --- | --- | --- | --- |
| **HO-01** | PH-1 → PH-2 | Business Problem · Q-xx (kể cả câu `Open`) · **BR-xx** · US-xx · AC-xx.y · R-xx · ưu tiên | Mọi BR có nguồn quyết định; mọi AC trỏ BR; câu `Open` có chủ và không chặn; CP-01 → CP-04 qua | DR-01, DR-02 |
| **HO-02** | PH-2 → PH-3 | ADR · CMP/API/ENT/state · RISK · bảng truy vết BR↔CMP↔AC · TASK-xx · DoD · **ràng buộc bất biến** | Mỗi BR có đúng một thành phần; mỗi TASK trỏ BR/AC; CP-05 → CP-07 qua | DR-03 |
| **HO-03** | PH-3 → PH-4 | Code · PR trỏ TASK · **coding-log** (task → file đã đổi → BR đã hiện thực → giả định còn lại) | Lint và test cũ xanh; coding-log đủ; CP-08 qua | DR-05 |
| **HO-04** | PH-4 → PH-5 | Bảng AC ↔ test ↔ kết quả · danh sách lệch tài liệu–code · DoD đã tick | Mọi AC có test; lệch đã xử lý hoặc ghi nhận; CP-09 qua | DR-04 |
| **HO-05** | PH-5 → PH-1 | Số đo · sự cố · phản hồi, **kèm mã BR/US bị ảnh hưởng** | Có mã trỏ về yêu cầu; CP-11 qua | DR-06 |

---

## 4. So sánh với quy trình cũ

| Khía cạnh | Cũ | Mới | Cải thiện | Rủi ro mới cần chú ý |
| --- | --- | --- | --- | --- |
| Nguồn ngữ cảnh | Mỗi AI một ngữ cảnh riêng | Một bộ tài liệu chung, có mã | Mọi AI cùng đọc một nguồn | **Tài liệu lỗi thời** nếu không cập nhật (giảm bằng NT-05) |
| Dev hỏi lại BA | 3–4 lần mỗi story | Quy tắc đã có mã, story trỏ tới | Giảm khoảng trống thông tin | Story vẫn có thể thiếu quy tắc nếu WF-02 làm sơ sài |
| Test vs business logic | QA tự suy từ lời văn | Test sinh từ AC, trỏ AC | Chứng minh được yêu cầu | AC viết kém thì test kém — CP-03 phải chặt |
| Review | Đọc code để suy ngược | Đối chiếu code với BR/AC và coding-log | Thời gian review giảm (giả thuyết — WB-5 phải đo) | Reviewer tin coding-log mà không đọc code |
| Quyết định thiết kế | Hội thoại riêng | ADR trong repo | Dev và AI thấy ràng buộc | Tech Lead có thể thành nút cổ chai (CP-05, 06, 07) |
| Phản hồi vận hành | Không có kênh | HO-05 quay về backlog | Đóng được vòng | Cần nhật ký sự kiện và mốc "trước" |
| Cổng duyệt | Rải rác, không ghi | 11 cổng có tiêu chí | Ai duyệt gì đã rõ | **Cổng thành thủ tục** (duyệt cho có) — cần đo tỷ lệ cổng tìm ra lỗi thật |
| Chi phí tài liệu | Thấp | Cao hơn ở PH-1, PH-2 | Chi phí dịch chuyển về sớm, nơi sửa rẻ nhất | **Quá tay**: dự án nhỏ có thể không cần đủ 11 cổng — OQ-04 |

---

## 5. Quy trình này được dùng thế nào ở các WB sau

| WB | Đoạn của quy trình | Đầu vào lấy từ WB trước | Đầu ra |
| --- | --- | --- | --- |
| **WB-1** | Thiết kế quy trình (file này) | Đề bài, hệ thống hiện tại | Quy trình, cổng, luật chơi |
| **WB-2** | WF-01 → WF-08 | HO-xx, NT-xx, CP-xx của WB-1 | Bộ yêu cầu và thiết kế (BR, US, AC, ADR, CMP, API, ENT, RISK, TASK) |
| **WB-3** | WF-09, WF-10 | Bộ tài liệu WB-2 (HO-02) | Code, test, báo cáo review, coding-log |
| **WB-4** | Rà soát các cổng đã chạy ở WB-2, WB-3 | Nhật ký quyết định, coding-log, báo cáo review | Phân tích lỗi AI (FAIL-xx), quy trình review, checklist quản trị (GOV-xx) |
| **WB-5** | WF-11, WF-12 và **chốt** WB-1 | Toàn bộ, kèm bằng chứng | Ma trận v2 có đối chiếu v1, workflow kiểm chứng, số đo (MET-xx) |

**Chỉ báo WB-5 sẽ đo** (đề xuất): số lần Dev hỏi lại BA cho mỗi story · tỷ lệ AC có test · thời gian review mỗi PR · số lệch tài liệu–code phát hiện ở CP-09 · tỷ lệ cổng duyệt tìm ra lỗi thật.

---

## 6. Đối chiếu checklist Day 1

| Mục checklist | Trạng thái | Ở đâu |
| --- | :---: | --- |
| Có sơ đồ và giải thích điểm handoff giữa các phase | ✅ | §1, §3 |
| Chỉ rõ AI tham gia bước nào, vai trò gì | ✅ | §2 |
| So sánh workflow cũ/mới, nêu rủi ro | ✅ | §4 |
| Giải thích vì sao AI giúp nhanh hơn nhưng chưa chắc SDLC hiệu quả hơn | ✅ | `01-artifact-map.md` §5 |
