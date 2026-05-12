"use server";

import { getTranslations } from "next-intl/server";
import { generateDataValidator, parseValidationErrors, FormActionResult } from "use-form-definition/server";
import { feedbackFormDefinition } from "@/app/[locale]/server-action/form/definition";

// Re-export FormActionResult for use in the client component
export type FormState = FormActionResult;

/**
 * Server action to handle feedback form submission
 *
 * Demonstrates progressive enhancement:
 * - Validates FormData on the server with the same definition the client uses
 * - Returns typed, already-translated errors that match the form fields (so they render
 *   correctly even with JavaScript disabled)
 * - Echoes the submitted values so `<RenderedForm>` can re-populate the fields on a no-JS
 *   validation-error round-trip
 * - Returns a success result that the client renders from `actionState`
 */
export async function submitFeedback(
  prevState: FormActionResult | null,
  formData: FormData
): Promise<FormActionResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Validate the form data using the definition (server-side)
  const validator = generateDataValidator(feedbackFormDefinition);
  const result = validator(formData);

  if (!result.success) {
    // Translate validation errors server-side so they're display-ready (works without JS too).
    // Validation message keys live under the `form.validation.*` namespace — the library's
    // default localePath for validation messages.
    const t = await getTranslations();
    const errors = parseValidationErrors(result.error.issues, (key, options) =>
      t(`form.validation.${key}`, options as Record<string, string | number> | undefined)
    );

    return {
      success: false,
      message: "forms.error.validation",
      errors,
      // Echo the raw submission so the form re-populates on a no-JS round-trip.
      values: Object.fromEntries(formData.entries()),
    };
  }

  // Here you would typically:
  // - Save to database
  // - Send notification email
  // - etc.

  console.log("Server received valid feedback:", result.data);

  return {
    success: true,
    message: "forms.success.feedback",
    data: result.data,
  };
}
