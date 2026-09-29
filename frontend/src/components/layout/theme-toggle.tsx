'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useT();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t('nav.darkMode')}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  );
}
