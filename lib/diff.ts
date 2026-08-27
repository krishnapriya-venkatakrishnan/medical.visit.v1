/**
 * Minimal word-level diff, used to show the flywheel teaching signal: what the
 * clinician changed between the AI draft debrief and the version they sent.
 *
 * Pure, no dependencies. Standard LCS over whitespace-split tokens.
 */

export type DiffSegment = { text: string; kind: "same" | "add" | "del" };

function tokenize(s: string): string[] {
  // Keep the whitespace attached to each word so re-joining is lossless.
  return s.match(/\S+\s*/g) ?? [];
}

export function diffWords(before: string, after: string): DiffSegment[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;

  // lcs[i][j] = length of the longest common subsequence of a[i:] and b[j:]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const out: DiffSegment[] = [];
  const push = (text: string, kind: DiffSegment["kind"]) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push(a[i], "same");
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push(a[i], "del");
      i++;
    } else {
      push(b[j], "add");
      j++;
    }
  }
  while (i < n) push(a[i++], "del");
  while (j < m) push(b[j++], "add");

  return out;
}

/** True when the two strings differ after trimming trailing whitespace. */
export function changed(before: string, after: string): boolean {
  return before.trimEnd() !== after.trimEnd();
}
