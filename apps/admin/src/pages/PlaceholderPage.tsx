import { Construction } from 'lucide-react';
import { Card } from '../lib/ui';

export default function PlaceholderPage({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <Card className="mt-4 flex flex-col items-center gap-3 p-12 text-center text-slate-500">
        <Construction className="h-10 w-10 text-slate-300" />
        <p className="max-w-md">{note}</p>
        <p className="text-sm text-slate-400">Đang phát triển.</p>
      </Card>
    </div>
  );
}
