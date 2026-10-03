-- Shared curriculum text named one person's flagship project ("ClientSync"),
-- their first capstone ("DevScribe") and their degree ("BCA"). Every shared
-- account reads this catalog content, so it must be neutral. The seed_*.sql
-- files were rewritten the same way; this migration fixes databases that
-- already loaded the old seeds. Only read-only catalog tables are touched,
-- never user-written tables (notes, journals, evidence, progress).
-- Idempotent: re-running finds nothing left to replace.

create or replace function pg_temp.neutralize_owner_text(input text) returns text
language sql immutable as $$
  select regexp_replace(
    regexp_replace(
      replace(replace(replace(replace(replace(replace(replace(replace(replace(input, 'Aspiring software engineers in India, especially those with a BCA degree (addressed explicitly in the doc)', 'Aspiring software engineers in India, including those without a traditional computer-science degree'), 'The document explicitly addresses BCA graduates. It says BCA is fine for most target companies (startups, product companies, dev agencies) but becomes a hard filter at FAANG India and large IT services. It suggests MCA as a path if FAANG is a long-term goal.', 'Your degree matters less than your proof of work at most target companies (startups, product companies, dev agencies), but some large employers screen by degree. If one of those is a long-term goal, check their requirements early.'), 'Especially if you''re a BCA graduate from a Tier‑2 college with zero projects and no work experience.', 'Especially if you''re early in your career with few projects and little work experience.'), 'The curriculum explicitly addresses the BCA degree filter — it tells you which companies don''t care about your degree (most startups, product companies, dev agencies) and which do (FAANG, large IT services). You focus your energy where it matters.', 'The curriculum is honest about degree filters: it shows which kinds of companies rarely care about your degree (most startups, product companies, dev agencies) and which often do (some large enterprises and IT services). You focus your energy where it matters.'), 'Your BCA degree is not a blocker – it''s a starting point.', 'Your degree is not a blocker. It''s a starting point.'), 'a project like ClientSync', 'a project like yours'), 'ClientSync''s', 'your flagship project''s'), 'ClientSync', 'your flagship project'), 'DevScribe', 'Dev Journal'),
      '^your flagship project', 'Your flagship project'),
    '([.!?] |\n|\*\*)your flagship project', '\1Your flagship project', 'g')
$$;

do $$
declare
  catalog_tables text[] := array[
    'phases', 'orientation', 'why_this_works', 'advanced_projects', 'capstones',
    'clientsync_milestones', 'stages', 'topic_group_bullets', 'career_pivots',
    'roadmap_modules', 'roadmap_topics', 'roadmap_phases', 'roadmap_stages'
  ];
  t text;
  c record;
  changed bigint;
begin
  foreach t in array catalog_tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    for c in
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = t
        and data_type in ('text', 'character varying', 'jsonb')
    loop
      if c.data_type = 'jsonb' then
        execute format(
          'update public.%1$I set %2$I = pg_temp.neutralize_owner_text(%2$I::text)::jsonb '
          'where %2$I::text like any (array[%3$L, %4$L, %5$L])',
          t, c.column_name, '%ClientSync%', '%DevScribe%', '%BCA%'
        );
      else
        execute format(
          'update public.%1$I set %2$I = pg_temp.neutralize_owner_text(%2$I) '
          'where %2$I like any (array[%3$L, %4$L, %5$L])',
          t, c.column_name, '%ClientSync%', '%DevScribe%', '%BCA%'
        );
      end if;
      get diagnostics changed = row_count;
      if changed > 0 then
        raise notice 'neutralized % row(s) in %.%', changed, t, c.column_name;
      end if;
    end loop;
  end loop;
end $$;
