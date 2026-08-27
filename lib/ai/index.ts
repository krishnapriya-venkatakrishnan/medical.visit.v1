/**
 * AI boundary - SERVER ONLY.
 *
 * `import "server-only"` makes the build fail if any of this module is pulled
 * into a Client Component. ANTHROPIC_API_KEY must never reach the browser
 * (non-negotiable: key is server-side only).
 *
 * The Anthropic client, prompt + schema module, JSON parsing, Zod validation
 * and retry logic are added in later stages. Keep the prompt+schema module
 * heavily commented - reviewers will read it closely.
 */

import "server-only";

/**
 * Reads the Anthropic API key from the server environment. Throws loudly at call
 * time if it is missing so failures surface during development, not silently.
 */
export function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key.",
    );
  }
  return key;
}
