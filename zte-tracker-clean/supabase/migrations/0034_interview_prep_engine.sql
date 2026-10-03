-- ============================================================================
-- PHASE 6 of the Career OS build: Interview Preparation Engine.
--
-- interview_rounds (Phase 3) tracks WHEN interviews happen and whether a
-- round passed/failed, but not WHAT was weak. This migration adds the
-- missing layer: a curated interview_questions bank (global reference
-- data, seeded per technology — same pattern as technologies/target_roles/
-- role_skill_requirements, not per-user content) and a per-user
-- interview_attempts log (mirrors dsa_progress's shape deliberately: an
-- append-only log of "I attempted this, here's how it went", not a mutable
-- score). Weakness is then a live aggregate over attempts, never a
-- hand-set flag — same "no fake analytics" discipline as skill_evidence.
--
-- Weak concepts detected here can optionally point at a real topic_id, so
-- the existing revision system (topic_progress.revision_status) can be
-- nudged to 'needs_revision' by interview performance — closing the loop
-- the spec asks for (Interview -> Skill Weakness -> Revision) without a
-- second parallel revision mechanism.
-- ============================================================================

create table if not exists public.interview_questions (
  id uuid primary key default uuid_generate_v4(),
  technology_id text references public.technologies(id) on delete set null,
  round_type text not null check (round_type in ('oa', 'recruiter_screen', 'technical', 'system_design', 'behavioral', 'hr', 'final', 'other')),
  question text not null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  concept_tag text, -- fine-grained concept within the technology, e.g. "useMemo", "closures", "indexing"
  -- optionally anchors this question to a real curriculum topic, so a
  -- logged weakness can push that topic's revision_status
  linked_topic_id text references public.topics(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_interview_questions_tech on public.interview_questions(technology_id);
create index if not exists idx_interview_questions_round_type on public.interview_questions(round_type);

alter table public.interview_questions enable row level security;
create policy "read: interview_questions" on public.interview_questions for select to authenticated using (true);

-- A small seed set per common technology/round_type so the feature has
-- real content on day one rather than shipping an empty bank. Kept
-- intentionally modest (this is reference content, not the roadmap's own
-- curriculum data) — more can be added later without a schema change.
insert into public.interview_questions (technology_id, round_type, question, difficulty, concept_tag)
select t.id, q.round_type, q.question, q.difficulty, q.concept_tag
from public.technologies t
join (values
  ('React', 'technical', 'What is the difference between useMemo and useCallback, and when would you use each?', 'medium', 'useMemo/useCallback'),
  ('React', 'technical', 'Explain how React''s reconciliation and key prop affect list rendering performance.', 'medium', 'rendering'),
  ('React', 'technical', 'Walk through what happens when setState is called inside an event handler vs a setTimeout.', 'hard', 'state management'),
  ('React', 'technical', 'When would you reach for useReducer instead of multiple useState calls?', 'easy', 'state management'),
  ('JavaScript', 'technical', 'Explain closures with a practical example.', 'easy', 'closures'),
  ('JavaScript', 'technical', 'What is the event loop, and how do microtasks differ from macrotasks?', 'hard', 'event loop'),
  ('JavaScript', 'technical', 'Explain prototypal inheritance and how it differs from classical inheritance.', 'medium', 'prototypes'),
  ('TypeScript', 'technical', 'What is the difference between an interface and a type alias, and when does it matter?', 'easy', 'types vs interfaces'),
  ('TypeScript', 'technical', 'Explain generics with an example of a reusable typed function.', 'medium', 'generics'),
  ('Node.js', 'technical', 'How does Node.js handle concurrency given it is single-threaded?', 'medium', 'event loop'),
  ('PostgreSQL', 'technical', 'When would you add an index, and what is the tradeoff of adding too many?', 'medium', 'indexing'),
  ('PostgreSQL', 'technical', 'Explain the difference between INNER JOIN, LEFT JOIN, and a subquery for the same result.', 'easy', 'joins'),
  ('SQL', 'technical', 'What is a transaction, and what do ACID guarantees actually protect against?', 'medium', 'transactions'),
  ('Git', 'technical', 'Explain the difference between git merge and git rebase, and when you would choose each.', 'medium', 'merge vs rebase'),
  ('REST', 'technical', 'What makes an API RESTful, and what is a common mistake people make calling something REST when it is not?', 'easy', 'REST principles'),
  ('Docker', 'technical', 'What is the difference between a Docker image and a container?', 'easy', 'images vs containers')
) as q(technology_name, round_type, question, difficulty, concept_tag) on lower(t.name) = lower(q.technology_name)
on conflict do nothing;

-- General behavioral/HR questions aren't technology-specific.
insert into public.interview_questions (technology_id, round_type, question, difficulty, concept_tag)
values
  (null, 'behavioral', 'Tell me about a time you disagreed with a technical decision. What did you do?', 'medium', 'conflict resolution'),
  (null, 'behavioral', 'Describe a project that did not go as planned. What would you do differently?', 'medium', 'failure/learning'),
  (null, 'behavioral', 'Why are you looking to leave your current role / what are you looking for next?', 'easy', 'motivation'),
  (null, 'hr', 'Walk me through your resume.', 'easy', 'self-presentation'),
  (null, 'hr', 'What are your salary expectations?', 'easy', 'negotiation')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Per-user attempt log — append-only, mirrors dsa_progress's shape.
-- Optionally attached to a specific interview_round, so attempts made
-- while prepping for a specific company are traceable, but attempts can
-- also happen standalone (general practice, no round yet).
-- ----------------------------------------------------------------------------
create table if not exists public.interview_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.interview_questions(id) on delete cascade,
  interview_round_id uuid references public.interview_rounds(id) on delete set null,
  result text not null check (result in ('correct', 'partial', 'incorrect')),
  notes text,
  attempted_at timestamptz not null default now()
);
create index if not exists idx_interview_attempts_user on public.interview_attempts(user_id, attempted_at desc);
create index if not exists idx_interview_attempts_question on public.interview_attempts(question_id);

alter table public.interview_attempts enable row level security;
create policy "own rows: interview_attempts" on public.interview_attempts
  for all to authenticated using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (interview_round_id is null or exists (
      select 1 from public.interview_rounds ir where ir.id = interview_round_id and ir.user_id = auth.uid()
    ))
  );

