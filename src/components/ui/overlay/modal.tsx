"use client";

import { X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useOverlayA11y } from "@/hooks/use-overlay-a11y";

/*
 * Modal — centered dialog (rebuild).
 * Focus-trapped, Escape-to-close, backdrop-click close. Uses 100dvh-safe
 * positioning and never applies transform to an ancestor of position:fixed
 * children (the panel itself is the scroll container).
 */

const sizeMap = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
} as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  hideClose = false,
  zIndexClass = "z-50",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: keyof typeof sizeMap;
  hideClose?: boolean;
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
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-[color:var(--border)] bg-[linear-gradient(180deg,#131d2e_0%,#0d1525_100%)] shadow-[var(--shadow-5)] outline-none sm:rounded-[var(--radius-xl)]",
          sizeMap[size],
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3 sm:px-5">
            <div className="min-w-0">
              {title ? (
                <h2 className="font-display text-[length:var(--text-lg-size)] font-bold text-[color:var(--fg-primary)]">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-0.5 text-[length:var(--text-xs-size)] text-[color:var(--fg-secondary)]">
                  {description}
                </p>
              ) : null}
            </div>
            {!hideClose ? (
              <button
                type="button"
                aria-label="Close dialog"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[color:var(--fg-tertiary)] hover:bg-[color:var(--muted)] hover:text-[color:var(--fg-primary)]"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <div className="border-t border-[color:var(--border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
