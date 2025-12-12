import { setRequestLocale } from "next-intl/server";
import { AsyncValidationForm } from "./form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AsyncValidationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AsyncValidationForm />;
}
