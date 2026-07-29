import { ApiError } from '@firecare/api-client';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@firecare/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CUSTOMER_TYPES } from '../../lib/labels';
import { useCreateCustomer } from '../../lib/queries';

const schema = z.object({
  name: z.string().min(1, 'Nhập tên khách hàng'),
  phone: z.string().optional(),
  type: z.string(),
  address: z.string().optional(),
});
type Values = z.infer<typeof schema>;

export function CreateCustomerDialog({ isAdmin, branchId }: { isAdmin: boolean; branchId: string }) {
  const [open, setOpen] = useState(false);
  const create = useCreateCustomer();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', type: 'individual', address: '' },
  });

  async function onSubmit(v: Values) {
    if (isAdmin && !branchId) {
      toast.error('Vui lòng chọn chi nhánh trước.');
      return;
    }
    try {
      await create.mutateAsync({
        name: v.name,
        phone: v.phone || undefined,
        type: v.type,
        address: v.address || undefined,
        ...(isAdmin ? { branchId } : {}),
      });
      toast.success('Đã thêm khách hàng');
      form.reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Tạo thất bại');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Thêm khách
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm khách hàng</DialogTitle>
          <DialogDescription>Tạo hồ sơ khách hàng mới.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Điện thoại</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CUSTOMER_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Đang lưu…' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
