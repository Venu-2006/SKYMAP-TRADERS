'use client';

import { Check, Languages } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LOCALES, LOCALE_NAMES, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium hover:bg-muted"
          aria-label={t('nav.language')}
          title={t('nav.language')}
        >
          <Languages className="size-4" />
          <span className="hidden sm:inline">{LOCALE_NAMES[locale]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('nav.language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => setLocale(l)} className={cn(l === locale && 'font-semibold text-primary')}>
            <Check className={cn('size-4', l !== locale && 'invisible')} />
            {LOCALE_NAMES[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
