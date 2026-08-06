import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { OfflineIndicator } from "@/components/layout/offline-indicator";
import "./globals.css";

// `geist` ships the font files locally and applies them at build time —
// unlike next/font/google, it needs no runtime fetch to fonts.googleapis.com,
// so builds succeed in network-restricted environments (CI runners, sandboxes,
// offline dev) too.

export const metadata: Metadata = {
  title: "ZTE Tracker — Zero to Elite Roadmap Companion",
  description:
    "Daily execution tracker for the Zero to Elite engineering roadmap. Ship the roadmap, don't just read it.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ZTE Tracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('zte-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
        <OfflineIndicator />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            },
          }}
        />
      </body>
    </html>
  );
}
