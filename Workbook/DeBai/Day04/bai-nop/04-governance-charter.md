# Bước 4 — Governance Charter

3–5 rule, xuất phát từ nhóm nguyên nhân chiếm đa số ở Bước 3. Mỗi rule phải trả lời được "làm sao biết nó đang được tuân thủ". Không chấp nhận "review kỹ hơn", "cẩn thận khi prompt".

| # | Rule (điều kiện đúng/sai, bắt buộc) | Chặn nguyên nhân nào (nhãn Bước 3) | Cách kiểm chứng (tự động: test/CI/lint, hoặc checklist có người ký) | Chủ sở hữu (BA / Dev / QA / Tech Lead) |
| --- | --- | --- | --- | --- |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

Ví dụ định dạng (không copy nguyên văn): *Trước khi bắt đầu coding task mới, AI phải trích dẫn lại tên file + ngày FROZEN của spec đang dùng làm input, và Human xác nhận đó là bản mới nhất trước khi cho sinh code.*

## Human Review checklist

- [ ] Mỗi rule trả lời được "đúng" hoặc "sai" khi kiểm tra?
- [ ] Mỗi rule có chủ sở hữu rõ ràng, không phải "cả nhóm"?
- [ ] Rule khớp nguyên nhân chiếm đa số ở Bước 3, không giải quyết vấn đề phụ trong khi bỏ qua vấn đề chính?
- [ ] Áp dụng ngược vào case thật (bản nháp 1-file lỗi thời), rule có thực sự chặn được sự cố?
