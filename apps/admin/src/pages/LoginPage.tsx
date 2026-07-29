import { ApiError } from '@firecare/api-client';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@firecare/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flame } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../store/auth';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const login = useAuth((s) => s.login);
  const [error, setError] = useState('');
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@firecare.local', password: '' },
  });

  async function onSubmit(values: Values) {
    setError('');
    try {
      await login(values.email, values.password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Đăng nhập thất bại');
    }
  }

  return (
    <div className="grid h-screen place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-xl font-bold">
            <Flame className="size-6 text-primary" /> FireCare
          </div>
          <CardDescription>Hệ thống quản lý dịch vụ PCCC</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="username" {...field} />
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
                    <FormLabel>Mật khẩu</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
