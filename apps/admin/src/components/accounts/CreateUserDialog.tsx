import { ApiError } from '@firecare/api-client';
import type { Branch } from '@firecare/types';
import {
  Button,
  Checkbox,
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
import { useCreateUser } from '../../lib/queries';

const schema = z
  .object({
    name: z.string().min(1, 'Nhập họ tên'),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Tối thiểu 6 ký tự'),
    role: z.enum(['admin', 'accountant', 'staff']),
    branchId: z.string().optional(),
    isFieldStaff: z.boolean().optional(),
  })
  .refine((v) => v.role === 'admin' || !!v.branchId, {
    message: 'Vui lòng chọn chi nhánh',
    path: ['branchId'],
  });
type Values = z.infer<typeof schema>;

export function CreateUserDialog({ branches }: { branches: Branch[] }) {
  const [open, setOpen] = useState(false);
  const create = useCreateUser();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', role: 'staff', branchId: '', isFieldStaff: false },
  });
  const role = form.watch('role');

  async function onSubmit(v: Values) {
    try {
      await create.mutateAsync({
        name: v.name,
        email: v.email,
        password: v.password,
        role: v.role,
        branchId: v.role === 'admin' ? null : v.branchId || null,
        isFieldStaff: v.isFieldStaff,
      });
      toast.success('Đã tạo tài khoản');
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
          <Plus className="size-4" /> Thêm tài khoản
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm tài khoản</DialogTitle>
          <DialogDescription>Tạo tài khoản nhân sự và phân quyền.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Họ tên *</FormLabel>
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu *</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vai trò</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="staff">Nhân viên</SelectItem>
                        <SelectItem value="accountant">Kế toán</SelectItem>
                        <SelectItem value="admin">Quản trị</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {role !== 'admin' && (
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chi nhánh *</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="— Chọn —" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            {role === 'staff' && (
              <FormField
                control={form.control}
                name="isFieldStaff"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Là nhân viên hiện trường (shipper)
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}
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
