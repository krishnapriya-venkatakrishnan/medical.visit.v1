"use client";

import { useState } from "react";
import type { Debrief } from "@/lib/types";

/**
 * Inline editor for the debrief draft. List sections are edited as one item per
 * line; blank lines are dropped on save. On save the whole edited Debrief is
 * handed back so the view can diff it against the draft.
 */
export function DebriefEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: Debrief;
  onSave: (edited: Debrief) => void;
  onCancel: () => void;
}) {
  const [greeting, setGreeting] = useState(initial.greeting);
  const [summary, setSummary] = useState(initial.summary);
  const [whatsGood, setWhatsGood] = useState(initial.whatsGood.join("\n"));
  const [whatToWatch, setWhatToWatch] = useState(initial.whatToWatch.join("\n"));
  const [actionPlan, setActionPlan] = useState(initial.actionPlan.join("\n"));
  const [closing, setClosing] = useState(initial.closing);

  const toList = (s: string) =>
    s.split("\n").map((line) => line.trim()).filter(Boolean);

  const handleSave = () => {
    onSave({
      memberId: initial.memberId,
      greeting: greeting.trim() || initial.greeting,
      summary: summary.trim() || initial.summary,
      whatsGood: toList(whatsGood),
      whatToWatch: toList(whatToWatch),
      actionPlan: toList(actionPlan),
      closing: closing.trim() || initial.closing,
    });
  };

  return (
    <div className="rounded-card border border-hairline bg-surface p-6 shadow-sm sm:p-8">
      <Field label="Greeting">
        <input
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          className="w-full rounded-control border border-hairline bg-surface p-2.5 text-sm text-ink"
        />
      </Field>
      <Field label="Summary">
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="w-full rounded-control border border-hairline bg-surface p-2.5 text-sm leading-6 text-ink"
        />
      </Field>
      <Field label="What's good (one per line)">
        <textarea
          value={whatsGood}
          onChange={(e) => setWhatsGood(e.target.value)}
          rows={3}
          className="w-full rounded-control border border-hairline bg-surface p-2.5 text-sm leading-6 text-ink"
        />
      </Field>
      <Field label="What to watch (one per line)">
        <textarea
          value={whatToWatch}
          onChange={(e) => setWhatToWatch(e.target.value)}
          rows={3}
          className="w-full rounded-control border border-hairline bg-surface p-2.5 text-sm leading-6 text-ink"
        />
      </Field>
      <Field label="Action plan (one per line)">
        <textarea
          value={actionPlan}
          onChange={(e) => setActionPlan(e.target.value)}
          rows={4}
          className="w-full rounded-control border border-hairline bg-surface p-2.5 text-sm leading-6 text-ink"
        />
      </Field>
      <Field label="Closing">
        <textarea
          value={closing}
          onChange={(e) => setClosing(e.target.value)}
          rows={2}
          className="w-full rounded-control border border-hairline bg-surface p-2.5 text-sm leading-6 text-ink"
        />
      </Field>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-control bg-ink px-4 py-2 text-sm font-medium text-bg"
        >
          Save changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-control px-4 py-2 text-sm font-medium text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
