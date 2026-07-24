# FireCare — Hệ thống nội bộ cho công ty dịch vụ PCCC

Nền tảng tập trung, đa chi nhánh để số hoá & tự động hoá công tác chăm sóc khách hàng cho doanh nghiệp
dịch vụ phòng cháy chữa cháy (đổi bình, bảo trì, nạp sạc, kiểm định, lắp đặt, tập huấn).

## Tính năng cốt lõi

- **Chăm sóc khách hàng (trọng tâm)**: Customer 360, Kanban chăm sóc (pool/claim/SLA), nhật ký tương tác.
- **Tự động nhắc tái dịch vụ + hậu mãi**: mỗi phiếu dịch vụ có ngày đến hạn; hệ thống tự lọc khách sắp
  đến hạn và tạo việc chăm sóc — chống mất khách.
- **Quản lý khách hàng**: import CSV, lọc/tìm không dấu, phân loại theo dạng khách.
- **Phiếu dịch vụ đa dòng** + **chứng từ & in ấn** (báo giá, nghiệm thu, phiếu thu, giao nhận, tem…).
- **Calendar** đặt lịch, **registry điểm Google Maps** (tích hợp Google Business Profile ở giai đoạn sau).
- **AI** hỗ trợ (bóc tách text → phiếu, soạn tin nhắn chăm sóc). **Báo cáo doanh thu** cho admin/kế toán.

## Tech stack

- **Backend**: Fastify 5 + Drizzle ORM + PostgreSQL/PostGIS, xác thực **JWT tự host** (không Supabase).
- **Admin**: Vite + React 19 + shadcn/ui.
- **Monorepo**: pnpm workspaces + Turborepo, TypeScript strict.

## Chạy dev

```bash
docker compose up -d          # Postgres (PostGIS) :55432 + MinIO :9000/:9001
cp apps/server/.env.example apps/server/.env
pnpm install
pnpm db:setup                 # migrate + PostGIS/indexes + seed dữ liệu demo
pnpm dev                      # chạy server + admin
```

## Roles

`admin` · `accountant` (kế toán) · `staff` (nhân viên; shipper = staff field). Phân quyền bằng
policy-table theo resource + branch scoping — API không tách route theo role.
