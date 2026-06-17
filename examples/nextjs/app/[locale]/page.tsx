import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomePageContent />;
}

function HomePageContent() {
  const t = useTranslations();

  return (
    <main>
      <header>
        <h1>{t('common.title')}</h1>
        <LocaleSwitcher />
      </header>

      <p>{t('common.subtitle')}</p>
      <p>{t('home.description')}</p>

      <h2>{t('home.examplesTitle')}</h2>

      <nav>
        <ul>
          <li>
            <Link href="/server-action">{t('home.serverAction.title')}</Link>
            {' '}- {t('home.serverAction.description')}
          </li>
          <li>
            <Link href="/api-route">{t('home.apiRoute.title')}</Link>
            {' '}- {t('home.apiRoute.description')}
          </li>
          <li>
            <Link href="/async-validation">{t('home.asyncValidation.title')}</Link>
            {' '}- {t('home.asyncValidation.description')}
          </li>
        </ul>
      </nav>

      <h2>{t('home.featuresTitle')}</h2>
      <ul>
        <li>{t('home.features.serverValidation')}</li>
        <li>{t('home.features.serverActions')}</li>
        <li>{t('home.features.apiRoutes')}</li>
        <li>{t('home.features.i18n')}</li>
        <li>{t('home.features.translatedLabels')}</li>
      </ul>
    </main>
  );
}
