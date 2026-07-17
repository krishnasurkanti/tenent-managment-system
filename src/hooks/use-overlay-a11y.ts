"use client";

import { useEffect, useRef } from "react";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/*
 * Shared overlay behaviour for Modal/BottomSheet/Drawer:
 * - locks the app scroll area while open
 * - closes on Escape
 * - traps Tab focus inside the panel
 * - moves focus into the panel ONCE on open, restores it on close
 *
 * onClose is read through a ref so the effect only depends on `open`. Depending
 * on `onClose` (usually an inline arrow) re-ran the effect on every render,
 * which stole focus back to the first field on each keystroke and dismissed the
 * mobile keyboard.
 */
export function useOverlayA11y(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    // Focus the first focusable element (once, when the overlay opens).
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
      if (nodes.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstNode || active === panel)) {
        e.preventDefault();
        lastNode.focus();
      } else if (!e.shiftKey && active === lastNode) {
        e.preventDefault();
        firstNode.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      restoreRef.current?.focus?.();
    };
  }, [open]);

  return panelRef;
}
