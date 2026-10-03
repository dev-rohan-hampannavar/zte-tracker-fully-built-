import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource/montserrat/300.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import { Toaster } from "sonner";
import { OfflineIndicator } from "@/components/layout/offline-indicator";
import { InstallPrompt } from "@/components/layout/install-prompt";
import { SITE_URL, SITE_NAME } from "@/lib/site-config";
import "./globals.css";

// Montserrat is self-hosted via @fontsource/montserrat (static CSS files
// bundled with the package). No network access is required at build time
// or in the browser, unlike next/font/google which fetches from
// fonts.googleapis.com during the build.

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ZTE Tracker — Zero to Elite Roadmap Companion",
    // Lets any page opt into "Page Name | ZTE Tracker" via
    // `title: "Page Name"` in its own metadata export without repeating
    // the suffix everywhere — see /u/[slug]'s generateMetadata.
    template: "%s | ZTE Tracker",
  },
  description:
    "Daily execution tracker for the Zero to Elite engineering roadmap. Ship the roadmap, don't just read it.",
  manifest: "/manifest.json",
  // Default to noindex,nofollow at the root layout. This app is almost
  // entirely an authenticated personal tracker (dashboard, journal,
  // roadmap, etc.) — those routes have no business appearing in Google,
  // and a crawler that hits them unauthenticated only ever sees a login
  // redirect anyway, so indexing them would just pollute search results
  // with sign-in pages. The few genuinely public routes (/, /u/[slug])
  // explicitly override this back to indexable in their own metadata —
  // see root page.tsx and u/[slug]/page.tsx. This is the "keep noindex on
  // private/authenticated pages, remove it from public ones" split the
  // spec asks for, just implemented as an opt-in default rather than
  // auditing dozens of individual (app)/ routes for a tag none of them
  // currently set anyway.
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon-v2.ico",
    apple: "/apple-touch-icon.png",
  },
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={{ ["--font-geist-sans" as string]: "'Montserrat', sans-serif" }}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('zte-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
        <OfflineIndicator />
        <InstallPrompt />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "color-mix(in srgb, var(--surface) 85%, transparent)",
              backdropFilter: "blur(16px) saturate(160%)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              boxShadow: "0 8px 32px -8px rgb(0 0 0 / 0.5)",
            },
          }}
        />
      </body>
    </html>
  );
}
