"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm, FieldValues, ResolverOptions, ResolverResult } from "react-hook-form";
import { z } from "zod";
import {
  createPluginRegistry,
  ValidationPlugin,
  ValidationContext,
  generateSchemaAsync,
  generateDefaultValues,
  PluginMetadata,
} from "use-form-definition";
import { useFormDefinition } from "@/lib/form";
import { registrationFormDefinition } from "./definition";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

/**
 * Create a validation plugin that checks username availability via API
 *
 * The plugin system allows async validation by extending the generated schema
 * with additional refinements that call external APIs.
 */
const createUsernameAvailabilityPlugin = (): ValidationPlugin => {
  return (context: ValidationContext) => {
    const { fieldKey } = context;

    // Only apply to username field - return z.any() for other fields
    // to indicate no modification (standard pattern for plugins)
    if (fieldKey !== "username") {
      return {
        schema: z.any(),
      };
    }

    // Create a schema with async refinement for username validation
    const usernameSchema = z.any().refine(
      async (value) => {
        // Skip validation for empty values (let required validation handle it)
        if (!value || (typeof value === "string" && value.trim() === "")) {
          return true;
        }

        try {
          const response = await fetch(
            `/api/check-username?username=${encodeURIComponent(value)}`
          );
          const data = await response.json();
          return data.available;
        } catch (error) {
          // On network error, allow submission (server will validate again)
          console.error("Username check failed:", error);
          return true;
        }
      },
      {
        message: "usernameAlreadyTaken",
      }
    );

    return {
      schema: usernameSchema,
    };
  };
};

/**
 * Registration form with async username validation
 *
 * This example demonstrates:
 * 1. Creating a plugin registry
 * 2. Registering a custom async validation plugin
 * 3. Using generateSchemaAsync to build a schema with plugin support
 * 4. Integrating with react-hook-form
 */
export function AsyncValidationForm() {
  const t = useTranslations();
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
  } | null>(null);

  // Create plugin registry with username availability plugin
  const pluginRegistry = useMemo(() => {
    const registry = createPluginRegistry();

    const metadata: PluginMetadata = {
      name: "username-availability",
      version: "1.0.0",
      description: "Checks if username is available via API",
    };

    // Register the plugin for the 'username' field type
    // The third parameter is fieldTypes - we pass ['username'] but since
    // our field type is 'text', we'll apply to all text fields and filter internally
    registry.register(
      "username-availability",
      createUsernameAvailabilityPlugin(),
      metadata,
      ["text"]
    );

    return registry;
  }, []);

  // Generate async schema with plugins - this returns a Promise
  // Note: generateSchemaAsync(definition, formData?, pluginRegistry?)
  const schemaPromise = useMemo(
    () => generateSchemaAsync(registrationFormDefinition, undefined, pluginRegistry),
    [pluginRegistry]
  );

  // Create form with async resolver
  const form = useForm({
    resolver: async (
      data: FieldValues,
      _context: unknown,
      _options: ResolverOptions<FieldValues>
    ): Promise<ResolverResult<FieldValues>> => {
      try {
        const schema = await schemaPromise;
        // Use safeParseAsync for schemas with async refinements
        const result = await schema.safeParseAsync(data);

        if (result.success) {
          return { values: result.data as FieldValues, errors: {} };
        }

        // Convert Zod errors to react-hook-form format
        const errors: Record<string, { type: string; message: string }> = {};
        for (const error of result.error.errors) {
          const path = error.path.join(".");
          if (!errors[path]) {
            errors[path] = {
              type: "validation",
              message: error.message,
            };
          }
        }

        return { values: {}, errors };
      } catch (error) {
        console.error("Schema resolution failed:", error);
        return { values: {}, errors: {} };
      }
    },
    defaultValues: generateDefaultValues(registrationFormDefinition) as Record<string, unknown>,
    mode: "onBlur",
  });

  // Use the form definition hook with our configured form
  const { RenderedForm } = useFormDefinition(registrationFormDefinition, {
    form,
  });

  // Handle form submission
  const onSubmit = async (data: Record<string, unknown>) => {
    setSubmitResult(null);

    try {
      // Simulate API call for registration
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSubmitResult({
        success: true,
        message: "Registration successful!",
        data,
      });
    } catch {
      setSubmitResult({
        success: false,
        message: "Registration failed. Please try again.",
      });
    }
  };

  // Show success state
  if (submitResult?.success) {
    return (
      <main>
        <header>
          <h1>{t("asyncValidation.title")}</h1>
          <LocaleSwitcher />
        </header>

        <p>
          <strong>{submitResult.message}</strong>
        </p>
        {submitResult.data && (
          <details>
            <summary>{t("common.submittedData")}</summary>
            <pre>
              {JSON.stringify(
                {
                  ...submitResult.data,
                  password: "[REDACTED]",
                  confirmPassword: "[REDACTED]",
                },
                null,
                2
              )}
            </pre>
          </details>
        )}

        <p>
          <button type="button" onClick={() => setSubmitResult(null)}>
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
        <h1>{t("asyncValidation.title")}</h1>
        <LocaleSwitcher />
      </header>

      <p>{t("asyncValidation.description")}</p>

      <div>
        <strong>{t("asyncValidation.tryUsernames")}</strong>
        <ul>
          <li>
            <code>admin</code>, <code>test</code>, <code>demo</code> —{" "}
            {t("asyncValidation.alreadyTaken")}
          </li>
          <li>
            {t("asyncValidation.anyOther")} — {t("asyncValidation.available")}
          </li>
        </ul>
      </div>

      {submitResult && !submitResult.success && (
        <p role="alert">{submitResult.message}</p>
      )}

      <RenderedForm onSubmit={onSubmit} />

      <p>
        <Link href="/">{t("common.backToHome")}</Link>
      </p>
    </main>
  );
}
