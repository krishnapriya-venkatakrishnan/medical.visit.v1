import type { Metadata } from "next";
import { BriefView } from "@/components/brief/brief-view";

export const metadata: Metadata = {
  title: "Brief",
};

// The Brief tab runs a live model call per submission; nothing to prerender.
export const dynamic = "force-dynamic";

export default function BriefPage() {
  return <BriefView />;
}
