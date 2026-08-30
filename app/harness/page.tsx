import type { Metadata } from "next";
import { HarnessSuiteView } from "@/components/harness/harness-suite-view";

export const metadata: Metadata = {
  title: "Harness suite",
};

export default function HarnessPage() {
  return <HarnessSuiteView />;
}
