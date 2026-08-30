import type { Metadata } from "next";
import { ReconcilerPlaygroundView } from "@/components/reconciler/reconciler-playground-view";

export const metadata: Metadata = {
  title: "Reconciler",
};

export default function ReconcilerPage() {
  return <ReconcilerPlaygroundView />;
}
