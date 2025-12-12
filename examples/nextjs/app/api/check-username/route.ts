import { NextRequest, NextResponse } from "next/server";

/**
 * Simple API endpoint to check username availability
 *
 * This is a mock implementation - in a real app, you would
 * check against your database.
 */

// Simulated list of taken usernames
const TAKEN_USERNAMES = [
  "admin",
  "root",
  "user",
  "test",
  "demo",
  "support",
  "help",
  "contact",
  "info",
  "sales",
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Username parameter is required" },
      { status: 400 }
    );
  }

  // Simulate network delay (100-300ms)
  await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

  const normalizedUsername = username.toLowerCase().trim();
  const isAvailable = !TAKEN_USERNAMES.includes(normalizedUsername);

  return NextResponse.json({
    username: normalizedUsername,
    available: isAvailable,
    message: isAvailable
      ? "Username is available"
      : "Username is already taken",
  });
}
