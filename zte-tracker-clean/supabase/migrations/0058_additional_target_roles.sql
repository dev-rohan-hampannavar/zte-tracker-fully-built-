-- Master spec section 5 asks for role-specific career paths across 10
-- categories (Backend, Frontend, Full Stack, DevOps, Cloud, Data,
-- Cybersecurity, Mobile, QA, Other). 0033 seeded 4 of these
-- (frontend-developer, backend-developer, fullstack-developer, sde-1).
--
-- This adds 4 more that the curriculum's actual seeded technologies
-- (supabase/seed_data_structural.sql) can honestly support with real
-- weighted evidence: DevOps (Docker, Kubernetes, Terraform, Helm, GitHub
-- Actions, Git), Cloud (AWS S3, Vercel, Docker, Terraform), Mobile (React
-- Native, Expo, TypeScript, JavaScript), and QA/Test (Playwright, Vitest,
-- React Testing Library, Supertest, MSW).
--
-- Deliberately NOT adding Data Engineer or Cybersecurity Engineer here —
-- the curriculum has no real depth behind either (no Spark/Airflow/dbt-
-- style data-pipeline tooling; security is scattered tooling — JWT, OWASP,
-- Dependabot — not a dedicated track). Seeding either with a thin,
-- padded-out requirement list would produce exactly the "fabricated-
-- looking evidence" the skill_evidence view's own design comment (0032)
-- and job-readiness.ts's "never a mysterious arbitrary percentage" rule
-- were built to avoid. If this deployment's curriculum ever grows real
-- data-engineering or security content, add those roles then, weighted
-- against what's actually there.

insert into public.target_roles (id, name, description) values
  ('devops-engineer', 'DevOps Engineer', 'CI/CD, containerization, and infrastructure-focused roles'),
  ('cloud-engineer', 'Cloud Engineer', 'Cloud infrastructure and deployment-focused roles'),
  ('mobile-engineer', 'Mobile Engineer', 'React Native / cross-platform mobile roles'),
  ('qa-engineer', 'QA / Test Engineer', 'Test automation and quality engineering roles')
on conflict (id) do nothing;

insert into public.role_skill_requirements (role_id, technology_id, weight)
select 'devops-engineer', t.id, w.weight
from public.technologies t
join (values
  ('Docker', 1.0), ('Kubernetes', 0.9), ('Terraform', 0.8), ('Helm', 0.6),
  ('GitHub Actions', 0.8), ('Git', 0.6), ('Bash', 0.5), ('CloudWatch', 0.4)
) as w(name, weight) on lower(t.name) = lower(w.name)
on conflict do nothing;

insert into public.role_skill_requirements (role_id, technology_id, weight)
select 'cloud-engineer', t.id, w.weight
from public.technologies t
join (values
  ('AWS S3', 1.0), ('Vercel', 0.6), ('Docker', 0.7), ('Terraform', 0.9),
  ('Kubernetes', 0.6), ('CloudWatch', 0.6), ('Bash', 0.4)
) as w(name, weight) on lower(t.name) = lower(w.name)
on conflict do nothing;

insert into public.role_skill_requirements (role_id, technology_id, weight)
select 'mobile-engineer', t.id, w.weight
from public.technologies t
join (values
  ('React Native', 1.0), ('Expo', 0.8), ('TypeScript', 0.7), ('JavaScript', 0.7),
  ('REST', 0.5)
) as w(name, weight) on lower(t.name) = lower(w.name)
on conflict do nothing;

insert into public.role_skill_requirements (role_id, technology_id, weight)
select 'qa-engineer', t.id, w.weight
from public.technologies t
join (values
  ('Playwright', 1.0), ('Vitest', 0.7), ('React Testing Library', 0.7),
  ('Supertest', 0.6), ('MSW', 0.5), ('Postman', 0.4)
) as w(name, weight) on lower(t.name) = lower(w.name)
on conflict do nothing;
