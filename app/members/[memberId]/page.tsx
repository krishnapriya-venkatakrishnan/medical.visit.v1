import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMemberById } from "@/lib/fixtures";
import { getSamplePreBrief } from "@/lib/fixtures/sample-prebriefs";
import { PreBriefView } from "@/components/prebrief/prebrief-view";

interface PageProps {
  params: Promise<{ memberId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { memberId } = await params;
  const member = getMemberById(memberId);
  return { title: member ? `${member.displayName} - Brief` : "Member not found - Brief" };
}

export default async function PreBriefPage({ params }: PageProps) {
  const { memberId } = await params;
  const member = getMemberById(memberId);
  if (!member) notFound();

  // STAGE 3: the pre-brief is a hardcoded sample. STAGE 4 replaces this with a
  // call to the Anthropic API via POST /api/prebrief.
  const sample = getSamplePreBrief(member.id);

  if (!sample) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:py-20">
        <Link href="/" className="text-sm text-accent hover:underline">
          Back to board
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-ink">
          {member.displayName}
        </h1>
        <p className="mt-6 rounded-card border border-hairline bg-surface p-8 text-sm text-muted shadow-sm">
          No pre-brief has been generated for this member yet.
        </p>
      </main>
    );
  }

  return <PreBriefView member={member} sample={sample} />;
}
