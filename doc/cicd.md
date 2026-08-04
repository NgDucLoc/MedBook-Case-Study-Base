# MedBook - CI/CD demo

Tài liệu này tách riêng khỏi PROD/PRD để phần sản phẩm không bị dài. CI/CD ở đây phục vụ demo và kiểm tra chất lượng cơ bản, không phải pipeline production.

## 1. Mục tiêu

- Giúp người học thấy một luồng kiểm tra tự động trước khi merge/deploy.
- Chạy được với repo demo, không yêu cầu kết nối cloud bên ngoài.
- Ưu tiên lệnh đơn giản, dễ đọc, dễ sửa.
- Không phụ thuộc secret production, registry riêng, SMS/email hay hạ tầng bệnh viện thật.

## 2. Nguyên tắc

- Pipeline chỉ kiểm tra những thứ cần cho demo: install, lint, test, migration smoke, build/start smoke.
- Nếu chạy trên GitHub Actions thì dùng như ví dụ học tập; local vẫn là nguồn chính.
- Không deploy production thật.
- Không cần JWT secret thật; nếu app cần biến môi trường thì dùng giá trị demo.
- Database dùng PostgreSQL service trong CI hoặc Docker Compose local.

## 3. Lệnh local chuẩn

Các lệnh nên được mô tả trong `README.md` và giữ ổn định:

```bash
npm install
npm run lint
npm test
docker compose up --build
```

Nếu có migration/seed riêng:

```bash
npm run db:migrate
npm run db:seed
```

## 4. Quality gates

| Gate | Mục đích | Tiêu chí đạt |
| --- | --- | --- |
| Install | Kiểm tra dependency | `npm install` chạy thành công |
| Lint | Bắt lỗi style/cú pháp cơ bản | `npm run lint` không lỗi |
| Unit test | Kiểm tra nghiệp vụ chính | Test đặt/hủy/xác nhận và quản lý slot pass |
| Migration smoke | Kiểm tra database khởi tạo được | Migration + seed chạy thành công |
| App smoke | Kiểm tra app start được | API `/health` trả 200 |

## 5. Biến môi trường demo

Ví dụ `.env.example`:

```env
NODE_ENV=development
PORT=4300
DATABASE_URL=postgres://medbook:medbook@db:5432/medbook
DEMO_AUTH_ENABLED=true
```

Không đưa secret thật vào repo. Với demo auth, không cần `JWT_SECRET`.

## 6. GitHub Actions mẫu

File gợi ý: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: medbook
          POSTGRES_PASSWORD: medbook
          POSTGRES_DB: medbook_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U medbook -d medbook_test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      NODE_ENV: test
      PORT: 4300
      DATABASE_URL: postgres://medbook:medbook@localhost:5432/medbook_test
      DEMO_AUTH_ENABLED: "true"

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install
        run: npm ci

      - name: Lint
        run: npm run lint --if-present

      - name: Migrate and seed
        run: |
          npm run db:migrate --if-present
          npm run db:seed --if-present

      - name: Test
        run: npm test
```

## 7. Docker Compose smoke test

Nếu muốn thêm một job smoke đơn giản:

```bash
docker compose up --build -d
curl -f http://localhost:4300/health
docker compose down
```

Trong workshop, phần này có thể chạy local thay vì bắt học viên cấu hình CI thật.

## 8. Deploy demo

Deploy thật không nằm trong phạm vi hiện tại. Nếu cần trình diễn, dùng một trong hai cách:

- Local demo: `docker compose up --build`, mở `http://localhost:4300`.
- Recorded demo: quay màn hình luồng patient/staff, đặt lịch và quản lý slot.

Không cần cloud hosting cho mục tiêu bài học.

## 9. Checklist trước khi nộp bài

- `README.md` có hướng dẫn chạy local.
- `.env.example` không chứa secret thật.
- `docker compose up --build` chạy được.
- Test nghiệp vụ chính pass.
- UI thao tác được đủ 3 luồng: đặt lịch, xác nhận lịch, quản lý slot.
- Tài liệu ghi rõ auth là demo auth, không phải production auth.
