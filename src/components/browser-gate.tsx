"use client";

import { useBrowser, type BrowserFlags } from "@/hooks/use-browser";

type Props = {
  /** Shown only on mobile browsers (iOS Safari, Chrome Android, Firefox Android) */
  mobile?: React.ReactNode;
  /** Shown only on desktop browsers */
  desktop?: React.ReactNode;
  /** Shown only on iOS Safari */
  ios?: React.ReactNode;
  /** Shown on any browser — render-prop gives full flags for fine-grained control */
  children?: (flags: BrowserFlags) => React.ReactNode;
  /** Fallback while SSR / before hydration */
  fallback?: React.ReactNode;
};

/**
 * Renders different subtrees per browser using the flags from useBrowser().
 * Priority: ios > mobile > desktop > children.
 *
 * @example – swap sidebar vs bottom-nav:
 *   <BrowserGate
 *     desktop={<OwnerSidebar />}
 *     mobile={<OwnerMobileNav />}
 *   />
 *
 * @example – render-prop for full control:
 *   <BrowserGate>
 *     {({ isIosSafari }) => isIosSafari ? <LightCard /> : <HeavyCard />}
 *   </BrowserGate>
 */
export function BrowserGate({ mobile, desktop, ios, children, fallback = null }: Props) {
  const flags = useBrowser();

  // All-false during SSR → show fallback until hydration resolves
  if (!flags.isIosSafari && !flags.isMobile && !flags.isDesktop && !children) {
    return <>{fallback}</>;
  }

  if (children) return <>{children(flags)}</>;
  if (flags.isIosSafari && ios !== undefined) return <>{ios}</>;
  if (flags.isMobile  && mobile  !== undefined) return <>{mobile}</>;
  if (flags.isDesktop && desktop !== undefined) return <>{desktop}</>;

  return <>{fallback}</>;
}
