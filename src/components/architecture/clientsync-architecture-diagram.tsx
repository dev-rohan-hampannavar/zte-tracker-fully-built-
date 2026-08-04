"use client";

/**
 * Stage 4 — Item 44: a hand-authored diagram of ClientSync's own
 * architecture (frontend / API / DB / auth / deployment), distinct from
 * the auto-generated codebase explorer above it on this page. ClientSync
 * is the person's own project, not something roadmap.md specifies
 * structurally — so this is drawn by hand from the concrete integrations
 * named across the ClientSync milestones (Razorpay, Resend, PostHog,
 * Sentry, WebSockets/SSE, Docker, Expo) rather than generated from schema.
 *
 * Uses the app's existing CSS custom properties (--surface, --surface-2,
 * --border, --foreground, --muted, --accent, --success, --warning) so it
 * matches the rest of the UI in both light and dark mode with no
 * duplicated color logic.
 */
export function ClientSyncArchitectureDiagram() {
  return (
    <svg
      width="100%"
      viewBox="0 0 680 580"
      role="img"
      aria-label="ClientSync architecture: web and mobile clients through an API layer, real-time channel, database, auth, and deployment/observability stack"
    >
      <title>ClientSync architecture</title>
      <desc>
        Web client and Expo mobile client call a Next.js API layer over REST and a WebSocket/SSE
        channel for real-time features. The API layer authenticates via Supabase Auth, reads and
        writes Postgres through Supabase, and calls out to Razorpay for payments and Resend for
        email. The whole stack is containerized with Docker and observed with PostHog and Sentry.
      </desc>
      <defs>
        <marker
          id="cs-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path
            d="M2 1L8 5L2 9"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>

      {/* ---------- Row 1: clients ---------- */}
      <g>
        <rect x="80" y="30" width="220" height="56" rx="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
        <text x="190" y="52" textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--foreground)">
          Web client
        </text>
        <text x="190" y="70" textAnchor="middle" fontSize="12" fill="var(--muted)">
          Next.js 15, React, Tailwind
        </text>
      </g>
      <g>
        <rect x="380" y="30" width="220" height="56" rx="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
        <text x="490" y="52" textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--foreground)">
          Mobile client
        </text>
        <text x="490" y="70" textAnchor="middle" fontSize="12" fill="var(--muted)">
          Expo Go (Phase 06b)
        </text>
      </g>

      {/* connectors clients -> API */}
      <line x1="190" y1="86" x2="190" y2="130" stroke="var(--muted)" strokeWidth="0.5" markerEnd="url(#cs-arrow)" />
      <line x1="490" y1="86" x2="490" y2="130" stroke="var(--muted)" strokeWidth="0.5" markerEnd="url(#cs-arrow)" />
      <text x="200" y="112" fontSize="12" fill="var(--muted)">
        REST / RPC
      </text>

      {/* ---------- Row 2: API layer ---------- */}
      <g>
        <rect x="80" y="130" width="520" height="70" rx="8" fill="var(--surface)" stroke="var(--accent)" strokeWidth="0.5" />
        <text x="340" y="156" textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--foreground)">
          API layer
        </text>
        <text x="340" y="176" textAnchor="middle" fontSize="12" fill="var(--muted)">
          Next.js route handlers · server actions
        </text>
        <text x="340" y="192" textAnchor="middle" fontSize="12" fill="var(--muted)">
          WebSocket / SSE channel for real-time features (Phase 11)
        </text>
      </g>

      {/* connector API -> auth */}
      <line x1="150" y1="200" x2="150" y2="250" stroke="var(--muted)" strokeWidth="0.5" markerEnd="url(#cs-arrow)" />
      {/* connector API -> DB */}
      <line x1="340" y1="200" x2="340" y2="250" stroke="var(--muted)" strokeWidth="0.5" markerEnd="url(#cs-arrow)" />
      {/* connector API -> integrations */}
      <line x1="530" y1="200" x2="530" y2="250" stroke="var(--muted)" strokeWidth="0.5" markerEnd="url(#cs-arrow)" />

      {/* ---------- Row 3: auth / db / integrations ---------- */}
      <g>
        <rect x="80" y="250" width="140" height="70" rx="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
        <text x="150" y="278" textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--foreground)">
          Auth
        </text>
        <text x="150" y="296" textAnchor="middle" fontSize="12" fill="var(--muted)">
          Supabase Auth
        </text>
      </g>
      <g>
        <rect x="260" y="250" width="160" height="70" rx="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
        <text x="340" y="278" textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--foreground)">
          Database
        </text>
        <text x="340" y="296" textAnchor="middle" fontSize="12" fill="var(--muted)">
          Postgres (Supabase)
        </text>
      </g>
      <g>
        <rect x="460" y="250" width="140" height="70" rx="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
        <text x="530" y="270" textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--foreground)">
          Integrations
        </text>
        <text x="530" y="288" textAnchor="middle" fontSize="12" fill="var(--muted)">
          Razorpay (Phase 09)
        </text>
        <text x="530" y="304" textAnchor="middle" fontSize="12" fill="var(--muted)">
          Resend (Phase 09)
        </text>
      </g>

      {/* connectors row3 -> deployment */}
      <line x1="150" y1="320" x2="150" y2="370" stroke="var(--muted)" strokeWidth="0.5" markerEnd="url(#cs-arrow)" />
      <line x1="340" y1="320" x2="340" y2="370" stroke="var(--muted)" strokeWidth="0.5" markerEnd="url(#cs-arrow)" />
      <line x1="530" y1="320" x2="530" y2="370" stroke="var(--muted)" strokeWidth="0.5" markerEnd="url(#cs-arrow)" />

      {/* ---------- Row 4: deployment & observability ---------- */}
      <g>
        <rect x="80" y="370" width="520" height="90" rx="8" fill="var(--surface)" stroke="var(--success)" strokeWidth="0.5" />
        <text x="340" y="396" textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--foreground)">
          Deployment &amp; observability
        </text>
        <text x="340" y="416" textAnchor="middle" fontSize="12" fill="var(--muted)">
          Docker container · CI badge · live demo URL (Phase 06 — Exit A)
        </text>
        <text x="340" y="434" textAnchor="middle" fontSize="12" fill="var(--muted)">
          PostHog (usage) + Sentry (errors) dashboard (Phase 10)
        </text>
      </g>

      {/* ---------- Legend ---------- */}
      <text x="80" y="500" fontSize="12" fontWeight="500" fill="var(--foreground)">
        Milestone reference
      </text>
      <text x="80" y="520" fontSize="12" fill="var(--muted)">
        Each box&apos;s phase tag maps to a ClientSync milestone tracked on the ClientSync page —
      </text>
      <text x="80" y="538" fontSize="12" fill="var(--muted)">
        this diagram is a static snapshot of the target architecture, not a live query.
      </text>
    </svg>
  );
}
