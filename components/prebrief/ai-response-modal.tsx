"use client";

import type { PreBrief } from "@/lib/types";
import { Modal } from "@/components/ui/modal";

/**
 * The model's pre-brief response, shown as raw JSON and nothing else: exactly
 * what came back from the model (shape-validated, pre-reconciler), including any
 * findings or deltas the reconciler went on to reject.
 */
export function AiResponseModal({ raw, onClose }: { raw: PreBrief; onClose: () => void }) {
  return (
    <Modal title="Full AI response" onClose={onClose}>
      <pre className="overflow-auto rounded-control border border-hairline bg-surface-sunken p-3 font-mono text-xs leading-5 text-ink">
        {JSON.stringify(raw, null, 2)}
      </pre>
    </Modal>
  );
}
