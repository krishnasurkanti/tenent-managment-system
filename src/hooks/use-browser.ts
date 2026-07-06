"use client";

import { useEffect, useState } from "react";

export type BrowserFlags = {
  isIosSafari: boolean;
  isChromeAndroid: boolean;
  isFirefoxAndroid: boolean;
  isFirefoxDesktop: boolean;
  isSafariDesktop: boolean;
  isDesktop: boolean;
  /** true on any mobile browser (iOS Safari OR Chrome/Firefox Android) */
  isMobile: boolean;
};

const SERVER_FLAGS: BrowserFlags = {
  isIosSafari:      false,
  isChromeAndroid:  false,
  isFirefoxAndroid: false,
  isFirefoxDesktop: false,
  isSafariDesktop:  false,
  isDesktop:        false,
  isMobile:         false,
};

function readFlags(): BrowserFlags {
  const h = document.documentElement;
  const has = (cls: string) => h.classList.contains(cls);
  const ios = has("is-ios-safari");
  const ca  = has("is-chrome-android");
  const fa  = has("is-firefox-android");
  return {
    isIosSafari:      ios,
    isChromeAndroid:  ca,
    isFirefoxAndroid: fa,
    isFirefoxDesktop: has("is-firefox-desktop"),
    isSafariDesktop:  has("is-safari-desktop"),
    isDesktop:        has("is-desktop"),
    isMobile:         ios || ca || fa,
  };
}

/**
 * Returns browser flags from the blocking detection script in layout.tsx.
 *
 * SSR + first client render = all-false (no hydration mismatch).
 * After hydration = real values from the <html> class list.
 *
 * @example
 * const { isIosSafari, isMobile } = useBrowser();
 */
export function useBrowser(): BrowserFlags {
  const [flags, setFlags] = useState<BrowserFlags>(SERVER_FLAGS);

  useEffect(() => {
    setFlags(readFlags());
  }, []);

  return flags;
}
