/**
 * The Anthropic client factory. SERVER ONLY.
 *
 * `new Anthropic()` reads ANTHROPIC_API_KEY from the environment. Identity-linked
 * API keys additionally require the workspace to be named on every request, so
 * when ANTHROPIC_WORKSPACE_ID is set it is sent as the `anthropic-workspace-id`
 * header.
 */

import "server-only";

import Anthropic from "@anthropic-ai/sdk";

export function anthropic(): Anthropic {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  return new Anthropic(
    workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {},
  );
}

/**
 * The single Anthropic call each generator makes, isolated behind a function type
 * so tests can inject a fake with no SDK and no network. Production code uses
 * `defaultCreateMessage`; nothing else changes.
 */
export type CreateMessage = (
  params: Anthropic.MessageCreateParamsNonStreaming,
) => Promise<Anthropic.Message>;

export const defaultCreateMessage: CreateMessage = (params) =>
  anthropic().messages.create(params);
