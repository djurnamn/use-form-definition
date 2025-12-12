import { setRequestLocale } from 'next-intl/server';
import { ApiRouteForm } from './form';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ApiRoutePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ApiRouteForm />;
}
