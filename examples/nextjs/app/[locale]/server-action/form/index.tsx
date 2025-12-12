"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormDefinition } from "@/lib/form";
import { feedbackFormDefinition } from "@/app/[locale]/server-action/form/definition";
import { submitFeedback, FormState } from "../actions";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function ServerActionForm() {
  const t = useTranslations();
  const [successState, setSuccessState] = useState<FormState | null>(null);

  // Use hook with default translation config
  // - Translation is automatic via hook: useTranslations configured in lib/form.ts
  // - labels: auto-generated via localePath (alwaysInclude: true is default)
  // - placeholders: must opt-in per field (alwaysInclude: false is default)
  const { RenderedForm } = useFormDefinition(feedbackFormDefinition);

  // If we have a successful submission, show success message
  if (successState?.success) {
    return (
      <main>
        <header>
          <h1>{t("serverAction.title")}</h1>
          <LocaleSwitcher />
        </header>

        <section>
          <p>{t(successState.message as string)}</p>
          {successState.data && (
            <details>
              <summary>{t("common.submittedData")}</summary>
              <pre>{JSON.stringify(successState.data, null, 2)}</pre>
            </details>
          )}
        </section>

        <p>
          <button type="button" onClick={() => setSuccessState(null)}>
            {t("forms.submitAnother")}
          </button>
        </p>

        <p>
          <Link href="/">{t("common.backToHome")}</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <header>
        <h1>{t("serverAction.title")}</h1>
        <LocaleSwitcher />
      </header>

      <p>{t("serverAction.description")}</p>

      <RenderedForm
        action={submitFeedback}
        onSuccess={(result) => setSuccessState(result as FormState)}
      />

      <p>
        <Link href="/">{t("common.backToHome")}</Link>
      </p>
    </main>
  );
}
