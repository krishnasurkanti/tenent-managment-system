"use client";

import { cn } from "@/utils/cn";
import { useOverlayA11y } from "@/hooks/use-overlay-a11y";

/*
 * Drawer — side panel that slides in from the left or right (rebuild).
 * Used for mobile navigation / filter panels. Focus-trapped, Escape + backdrop
 * close. Full-height using dvh with horizontal safe-area padding.
 */

export function Drawer({
  open,
  onClose,
  side = "left",
  title,
  widthClass = "w-[84vw] max-w-xs",
  zIndexClass = "z-50",
  children,
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: string;
  widthClass?: string;
  zIndexClass?: string;
  children: React.ReactNode;
}) {
  const panelRef = useOverlayA11y(open, onClose);
  if (!open) return null;

  return (
    <div className={cn("fixed inset-0", zIndexClass)}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--overlay)] backdrop-blur-[4px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "absolute top-0 flex h-[100dvh] flex-col overflow-hidden border-[color:var(--border)] bg-[color:var(--sidebar)] shadow-[var(--shadow-5)] outline-none",
          side === "left"
            ? "left-0 border-r pl-[env(safe-area-inset-left)]"
            : "right-0 border-l pr-[env(safe-area-inset-right)]",
          widthClass,
        )}
      >
        {title ? (
          <h2 className="font-display px-4 py-3 text-[length:var(--text-lg-size)] font-bold text-[color:var(--fg-primary)]">
            {title}
          </h2>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">{children}</div>
      </div>
    </div>
  );
}
