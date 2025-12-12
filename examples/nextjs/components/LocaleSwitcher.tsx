'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const localeLabels: Record<string, string> = {
  en: 'English',
  sv: 'Svenska',
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <select value={locale} onChange={handleChange}>
      {routing.locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeLabels[loc] || loc}
        </option>
      ))}
    </select>
  );
}
