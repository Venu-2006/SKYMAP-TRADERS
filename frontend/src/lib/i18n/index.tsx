'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { dictionaries, LOCALES, type Locale, type TranslationKey } from './dictionaries';

const STORAGE_KEY = 'skymap-locale';

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate a key, replacing {placeholders} from `vars`. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue>({ locale: 'en', setLocale: () => {}, t: (k) => dictionaries.en[k] });

const isLocale = (v: string | null | undefined): v is Locale => !!v && (LOCALES as readonly string[]).includes(v);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Always start at 'en' so the server and first client render match; the
  // stored/profile locale is applied right after mount.
  const [locale, setLocaleState] = useState<Locale>('en');
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored)) return setLocaleState(stored);
    } catch {
      /* storage blocked */
    }
    const browser = navigator.language.split('-')[0];
    if (isLocale(browser)) setLocaleState(browser);
  }, []);

  // A signed-in user's saved preference wins over the device default.
  useEffect(() => {
    if (isLocale(user?.locale)) setLocaleState(user.locale as Locale);
  }, [user?.locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage blocked */
    }
    // Persist for signed-in users so the choice follows them across devices.
    if (useAuthStore.getState().accessToken) {
      api('/users/me', { method: 'PATCH', body: { locale: next } }).catch(() => undefined);
      const u = useAuthStore.getState().user;
      if (u) useAuthStore.getState().setUser({ ...u, locale: next });
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => {
        const raw = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
        return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => String(vars[k] ?? m)) : raw;
      },
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

/** Shortcut for components that only need the translate function. */
export const useT = () => useContext(I18nContext).t;

export { LOCALES, LOCALE_NAMES, type Locale } from './dictionaries';
