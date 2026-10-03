// Server-only fetch logic (uses fetch's Next.js `next.revalidate` cache
// option, which only has effect in Server Components/Route Handlers).
// The original implementation in src/app/u/[slug]/page.tsx didn't guard
// with the `server-only` package either, so this doesn't introduce a new
// dependency just for this — callers are responsible for only importing
// this from server-side code (Server Components / Route Handlers).

export interface GithubActivitySummary {
  publicEventCount: number;
  lastActiveAt: string | null;
  recentRepos: string[]; // up to 5 distinct repo names touched recently
}

/**
 * Pulls a lightweight "recent activity" signal from GitHub's public REST
 * API — no auth token needed, so nothing to configure as a secret. This is
 * NOT the full contribution graph (that requires GitHub's GraphQL API with
 * an authenticated token, which would mean every load makes an
 * authenticated call against a token tied to the profile OWNER, not the
 * viewer — a bigger commitment to secret management than this feature
 * warrants). Events API only returns the last ~90 days / 300 events, which
 * is a reasonable proxy for "is this person actively building right now".
 *
 * Originally written for the public profile page (src/app/u/[slug]);
 * extracted here unchanged so the authenticated Developer Activity
 * Dashboard (Phase 9) can reuse the exact same fetch/cache/error-handling
 * behavior instead of a second, slightly-different implementation.
 */
export async function getGithubActivity(username: string | null): Promise<GithubActivitySummary | null> {
  if (!username) return null;
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "zte-tracker" },
      next: { revalidate: 3600 }, // GitHub rate-limits unauthenticated requests per IP, so cache longer than a typical page
    });
    if (!res.ok) return null;
    const events = (await res.json()) as { type: string; created_at: string; repo: { name: string } }[];
    if (!Array.isArray(events) || events.length === 0) return { publicEventCount: 0, lastActiveAt: null, recentRepos: [] };

    const recentRepos = [...new Set(events.map((e) => e.repo.name))].slice(0, 5);
    return {
      publicEventCount: events.length,
      lastActiveAt: events[0]?.created_at ?? null,
      recentRepos,
    };
  } catch {
    // GitHub API being down/rate-limited shouldn't break the page that
    // called this — callers should treat null as "widget doesn't render".
    return null;
  }
}

export interface GithubEventBreakdown {
  pushEvents: number;
  pullRequestEvents: number;
  issueEvents: number;
  otherEvents: number;
}

/**
 * A finer breakdown than getGithubActivity's flat count, for the
 * Developer Activity Dashboard's "commits / PRs / issues this week" style
 * display. Separate function (not folded into getGithubActivity) so the
 * public profile page's existing behavior and cache key are untouched.
 */
export async function getGithubEventBreakdown(username: string | null, sinceDays = 7): Promise<GithubEventBreakdown | null> {
  if (!username) return null;
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "zte-tracker" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const events = (await res.json()) as { type: string; created_at: string }[];
    if (!Array.isArray(events)) return null;

    const cutoff = Date.now() - sinceDays * 86400000;
    const recent = events.filter((e) => new Date(e.created_at).getTime() >= cutoff);

    return {
      pushEvents: recent.filter((e) => e.type === "PushEvent").length,
      pullRequestEvents: recent.filter((e) => e.type === "PullRequestEvent").length,
      issueEvents: recent.filter((e) => e.type === "IssuesEvent" || e.type === "IssueCommentEvent").length,
      otherEvents: recent.filter((e) => !["PushEvent", "PullRequestEvent", "IssuesEvent", "IssueCommentEvent"].includes(e.type)).length,
    };
  } catch {
    return null;
  }
}
