import type { Metadata } from "next";

// welcome/page.tsx is a client component (carousel state), so it can't
// export `metadata` itself — see login/layout.tsx for the same pattern
// and reasoning. Keeps the root layout's noindex default (onboarding
// carousels don't belong in search results either) and just adds a
// descriptive title.
export const metadata: Metadata = {
  title: "Welcome",
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
