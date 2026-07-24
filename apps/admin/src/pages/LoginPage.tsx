import { ApiError } from '@firecare/api-client';
import { Flame } from 'lucide-react';
import { useState } from 'react';
import { useSession } from '../lib/session';
import { Button, Card, Input } from '../lib/ui';

export default function LoginPage() {
  const { login } = useSession();
  const [email, setEmail] = useState('admin@firecare.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full place-items-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-1 flex items-center gap-2 text-xl font-bold text-slate-900">
          <Flame className="h-6 w-6 text-red-600" /> FireCare
        </div>
        <p className="mb-6 text-sm text-slate-500">Hệ thống quản lý dịch vụ PCCC</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
