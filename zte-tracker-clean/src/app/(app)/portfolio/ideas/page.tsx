import { redirect } from "next/navigation";

// /portfolio/ideas duplicated /portfolio (same list, older unstyled version).
// Canonical route is /portfolio; this redirects rather than deleting the
// path outright, in case anything external still links here.
export default function PortfolioIdeasRedirect() {
  redirect("/portfolio");
}
