import type { Debrief } from "@/lib/types";

/** Read-only rendering of a debrief, as the member would receive it. */
export function DebriefDocument({ debrief }: { debrief: Debrief }) {
  return (
    <article className="rounded-card border border-hairline bg-surface p-6 shadow-sm sm:p-8">
      <p className="text-sm text-ink">{debrief.greeting}</p>
      <p className="mt-4 text-sm leading-7 text-ink">{debrief.summary}</p>

      <Section title="What's going well" items={debrief.whatsGood} />
      <Section title="What to keep an eye on" items={debrief.whatToWatch} />
      <Section title="Your plan" items={debrief.actionPlan} ordered />

      <p className="mt-6 text-sm leading-7 text-ink">{debrief.closing}</p>
    </article>
  );
}

function Section({
  title,
  items,
  ordered = false,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  if (items.length === 0) return null;
  const listClass = `mt-2 space-y-1.5 pl-5 text-sm leading-7 text-ink ${
    ordered ? "list-decimal" : "list-disc"
  }`;
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {ordered ? (
        <ol className={listClass}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className={listClass}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
