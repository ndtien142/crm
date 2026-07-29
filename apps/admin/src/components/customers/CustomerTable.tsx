import type { Customer } from '@firecare/types';
import {
  Badge,
  Button,
  cn,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@firecare/ui';
import { Trash2 } from 'lucide-react';
import { customerStatusLabel, customerTypeLabel, STATUS_BADGE } from '../../lib/labels';

export function CustomerTable({
  items,
  loading,
  canDelete,
  onDelete,
}: {
  items: Customer[];
  loading: boolean;
  canDelete: boolean;
  onDelete: (c: Customer) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tên</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Điện thoại</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Nhãn</TableHead>
          {canDelete && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={canDelete ? 6 : 5}>
                <Skeleton className="h-6 w-full" />
              </TableCell>
            </TableRow>
          ))
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={canDelete ? 6 : 5}
              className="py-10 text-center text-muted-foreground"
            >
              Không có khách hàng nào.
            </TableCell>
          </TableRow>
        ) : (
          items.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <div className="font-medium">{c.name}</div>
                {c.address && <div className="text-xs text-muted-foreground">{c.address}</div>}
              </TableCell>
              <TableCell className="text-muted-foreground">{customerTypeLabel(c.type)}</TableCell>
              <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={cn('border-transparent', STATUS_BADGE[c.status])}>
                  {customerStatusLabel(c.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {c.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              {canDelete && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(c)}
                    aria-label="Xoá"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
