import { ApiError } from '@firecare/api-client';
import type { CustomerType } from '@firecare/types';
import { Button, toast } from '@firecare/ui';
import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { parseCsv } from '../../lib/csv';
import { useImportCustomers } from '../../lib/queries';

export function ImportCustomers({ isAdmin, branchId }: { isAdmin: boolean; branchId: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const importMut = useImportCustomers();

  async function onFile(file: File) {
    if (isAdmin && !branchId) {
      toast.error('Vui lòng chọn chi nhánh trước.');
      return;
    }
    try {
      const { rows } = parseCsv(await file.text());
      const mapped = rows
        .map((r) => ({
          name: r.name ?? r['tên'] ?? r['ten'] ?? '',
          phone: r.phone ?? r['sdt'] ?? r['điện thoại'] ?? undefined,
          type: (r.type as CustomerType) || undefined,
          email: r.email || undefined,
          address: r.address ?? r['địa chỉ'] ?? undefined,
        }))
        .filter((r) => r.name);
      if (!mapped.length) {
        toast.error('Không đọc được dòng nào (cần cột "name").');
        return;
      }
      const res = await importMut.mutateAsync({
        branchId: isAdmin ? branchId : undefined,
        rows: mapped,
      });
      toast.success(`Đã nhập ${res.inserted}, bỏ qua ${res.skipped} (trùng SĐT).`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Nhập thất bại');
    } finally {
      if (ref.current) ref.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <Button variant="outline" onClick={() => ref.current?.click()} disabled={importMut.isPending}>
        <Upload className="size-4" /> Nhập CSV
      </Button>
    </>
  );
}
