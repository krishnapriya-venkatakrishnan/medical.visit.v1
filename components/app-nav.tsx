"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Persistent side navigation. Four sibling tabs, none nested under another:
 *
 *   Brief          upload one scan, get a live reconciled pre-brief, then the
 *                  full clinician-in-the-loop review and debrief.
 *   Harness suite  the test catalog. The deterministic reconciler cases run
 *                  live in the browser; the model-facing cases are documented.
 *   Reconciler     an interactive playground for lib/reconcile.ts alone: edit a
 *                  finding, reconcile it client-side, see every check. No model.
 *   Decisions      scope and the rationale behind the architecture.
 *
 * The Member Board and its Pre-Brief / Debrief screens (the frozen fixture flow)
 * live at "/" and are reached from the workspace title above the tabs.
 */
const TABS = [
  {
    href: "/brief",
    label: "Brief",
    hint: "Upload a scan, live pre-brief",
    isActive: (path: string) => path === "/brief" || path.startsWith("/brief/"),
  },
  {
    href: "/harness",
    label: "Harness suite",
    hint: "The test catalog, run live",
    isActive: (path: string) => path.startsWith("/harness"),
  },
  {
    href: "/reconciler",
    label: "Reconciler",
    hint: "Interactive, no model",
    isActive: (path: string) => path.startsWith("/reconciler"),
  },
  {
    href: "/decisions",
    label: "Decisions",
    hint: "Scope and rationale",
    isActive: (path: string) => path.startsWith("/decisions"),
  },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 border-b border-hairline bg-surface md:w-60 md:border-b-0 md:border-r">
      <Link href="/" className="block px-5 py-5 hover:bg-icy/50">
        <p className="text-sm text-ink">Dashboard</p>
        <p className="mt-0.5 text-xs text-muted">Clinician workspace</p>
      </Link>

      <nav aria-label="Sections" className="flex md:flex-col">
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 px-5 py-2.5 transition-colors md:flex-none ${
                active ? "bg-icy text-ink" : "text-muted hover:bg-icy/50 hover:text-ink"
              }`}
            >
              <span className={`block text-sm ${active ? "font-medium" : ""}`}>{tab.label}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted">{tab.hint}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
