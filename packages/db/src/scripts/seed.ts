/**
 * Dev seed: one branch, one account per role, and a few sample customers.
 * Idempotent — re-running after the admin exists is a no-op. Demo password for
 * every seeded account is `matkhau123`.
 */
import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { branches, customers, db, pool, users } from '../index';

loadEnv({ path: '../../apps/server/.env' });

const DEMO_PASSWORD = 'matkhau123';

async function main() {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(sql`lower(${users.email})`, 'admin@firecare.local'))
    .limit(1);
  if (existing.length) {
    console.log('[db:seed] already seeded — skipping');
    return;
  }

  const [branch] = await db
    .insert(branches)
    .values({
      code: 'CN1',
      name: 'Chi nhánh Trung tâm',
      address: '123 Nguyễn Văn Cừ',
      district: 'Quận 5',
      city: 'TP.HCM',
      phone: '02838000000',
    })
    .returning();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await db.insert(users).values([
    {
      email: 'admin@firecare.local',
      passwordHash,
      name: 'Quản trị hệ thống',
      role: 'admin',
      branchId: null,
    },
    {
      email: 'ketoan@firecare.local',
      passwordHash,
      name: 'Nguyễn Kế Toán',
      role: 'accountant',
      branchId: branch!.id,
    },
    {
      email: 'nhanvien@firecare.local',
      passwordHash,
      name: 'Trần Nhân Viên',
      role: 'staff',
      branchId: branch!.id,
      isFieldStaff: true,
    },
  ]);

  await db.insert(customers).values([
    {
      branchId: branch!.id,
      type: 'restaurant',
      name: 'Nhà hàng Bếp Việt',
      phone: '0901234567',
      address: '45 Lê Lợi, Quận 1',
      city: 'TP.HCM',
      source: 'manual',
      tags: ['vip', 'nhà hàng'],
    },
    {
      branchId: branch!.id,
      type: 'factory',
      name: 'Nhà xưởng Minh Long',
      phone: '0912345678',
      address: 'KCN Tân Bình',
      city: 'TP.HCM',
      source: 'referral',
      tags: ['nhà xưởng'],
    },
    {
      branchId: branch!.id,
      type: 'individual',
      name: 'Chị Hoa',
      phone: '0987654321',
      address: '12 Trần Hưng Đạo',
      city: 'TP.HCM',
      source: 'hotline',
    },
  ]);

  console.log('[db:seed] seeded branch CN1, 3 accounts (password: matkhau123), 3 customers');
}

main()
  .catch((err) => {
    console.error('[db:seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
