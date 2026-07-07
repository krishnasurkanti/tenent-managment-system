"use client";

import { useEffect } from "react";

// Reference counter — multiple simultaneous locks stay locked until ALL release.
// Avoids the race condition where closing lock A while lock B is active
// permanently restores body/html to an unlocked state.
let lockCount = 0;

function lock() {
  lockCount++;
  if (lockCount === 1) {
    // Target the scroll area, not the body. This app uses an overflow:hidden
    // shell — the body never scrolls, so body-scroll-lock is both unnecessary
    // and harmful (it can corrupt body.style.position across concurrent locks).
    const el = document.querySelector<HTMLElement>(".app-scroll");
    if (el) el.style.overflowY = "hidden";
  }
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const el = document.querySelector<HTMLElement>(".app-scroll");
    if (el) el.style.overflowY = "";
  }
}

export function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}
