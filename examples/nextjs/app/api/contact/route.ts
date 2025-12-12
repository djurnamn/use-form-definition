import { NextRequest, NextResponse } from "next/server";
import { generateSchema, parseValidationErrors } from "use-form-definition/server";
import { contactFormDefinition } from "@/app/[locale]/api-route/form/definition";

/**
 * API Route handler for contact form
 *
 * Demonstrates:
 * - Using generateSchema() to validate JSON/form data in an API route
 * - Handling both JSON and FormData submissions
 * - Returning typed error responses
 */
export async function POST(request: NextRequest) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Get the form data - supports both JSON and FormData
  let data: Record<string, unknown>;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    data = await request.json();
  } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    data = Object.fromEntries(formData.entries());
  } else {
    return NextResponse.json(
      { success: false, message: "Unsupported content type" },
      { status: 400 }
    );
  }

  // Validate the data using the same definition as the client
  const schema = generateSchema(contactFormDefinition);
  const result = schema.safeParse(data);

  if (!result.success) {
    // Parse validation errors to human-readable messages
    const errors = parseValidationErrors(result.error.issues);

    return NextResponse.json(
      {
        success: false,
        message: "forms.error.validation",
        errors,
      },
      { status: 400 }
    );
  }

  // Here you would typically:
  // - Save to database
  // - Send notification email
  // - etc.

  console.log("API received valid contact form:", result.data);

  return NextResponse.json({
    success: true,
    message: "forms.success.contact",
    data: result.data,
  });
}
