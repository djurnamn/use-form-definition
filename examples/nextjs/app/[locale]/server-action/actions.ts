"use server";

import { generateDataValidator, parseValidationErrors, FormActionResult } from "use-form-definition/server";
import { feedbackFormDefinition } from "@/app/[locale]/server-action/form/definition";

// Re-export FormActionResult for use in the client component
export type FormState = FormActionResult;

/**
 * Server action to handle feedback form submission
 *
 * Demonstrates:
 * - Using generateDataValidator() to validate FormData on the server
 * - Returning typed errors that match the form fields
 * - Success state handling
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
    // Parse validation errors to human-readable messages
    const errors = parseValidationErrors(result.error.issues);

    return {
      success: false,
      message: "forms.error.validation",
      errors,
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
