'use client';

import { MoonIcon, SunIcon } from 'lucide-react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { Button } from '@firecare/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@firecare/ui/components/ui/dropdown-menu';

/** Re-export next-themes provider so both apps share one theming setup. */
export { NextThemesProvider as ThemeProvider, useTheme };

/**
 * Inline script to set the theme class before paint (avoids FOUC in the Vite
 * SPA, which has no SSR). Next.js relies on next-themes' own injected script.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export function ModeToggle() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Đổi giao diện sáng/tối">
          <SunIcon className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <MoonIcon className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Đổi giao diện</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>Sáng</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>Tối</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>Theo hệ thống</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
