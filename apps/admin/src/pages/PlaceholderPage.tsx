import { Card, CardContent } from '@firecare/ui';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title, note }: { title: string; note: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Construction className="size-10 text-muted-foreground/40" />
          <p className="max-w-md">{note}</p>
          <p className="text-sm">Đang phát triển.</p>
        </CardContent>
      </Card>
    </div>
  );
}
