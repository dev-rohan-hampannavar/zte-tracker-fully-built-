import type { Metadata } from "next";

// login/page.tsx is a client component ("use client", for form state and
// the post-login redirect), so it can't export `metadata` itself — Next
// only reads that export from server components. This sibling layout is
// the standard way to still give the route its own title. The noindex
// default from the root layout applies here unchanged (a sign-in page
// has no reason to rank in search results), so this only adds a
// descriptive title, not an indexing change.
export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
