"use client";

import { useSyncExternalStore } from "react";

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

const SERVER_FLAGS: BrowserFlags = {
  isIosSafari:      false,
  isChromeAndroid:  false,
  isFirefoxAndroid: false,
  isFirefoxDesktop: false,
  isSafariDesktop:  false,
  isDesktop:        false,
  isMobile:         false,
};

// Classes stamped by the blocking script in layout.tsx don't change at runtime,
// so subscribe is a no-op — useSyncExternalStore still handles SSR correctly.
const noop = () => () => {};

/**
 * Returns browser flags derived from the blocking detection script in layout.tsx.
 * Safe to call during SSR (returns all-false until hydration).
 *
 * @example
 * const { isIosSafari, isMobile } = useBrowser();
 */
export function useBrowser(): BrowserFlags {
  return useSyncExternalStore(
    noop,
    readFlags,
    () => SERVER_FLAGS,
  );
}
