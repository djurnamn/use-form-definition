"use client";

import { useTranslations } from "next-intl";
import { useFormDefinition } from "@/lib/form";
import { feedbackFormDefinition } from "@/app/[locale]/server-action/form/definition";
import { submitFeedback } from "../actions";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function ServerActionForm() {
  const t = useTranslations();

  // Pass the server action to the hook → progressive enhancement:
  // - <RenderedForm> wires it via `<form action>`, so the form submits and is validated
  //   server-side even with JavaScript disabled.
  // - The result comes back as `actionState` (it survives SSR / no-JS, unlike an onSuccess
  //   callback) — we render the success view from it below.
  // - With JS, react-hook-form layers client-side validation on top (mode: 'onTouched').
  const { RenderedForm, actionState } = useFormDefinition(feedbackFormDefinition, {
    serverAction: submitFeedback,
  });

  // Successful submission: render the result view straight from the action state.
  if (actionState?.success) {
    return (
      <main>
        <header>
          <h1>{t("serverAction.title")}</h1>
          <LocaleSwitcher />
        </header>

        <section>
          {actionState.message && <p>{t(actionState.message)}</p>}
          {actionState.data && (
            <details>
              <summary>{t("common.submittedData")}</summary>
              <pre>{JSON.stringify(actionState.data, null, 2)}</pre>
            </details>
          )}
        </section>

        <p>
          {/* A plain link works without JS (re-GETs a fresh form); with JS it's a soft nav. */}
          <Link href="/server-action">{t("forms.submitAnother")}</Link>
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

      <RenderedForm />

      <p>
        <Link href="/">{t("common.backToHome")}</Link>
      </p>
    </main>
  );
}
