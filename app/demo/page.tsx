import type { Metadata } from "next";
import { DemoView } from "@/components/demo/demo-view";

export const metadata: Metadata = {
  title: "Demo - Brief",
};

// The demo runs a live model call per submission; nothing to prerender.
export const dynamic = "force-dynamic";

export default function DemoPage() {
  return <DemoView />;
}
