import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMemberById } from "@/lib/fixtures";
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

  // The pre-brief is fetched client-side from POST /api/prebrief so the screen
  // has real loading and error states. The member record is loaded here.
  return <PreBriefView member={member} />;
}
