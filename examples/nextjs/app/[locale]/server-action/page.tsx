import { setRequestLocale } from 'next-intl/server';
import { ServerActionForm } from './form';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ServerActionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ServerActionForm />;
}
