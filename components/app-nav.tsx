"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Persistent side navigation. Two tabs, deliberately separate:
 *
 *   Regression  hardcoded synthetic members + bundled sample pre-briefs. Frozen;
 *               this is what the reconciler eval runs against.
 *   Demo        upload one scan, get a live reconciled result. No hardcoded
 *               input, no hardcoded result: input in, result out, or a clear
 *               status if it cannot run.
 */
const TABS = [
  {
    href: "/",
    label: "Regression",
    hint: "Frozen synthetic members",
    isActive: (path: string) => path === "/" || path.startsWith("/members"),
  },
  {
    href: "/demo",
    label: "Demo",
    hint: "Upload a scan, live result",
    isActive: (path: string) => path === "/demo" || path.startsWith("/demo/"),
  },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 border-b border-hairline bg-surface md:w-60 md:border-b-0 md:border-r">
      <div className="px-5 py-6">
        <p className="text-sm font-semibold tracking-tight text-ink">Brief</p>
        <p className="mt-0.5 text-xs text-muted">Clinician workspace</p>
      </div>

      <nav aria-label="Sections" className="flex gap-1 px-3 pb-4 md:flex-col">
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 rounded-control px-3 py-2 transition-colors md:flex-none ${
                active
                  ? "bg-accent-tint text-accent"
                  : "text-muted hover:bg-surface-sunken hover:text-ink"
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