-- ----------------------------------------------------------------------------
-- interview_weaknesses: live aggregate, never a hand-set flag. A concept
-- is "weak" if the user's most recent attempts on it skew incorrect/
-- partial. Only concepts with at least one attempt appear — no
-- fabricated 0% for concepts never tried.
-- ----------------------------------------------------------------------------
create or replace view public.interview_weaknesses as
select
  ia.user_id,
  iq.technology_id,
  t.name as technology_name,
  iq.concept_tag,
  iq.linked_topic_id,
  count(*) as attempts,
  count(*) filter (where ia.result = 'correct') as correct_count,
  round(100.0 * count(*) filter (where ia.result = 'correct') / count(*)) as accuracy_pct,
  max(ia.attempted_at) as last_attempted_at
from public.interview_attempts ia
join public.interview_questions iq on iq.id = ia.question_id
left join public.technologies t on t.id = iq.technology_id
where iq.concept_tag is not null
group by ia.user_id, iq.technology_id, t.name, iq.concept_tag, iq.linked_topic_id
having round(100.0 * count(*) filter (where ia.result = 'correct') / count(*)) < 70;

grant select on public.interview_weaknesses to authenticated;

-- Per-role interview readiness: accuracy across all attempts for
-- technologies required by that role (reuses role_skill_requirements from
-- Phase 5 so "React interview readiness: 71%" style numbers are computed
-- from the same weighting as the Job Readiness score's skills pillar).
create or replace view public.interview_readiness_by_role as
select
  ia.user_id,
  rsr.role_id,
  count(*) as attempts,
  round(100.0 * count(*) filter (where ia.result = 'correct') / count(*)) as accuracy_pct
from public.interview_attempts ia
join public.interview_questions iq on iq.id = ia.question_id
join public.role_skill_requirements rsr on rsr.technology_id = iq.technology_id
group by ia.user_id, rsr.role_id;

grant select on public.interview_readiness_by_role to authenticated;

-- ============================================================================
-- Atomically logs an attempt and, when the question is linked to a real
-- topic and the running accuracy on its concept is weak, nudges that
-- topic's revision_status to 'needs_revision' — this is how "Interview ->
-- Skill Weakness -> Revision" actually closes the loop, rather than being
-- two features that happen to share a database.
-- ============================================================================
create or replace function public.log_interview_attempt(
  p_question_id uuid,
  p_result text,
  p_interview_round_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_attempt_id uuid;
  v_topic_id text;
  v_accuracy numeric;
begin
  if p_result not in ('correct', 'partial', 'incorrect') then
    raise exception 'invalid result: %', p_result;
  end if;

  -- This function runs as security definer (bypasses RLS), so ownership
  -- of the optional interview_round_id must be checked explicitly here —
  -- the interview_attempts RLS policy's own check on this column would
  -- not otherwise apply to this insert path.
  if p_interview_round_id is not null and not exists (
    select 1 from public.interview_rounds ir where ir.id = p_interview_round_id and ir.user_id = auth.uid()
  ) then
    raise exception 'interview_round_id does not belong to the caller';
  end if;

  insert into public.interview_attempts (user_id, question_id, interview_round_id, result, notes)
  values (auth.uid(), p_question_id, p_interview_round_id, p_result, p_notes)
  returning id into v_attempt_id;

  select linked_topic_id into v_topic_id from public.interview_questions where id = p_question_id;

  if v_topic_id is not null then
    select round(100.0 * count(*) filter (where ia.result = 'correct') / count(*))
      into v_accuracy
      from public.interview_attempts ia
      join public.interview_questions iq on iq.id = ia.question_id
      where ia.user_id = auth.uid() and iq.linked_topic_id = v_topic_id;

    if v_accuracy < 70 then
      update public.topic_progress
        set revision_status = 'needs_revision', updated_at = now()
        where user_id = auth.uid() and topic_id = v_topic_id;
      -- if the topic hasn't been started yet there's no topic_progress row
      -- to update, which is correct — you can't need revision on something
      -- you never learned; the interview question flags weakness in the
      -- concept regardless, visible via interview_weaknesses.
    end if;
  end if;

  return v_attempt_id;
end;
$$;

grant execute on function public.log_interview_attempt(uuid, text, uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Fix reset_user_progress(): interview_attempts (Phase 6) is per-user log
-- data, same category as dsa_progress.
-- ----------------------------------------------------------------------------
create or replace function public.reset_user_progress()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.topic_progress where user_id = auth.uid();
  delete from public.daily_logs where user_id = auth.uid();
  delete from public.topic_notes where user_id = auth.uid();
  delete from public.project_progress where user_id = auth.uid();
  delete from public.dsa_progress where user_id = auth.uid();
  delete from public.career_tracker where user_id = auth.uid();
  delete from public.topic_resources where user_id = auth.uid();
  delete from public.advanced_project_progress where user_id = auth.uid();
  delete from public.exercise_progress where user_id = auth.uid();
  delete from public.build_in_public_status where user_id = auth.uid();
  delete from public.manual_item_checks where user_id = auth.uid();
  delete from public.public_streak_summary where user_id = auth.uid();
  delete from public.study_sessions where user_id = auth.uid();
  delete from public.focus_sessions where user_id = auth.uid();
  delete from public.milestones where user_id = auth.uid();
  delete from public.goals where user_id = auth.uid();
  delete from public.interview_rounds where user_id = auth.uid();
  delete from public.user_skills where user_id = auth.uid();
  delete from public.project_skills where user_id = auth.uid();
  delete from public.interview_attempts where user_id = auth.uid();
end;
$$;

grant execute on function public.reset_user_progress() to authenticated;
