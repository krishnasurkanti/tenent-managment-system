"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay/modal";

/*
 * ConfirmDialog — destructive/confirmation action prompt (rebuild).
 * Built on Modal so it inherits focus-trap + Escape. `tone="destructive"`
 * colours the confirm button red.
 */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="small" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            size="small"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-[length:var(--text-sm-size)] leading-relaxed text-[color:var(--fg-secondary)]">
        {message}
      </p>
    </Modal>
  );
}
