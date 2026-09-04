-- Add the BI/data target role requested by the career-plan readiness views.
-- The technology catalog entries are additive; existing deployments that do
-- not yet contain these technologies receive the same canonical IDs as a
-- fresh seed, so role requirements remain explainable and editable.
insert into public.technologies (id, name, category) values
  ('tech-python', 'Python', 'Language'),
  ('tech-pandas', 'Pandas', 'Data'),
  ('tech-excel', 'Excel', 'Data'),
  ('tech-power-bi', 'Power BI', 'Data'),
  ('tech-tableau', 'Tableau', 'Data'),
  ('tech-statistics', 'Statistics', 'Data')
on conflict (id) do nothing;

insert into public.target_roles (id, name, description) values
  ('bi-data-analyst', 'BI / Data Analyst', 'SQL, Python, dashboards, and business-facing data analysis roles')
on conflict (id) do nothing;

insert into public.role_skill_requirements (role_id, technology_id, weight)
select 'bi-data-analyst', t.id, req.weight
from public.technologies t
join (values
  ('SQL', 1.0), ('Python', 1.0), ('Pandas', 0.8), ('Excel', 0.7),
  ('Power BI', 0.8), ('Tableau', 0.6), ('Statistics', 0.8), ('PostgreSQL', 0.6)
) as req(name, weight) on lower(t.name) = lower(req.name)
on conflict (role_id, technology_id) do nothing;
