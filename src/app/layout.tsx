import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ServerWakeOverlay } from "@/components/ServerWakeOverlay";

const browserDetect = `(function(){var u=navigator.userAgent,h=document.documentElement;if(/iP(hone|ad|od)/.test(u)&&/WebKit/.test(u)&&!/CriOS|FxiOS|OPiOS/.test(u))h.classList.add('is-ios-safari');if(/Android/.test(u)&&/Chrome\//.test(u)&&!/SamsungBrowser/.test(u))h.classList.add('is-chrome-android');if(/Android/.test(u)&&/Firefox\//.test(u))h.classList.add('is-firefox-android');if(/Firefox\//.test(u)&&!/Android|Mobile/.test(u))h.classList.add('is-firefox-desktop');if(/Macintosh/.test(u)&&/Safari\//.test(u)&&!/Chrome|CriOS/.test(u))h.classList.add('is-safari-desktop');if(!/iPhone|iPad|iPod|Android/.test(u))h.classList.add('is-desktop');})();`;

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
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${syne.variable} font-sans antialiased`}>
        <Script id="browser-detect" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: browserDetect }} />
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
