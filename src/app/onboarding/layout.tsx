import type { Metadata } from "next";

// onboarding/page.tsx is a client component (multi-step form state), so
// it can't export `metadata` itself — same reasoning as welcome/layout.tsx
// and login/layout.tsx.
export const metadata: Metadata = {
  title: "Set up your roadmap",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
