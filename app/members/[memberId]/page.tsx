import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMemberById, getLatestScan } from "@/lib/fixtures";

interface PageProps {
  params: Promise<{ memberId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { memberId } = await params;
  const member = getMemberById(memberId);
  return { title: member ? `${member.displayName} - Brief` : "Member not found - Brief" };
}

/**
 * Pre-Brief screen. STAGE 2 places the route and the member lookup; the
 * pre-brief itself (deltas, risk-ranked findings with provenance, sign-off gate)
 * is built in Stage 3.
 */
export default async function PreBriefPage({ params }: PageProps) {
  const { memberId } = await params;
  const member = getMemberById(memberId);
  if (!member) notFound();

  const latest = getLatestScan(member);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:py-20">
      <Link href="/" className="text-sm text-accent hover:underline">
        Back to board
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-ink">
        {member.displayName}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {member.firstVisit ? "First visit" : "Returning"} · latest scan{" "}
        <span className="tnum">{latest.date}</span> ·{" "}
        <span className="tnum">{member.scans.length}</span>{" "}
        {member.scans.length === 1 ? "scan" : "scans"} on record
      </p>

      <div className="mt-10 rounded-card border border-hairline bg-surface p-8 text-sm text-muted shadow-sm">
        Pre-brief lands in Stage 3: what changed since last visit, risk-ranked
        findings with provenance, and the sign-off gate.
      </div>
    </main>
  );
}
