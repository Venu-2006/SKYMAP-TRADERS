'use client';

import { useT } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n/dictionaries';

/**
 * Renders one translated string. Lets Server Components (the home page,
 * product pages) show translated headings without becoming client components.
 */
export function T({ k, vars }: { k: TranslationKey; vars?: Record<string, string | number> }) {
  return <>{useT()(k, vars)}</>;
}
