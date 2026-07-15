"use client";

import { cn } from "@/utils/cn";
import { useOverlayA11y } from "@/hooks/use-overlay-a11y";

/*
 * BottomSheet — mobile-first overlay panel that slides up from the bottom
 * (rebuild). Same a11y contract as Modal (focus-trap, Escape, backdrop close).
 * Uses dvh + bottom safe-area inset so the grab area clears the home indicator.
 */

export function BottomSheet({
  open,
  onClose,
  title,
  zIndexClass = "z-50",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  zIndexClass?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useOverlayA11y(open, onClose);
  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 flex items-end justify-center sm:items-center", zIndexClass)}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--overlay)] backdrop-blur-[6px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] min-h-[40dvh] w-full flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-[color:var(--border)] bg-[linear-gradient(180deg,#131d2e_0%,#0d1525_100%)] shadow-[var(--shadow-5)] outline-none sm:max-w-lg sm:rounded-[var(--radius-xl)]"
      >
        <div className="flex flex-col items-center pt-2.5">
          <span aria-hidden className="h-1 w-10 rounded-full bg-[color:var(--border-strong)] sm:hidden" />
        </div>
        {title ? (
          <h2 className="font-display px-4 pt-2 pb-1 text-[length:var(--text-lg-size)] font-bold text-[color:var(--fg-primary)] sm:px-5">
            {title}
          </h2>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">{children}</div>
        {footer ? (
          <div className="border-t border-[color:var(--border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
