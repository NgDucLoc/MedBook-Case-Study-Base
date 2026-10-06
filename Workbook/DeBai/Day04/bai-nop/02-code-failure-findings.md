# Bước 2 — Code Failure Findings

Test tự viết pass **không** chứng minh code đúng — nó chỉ chứng minh code đúng với điều mà AI/nhóm đã hiểu khi viết test.

Đọc trực tiếp source và test suite hiện có, đối chiếu với bản Business Rules FROZEN (`../../../../doc/specs/02-frozen-business-rules.md`, BR-01 → BR-08). Trạng thái: **Có test** / **Gián tiếp** / **Không có test**. Phần rule không có test nào chạm tới là "gap", không phải "covered".

## Bảng BR → code → test

| Business Rule | File hiện thực | Test kiểm chứng (tên test thật) | Trạng thái |
| --- | --- | --- | --- |
| BR-01 | | | |
| BR-02 | | | |
| BR-03 | | | |
| BR-04 | | | |
| BR-05 | | | |
| BR-06 | | | |
| BR-07 | | | |
| BR-08 | | | |

## Acceptance Criteria không có test nào chạm tới

Danh sách AC (41) nằm ở `../../../../doc/specs/03-user-stories-acceptance-criteria.md`.

| AC | Thuộc BR | Ghi chú |
| --- | --- | --- |
| | | |

## Dead code (đã tự grep xác nhận)

| Hàm / file | Lệnh grep đã chạy | Kết quả |
| --- | --- | --- |
| | | |

## Code "thiếu ngữ cảnh"

Comment giải thích *ý nghĩa* nhưng không giải thích *lý do chọn cách này* thay vì quy ước còn lại của repo.

| File:dòng | Vì sao thiếu ngữ cảnh |
| --- | --- |
| | |

## Human Review checklist

- [ ] Mỗi rule "Có test" có tên test thật, kiểm được bằng grep?
- [ ] Mỗi finding "dead code" đã tự grep lại, không chỉ tin AI?
- [ ] Có finding nào AI đánh giá "an toàn" mà không kèm bằng chứng không? Nếu có, không chấp nhận kết luận đó.
