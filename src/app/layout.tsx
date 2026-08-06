import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { OfflineIndicator } from "@/components/layout/offline-indicator";
import "./globals.css";

// Montserrat is self-hosted via @fontsource/montserrat, imported in
// globals.css — not through next/font/google here. next/font/google
// requires a live fetch to fonts.googleapis.com at build time, which
// fails in network-restricted environments (this project's own build
// sandbox included). @fontsource ships the font files as regular
// node_modules assets instead, so no font-related network request happens
// at all. GeistMono still loads via next/font (the `geist` package, which
// is pre-bundled and needs no fetch) for tabular/monospace numbers.

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
      className={`h-full antialiased ${GeistMono.variable}`}
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
