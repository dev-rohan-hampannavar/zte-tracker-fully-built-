-- Make final onboarding submission a single transaction. Draft saves remain
-- resumable client upserts; the final answer snapshot, enrollment, and the
-- trigger-updated user_settings flags now commit or roll back together.
create or replace function public.complete_onboarding(
  p_user_id uuid,
  p_answers jsonb,
  p_roadmap_id text,
  p_roadmap_version_id uuid,
  p_starting_phase_id text,
  p_starting_detailed_phase_id text,
  p_dsa_easy_target int,
  p_dsa_medium_target int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  expected_roadmap_id text;
  current_version_id uuid;
  active_enrollment_id uuid;
  existing_skills_value text[];
  completion_time timestamptz := now();
begin
  if caller is null or p_user_id is null or caller <> p_user_id then
    raise exception 'authenticated user mismatch';
  end if;
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'onboarding answers must be a JSON object';
  end if;

  perform pg_advisory_xact_lock(hashtext(caller::text));

  select a.roadmap_id into expected_roadmap_id
  from public.role_roadmap_assignments a
  where a.role_id = nullif(p_answers ->> 'target_role_id', '')
  order by a.priority asc
  limit 1;
  expected_roadmap_id := coalesce(expected_roadmap_id, 'zte-core-v1');
  if p_roadmap_id is distinct from expected_roadmap_id then
    raise exception 'selected roadmap no longer matches the target role';
  end if;

  if not exists (select 1 from public.roadmaps r where r.id = p_roadmap_id) then
    raise exception 'selected roadmap does not exist';
  end if;

  if p_roadmap_id = 'zte-core-v1' then
    if p_roadmap_version_id is not null or p_starting_detailed_phase_id is not null then
      raise exception 'legacy curriculum enrollment cannot use a detailed phase or version';
    end if;
    if p_starting_phase_id is not null and not exists (
      select 1 from public.phases p where p.id = p_starting_phase_id
    ) then
      raise exception 'recommended legacy starting phase does not exist';
    end if;
  else
    select v.id into current_version_id
    from public.roadmap_versions v
    where v.roadmap_id = p_roadmap_id and v.is_current
    for share;
    if current_version_id is null or p_roadmap_version_id is distinct from current_version_id then
      raise exception 'selected roadmap version is no longer current';
    end if;
    if p_starting_phase_id is not null then
      raise exception 'detailed curriculum enrollment cannot use a legacy starting phase';
    end if;
    if p_starting_detailed_phase_id is not null and not exists (
      select 1 from public.roadmap_phases p
      where p.id = p_starting_detailed_phase_id
        and p.roadmap_id = p_roadmap_id
        and p.roadmap_version_id = current_version_id
    ) then
      raise exception 'recommended detailed starting phase is not in the selected version';
    end if;
  end if;

  if jsonb_typeof(p_answers -> 'existing_skills') = 'array' then
    select array_agg(skill) into existing_skills_value
    from jsonb_array_elements_text(p_answers -> 'existing_skills') as skills(skill);
  else
    existing_skills_value := null;
  end if;

  insert into public.onboarding_responses (
    user_id, goal, goal_other, target_role_id, experience_level,
    existing_skills, weekly_hours, target_date, existing_projects_note,
    dsa_level, interview_readiness, career_situation, completed_at
  ) values (
    caller,
    nullif(p_answers ->> 'goal', ''),
    nullif(p_answers ->> 'goal_other', ''),
    nullif(p_answers ->> 'target_role_id', ''),
    nullif(p_answers ->> 'experience_level', ''),
    existing_skills_value,
    nullif(p_answers ->> 'weekly_hours', '')::numeric,
    nullif(p_answers ->> 'target_date', '')::date,
    nullif(p_answers ->> 'existing_projects_note', ''),
    nullif(p_answers ->> 'dsa_level', ''),
    nullif(p_answers ->> 'interview_readiness', ''),
    nullif(p_answers ->> 'career_situation', ''),
    completion_time
  )
  on conflict (user_id) do update set
    goal = excluded.goal,
    goal_other = excluded.goal_other,
    target_role_id = excluded.target_role_id,
    experience_level = excluded.experience_level,
    existing_skills = excluded.existing_skills,
    weekly_hours = excluded.weekly_hours,
    target_date = excluded.target_date,
    existing_projects_note = excluded.existing_projects_note,
    dsa_level = excluded.dsa_level,
    interview_readiness = excluded.interview_readiness,
    career_situation = excluded.career_situation,
    completed_at = completion_time;

  select enrollment.id into active_enrollment_id
  from public.user_roadmaps enrollment
  where enrollment.user_id = caller and enrollment.status = 'active'
  for update;

  if active_enrollment_id is null then
    insert into public.user_roadmaps (
      user_id, roadmap_id, roadmap_version_id, target_date, weekly_hours,
      status, starting_phase_id, starting_detailed_phase_id,
      dsa_easy_target, dsa_medium_target
    ) values (
      caller, p_roadmap_id, p_roadmap_version_id,
      nullif(p_answers ->> 'target_date', '')::date,
      nullif(p_answers ->> 'weekly_hours', '')::numeric,
      'active', p_starting_phase_id, p_starting_detailed_phase_id,
      p_dsa_easy_target, p_dsa_medium_target
    );
  else
    update public.user_roadmaps set
      roadmap_id = p_roadmap_id,
      roadmap_version_id = p_roadmap_version_id,
      target_date = nullif(p_answers ->> 'target_date', '')::date,
      weekly_hours = nullif(p_answers ->> 'weekly_hours', '')::numeric,
      starting_phase_id = p_starting_phase_id,
      starting_detailed_phase_id = p_starting_detailed_phase_id,
      dsa_easy_target = p_dsa_easy_target,
      dsa_medium_target = p_dsa_medium_target
    where id = active_enrollment_id;
  end if;
end;
$$;

revoke all on function public.complete_onboarding(uuid, jsonb, text, uuid, text, text, int, int) from public, anon;
grant execute on function public.complete_onboarding(uuid, jsonb, text, uuid, text, text, int, int) to authenticated;
