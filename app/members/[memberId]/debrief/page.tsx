import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMemberById } from "@/lib/fixtures";
import { DebriefView } from "@/components/debrief/debrief-view";

interface PageProps {
  params: Promise<{ memberId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { memberId } = await params;
  const member = getMemberById(memberId);
  return {
    title: member ? `${member.displayName} debrief - Brief` : "Member not found - Brief",
  };
}

export default async function DebriefPage({ params }: PageProps) {
  const { memberId } = await params;
  const member = getMemberById(memberId);
  if (!member) notFound();

  // The debrief is drafted client-side from the finalised pre-brief held in the
  // TanStack Query cache, then POSTed to /api/debrief.
  return <DebriefView member={member} />;
}
