import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

function Footer() {
  const t = useTranslations();

  return (
    <>
      <hr />
      <footer>
        <p>
          <a
            href="https://github.com/djurnamn/use-form-definition"
            target="_blank"
            rel="noopener noreferrer"
          >
            use-form-definition
          </a>
          {' '}- {t('common.tagline')}
        </p>
      </footer>
    </>
  );
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming locale is valid
  if (!routing.locales.includes(locale as 'en' | 'sv')) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for the locale
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
      <Footer />
    </NextIntlClientProvider>
  );
}
