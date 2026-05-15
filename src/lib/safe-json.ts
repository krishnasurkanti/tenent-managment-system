import { NextResponse } from "next/server";

/**
 * Wraps request.json() in a try-catch.
 * Returns the parsed body or a ready-to-return 400 NextResponse.
 *
 * Usage:
 *   const { body, error } = await parseJsonBody(request);
 *   if (error) return error;
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request,
): Promise<{ body: T; error: null } | { body: null; error: NextResponse }> {
  try {
    return { body: (await request.json()) as T, error: null };
  } catch {
    return {
      body: null,
      error: NextResponse.json({ message: "Invalid request body." }, { status: 400 }),
    };
  }
}
