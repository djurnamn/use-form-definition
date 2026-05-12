"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCustomFormDefinition } from "@/lib/form";
import { contactFormDefinition } from "@/app/[locale]/api-route/form/definition";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

type FormState = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: Record<string, unknown>;
};

export function ApiRouteForm() {
  const t = useTranslations();
  const [successState, setSuccessState] = useState<FormState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use hook with manual translation config (no hook configured in factory)
  // - Pass `function: t` at runtime to enable translation
  // - placeholders: auto-generated for all fields (alwaysInclude: true)
  // - Fields can still opt-out with `placeholder: "none"`
  const { RenderedForm, form } = useCustomFormDefinition(contactFormDefinition, {
    config: { translation: { function: t } },
  });

  // Handle form submission to API route
  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result: FormState = await response.json();

      if (result.success) {
        setSuccessState(result);
      } else {
        // Apply server-side validation errors to the form
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            form.setError(field, {
              type: "server",
              message: messages[0],
            });
          });
        }
        setError(result.message || "forms.error.generic");
      }
    } catch {
      setError("forms.error.generic");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we have a successful submission, show success message
  if (successState?.success) {
    return (
      <main>
        <header>
          <h1>{t("apiRoute.title")}</h1>
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
        <h1>{t("apiRoute.title")}</h1>
        <LocaleSwitcher />
      </header>

      <p>{t("apiRoute.description")}</p>

      {error && <p role="alert">{t(error)}</p>}

      <RenderedForm onSubmit={handleSubmit} />

      <p>
        <Link href="/">{t("common.backToHome")}</Link>
      </p>
    </main>
  );
}
