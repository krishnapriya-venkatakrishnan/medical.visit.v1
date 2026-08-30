import { Fragment, type ReactNode } from "react";

/**
 * One inline treatment for a code token (a file path, a schema name, a command,
 * an env var) sitting inside prose. A deliberate highlight: hairline-bordered
 * chip, monospace, slightly smaller, so it reads as intentional rather than an
 * accidental font switch mid-sentence. Use this everywhere, or plain text; never
 * a bare `font-mono` span in running text.
 */
export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-hairline bg-surface px-1 py-px font-mono text-[0.85em] text-ink">
      {children}
    </code>
  );
}

/**
 * Render a plain string, turning `backtick`-wrapped spans into <Code> chips.
 * Lets catalog / step-detail data hold its own markup without JSX.
 */
export function withInlineCode(text: string): ReactNode {
  return text
    .split("`")
    .map((seg, i) =>
      i % 2 === 1 ? <Code key={i}>{seg}</Code> : <Fragment key={i}>{seg}</Fragment>,
    );
}
