# Bước 3 — Root Cause Classification

Mỗi finding ở Bước 1 và 2 gắn **đúng 1** nhãn nguyên nhân và 1 mức độ.

| Nhãn | Khi nào dùng |
| --- | --- |
| Spec sai/thiếu | Spec (Day 2) **có nói** nhưng mơ hồ, mâu thuẫn hoặc đã lỗi thời khi Day 3 dùng tới |
| AI tự bịa khi thiếu ngữ cảnh | Spec **không nói gì**, AI vẫn quyết định nghiệp vụ/kỹ thuật và không đánh dấu "Cần xác nhận" |
| Human review bỏ sót | Có đủ thông tin để phát hiện, nhưng không ai đối chiếu lại trước khi merge |
| Process không có checkpoint | Không phải lỗi một người — quy trình không bắt buộc bước xác nhận ở đúng chỗ |
| Kỹ thuật/concurrency | Lỗi logic, transaction, race condition — độc lập với việc có dùng AI hay không |

Mức độ: **Critical / Major / Minor** (nhất quán với `Day03/activity1-development/code-review.md`).

| Finding | Nhãn nguyên nhân | Mức độ | Vì sao chọn nhãn này (và không phải nhãn khác) |
| --- | --- | --- | --- |
| | | | |

## Phân bố nguyên nhân

| Nhãn | Số finding | Tỷ lệ |
| --- | :---: | :---: |
| Spec sai/thiếu | | |
| AI tự bịa khi thiếu ngữ cảnh | | |
| Human review bỏ sót | | |
| Process không có checkpoint | | |
| Kỹ thuật/concurrency | | |

Nhóm nguyên nhân chiếm đa số: …  (đầu vào trực tiếp cho Bước 4). So với case mẫu (nghiêng về "Spec sai/thiếu" và "Process không có checkpoint"): …

## Human Review checklist

- [ ] "AI tự bịa" và "Spec sai/thiếu" có bị nhầm ở finding nào không?
- [ ] Mức độ có nhất quán với `Day03/activity1-development/code-review.md`?
- [ ] Không tự xếp finding vào nhóm nhẹ hơn "cho gọn"?
