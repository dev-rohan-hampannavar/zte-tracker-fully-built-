-- ============================================================================
-- ZTE Tracker — Stage 0 / Item 43: Resource Library — curated seed data
--
-- Hand-reviewed official documentation links for topics with an unambiguous
-- primary source (official docs site, MDN, or RFC). This is deliberately
-- NOT exhaustive — only topics naming a specific, well-known technology or
-- API got an entry; topics that are conceptual/pattern-level (e.g. "Design
-- Patterns", "Security", "Testing") were left out rather than guessing at
-- a single canonical source for something with many valid ones.
--
-- curated = true, user_id = NULL (system-owned row, not attributed to any
-- one user — see 0012_curated_resources.sql).
-- Run after seed_data.sql / seed_data_structural.sql (topics must exist).
-- ============================================================================

begin;

insert into public.topic_resources (topic_id, title, url, resource_type, curated, user_id) values
  ('topic-01-005', 'Git Documentation', 'https://git-scm.com/doc', 'doc', true, null),
  ('topic-01-005', 'GitHub Docs', 'https://docs.github.com', 'doc', true, null),
  ('topic-01-006', 'HTML — MDN', 'https://developer.mozilla.org/en-US/docs/Web/HTML', 'doc', true, null),
  ('topic-01-007', 'CSS — MDN', 'https://developer.mozilla.org/en-US/docs/Web/CSS', 'doc', true, null),
  ('topic-01-055', 'TypeScript Handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html', 'doc', true, null),
  ('topic-01-066', 'Zod Documentation', 'https://zod.dev', 'doc', true, null),
  ('topic-01-068', 'GitHub Docs — Collaborating', 'https://docs.github.com/en/pull-requests', 'doc', true, null),

  ('topic-02-001', 'React Documentation', 'https://react.dev', 'doc', true, null),
  ('topic-02-016', 'Fetch API — MDN', 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API', 'doc', true, null),
  ('topic-02-024', 'React Router Documentation', 'https://reactrouter.com', 'doc', true, null),

  ('topic-03-005', 'Tailwind CSS Documentation', 'https://tailwindcss.com/docs', 'doc', true, null),
  ('topic-03-009', 'Radix UI Documentation', 'https://www.radix-ui.com/primitives/docs/overview/introduction', 'doc', true, null),
  ('topic-03-010', 'shadcn/ui Documentation', 'https://ui.shadcn.com/docs', 'doc', true, null),
  ('topic-03-013', 'react-hook-form + Zod Resolvers', 'https://react-hook-form.com/get-started#SchemaValidation', 'doc', true, null),

  ('topic-04-002', 'Zustand Documentation', 'https://zustand.docs.pmnd.rs', 'doc', true, null),
  ('topic-04-003', 'TanStack Query Documentation', 'https://tanstack.com/query/latest/docs/framework/react/overview', 'doc', true, null),
  ('topic-04-004', 'tRPC Documentation', 'https://trpc.io/docs', 'doc', true, null),
  ('topic-04-005', 'XState Documentation', 'https://stately.ai/docs', 'doc', true, null),
  ('topic-04-007', 'React.lazy — React Docs', 'https://react.dev/reference/react/lazy', 'doc', true, null),
  ('topic-04-010', 'createPortal — React Docs', 'https://react.dev/reference/react-dom/createPortal', 'doc', true, null),
  ('topic-04-013', 'TanStack Virtual Documentation', 'https://tanstack.com/virtual/latest/docs/introduction', 'doc', true, null),
  ('topic-04-014', 'React Developer Tools — Profiler', 'https://react.dev/learn/react-developer-tools', 'doc', true, null),

  ('topic-05-001', 'Node.js Documentation', 'https://nodejs.org/docs/latest/api/', 'doc', true, null),
  ('topic-05-002', 'Express.js Documentation', 'https://expressjs.com', 'doc', true, null),
  ('topic-05-011', 'PostgreSQL Documentation', 'https://www.postgresql.org/docs/', 'doc', true, null),
  ('topic-05-012', 'Prisma Documentation', 'https://www.prisma.io/docs', 'doc', true, null),
  ('topic-05-013', 'Supabase Documentation', 'https://supabase.com/docs', 'doc', true, null),
  ('topic-05-018', 'JSON Web Token — RFC 7519', 'https://datatracker.ietf.org/doc/html/rfc7519', 'doc', true, null),

  ('topic-06-001', 'Vitest Documentation', 'https://vitest.dev', 'doc', true, null),
  ('topic-06-002', 'React Testing Library Documentation', 'https://testing-library.com/docs/react-testing-library/intro/', 'doc', true, null),
  ('topic-06-007', 'Playwright Documentation', 'https://playwright.dev/docs/intro', 'doc', true, null),
  ('topic-06-009', 'Docker Documentation', 'https://docs.docker.com', 'doc', true, null),
  ('topic-06-010', 'Docker Compose Documentation', 'https://docs.docker.com/compose/', 'doc', true, null),

  ('topic-06b-001', 'React Native Documentation', 'https://reactnative.dev/docs/getting-started', 'doc', true, null),
  ('topic-06b-003', 'React Navigation Documentation', 'https://reactnavigation.org/docs/getting-started', 'doc', true, null),

  ('topic-07-007', 'GraphQL Documentation', 'https://graphql.org/learn/', 'doc', true, null),

  ('topic-09-001', 'Redis Documentation', 'https://redis.io/docs/latest/', 'doc', true, null),
  ('topic-09-007', 'React Email Documentation', 'https://react.email/docs/introduction', 'doc', true, null),

  ('topic-10-004', 'Sentry Documentation', 'https://docs.sentry.io', 'doc', true, null),
  ('topic-10-012', 'PostHog Documentation', 'https://posthog.com/docs', 'doc', true, null),

  ('topic-11-002', 'WebSockets — MDN', 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API', 'doc', true, null),
  ('topic-11-003', 'WebRTC — MDN', 'https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API', 'doc', true, null),
  ('topic-11-013', 'PostgreSQL Full Text Search', 'https://www.postgresql.org/docs/current/textsearch.html', 'doc', true, null),

  ('topic-12-001', 'OpenAI API Reference', 'https://platform.openai.com/docs/api-reference', 'doc', true, null),
  ('topic-12-003', 'Anthropic API Reference', 'https://docs.claude.com/en/api/overview', 'doc', true, null),
  ('topic-12-005', 'pgvector Documentation', 'https://github.com/pgvector/pgvector', 'doc', true, null),

  ('topic-14-007', 'JWT Best Current Practices — RFC 8725', 'https://datatracker.ietf.org/doc/html/rfc8725', 'doc', true, null),

  ('topic-16-002', 'Terraform Documentation', 'https://developer.hashicorp.com/terraform/docs', 'doc', true, null),
  ('topic-16-003', 'Terraform Cloud Documentation', 'https://developer.hashicorp.com/terraform/cloud-docs', 'doc', true, null),
  ('topic-16-005', 'Kubernetes Documentation', 'https://kubernetes.io/docs/home/', 'doc', true, null),
  ('topic-16-006', 'kind Documentation', 'https://kind.sigs.k8s.io/docs/user/quick-start/', 'doc', true, null)
;

commit;
