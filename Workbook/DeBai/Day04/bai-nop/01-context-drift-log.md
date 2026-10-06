# Bước 1 — SDLC Context-Drift Log

Audit **thông tin**, không phải audit code. Câu hỏi trung tâm: *người/AI ở phase sau có đọc đúng phiên bản mới nhất của artifact phase trước không?*

Mỗi dòng phải có bằng chứng cụ thể (file + dòng, hoặc trích artifact). Không có bằng chứng thì ghi "Cần xác nhận với nhóm".

| # | Giữa phase nào | Thông tin bị mất / hiểu sai | Hậu quả | Bằng chứng |
| --- | --- | --- | --- | --- |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## Human Review checklist

- [ ] Mỗi điểm đứt gãy có bằng chứng cụ thể, không phải suy đoán?
- [ ] AI có tự bịa ra một "ý định ban đầu" mà không ai xác nhận không?
- [ ] Đứt gãy nghiêm trọng nhất liên quan tới phiên bản spec (giống case thật) hay nguyên nhân khác (đổi người, đổi tool AI giữa chừng, thiếu checkpoint)?
- [ ] Nhóm có đồng ý với cách AI mô tả hậu quả, hay đang phóng đại/thu nhỏ?
