import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ServerWakeOverlay } from "@/components/ServerWakeOverlay";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // WCAG 1.4.4: do NOT set maximumScale=1 or userScalable=false — users must be
  // able to zoom. Removed per bug H-14 / K-02.
  viewportFit: "cover",
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  title: "Tenant Management System",
  description: "Tenant and hostel management system for owners to manage hostel setup, rooms, tenants, and payments.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StayManager",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Blocking browser-detect: stamps is-ios-safari / is-chrome-android etc on <html>
          before first paint so CSS selectors work without flash of wrong layout. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var ua=navigator.userAgent,h=document.documentElement,iOS=/iP(hone|ad|od)/.test(ua)||(/Mac/.test(ua)&&navigator.maxTouchPoints>1),and=/Android/.test(ua),ff=/Firefox/.test(ua),ch=/Chrome/.test(ua)&&!ff,desk=matchMedia('(hover:hover) and (pointer:fine)').matches;h.classList.toggle('is-ios-safari',iOS&&!desk);h.classList.toggle('is-chrome-android',and&&ch);h.classList.toggle('is-firefox-android',and&&ff);h.classList.toggle('is-firefox-desktop',ff&&desk);h.classList.toggle('is-safari-desktop',!iOS&&/Safari/.test(ua)&&!ch&&desk);h.classList.toggle('is-desktop',desk);})();` }} />
      </head>
      <body className={`${dmSans.variable} ${syne.variable} font-sans antialiased`}>
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>{children}</ToastProvider>
          </QueryProvider>
          <ServerWakeOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}
