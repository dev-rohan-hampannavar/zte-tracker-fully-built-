-- Keep starting phase identifiers tied to the correct curriculum model.
-- The legacy starting_phase_id still references public.phases(id). Detailed
-- tracks use their own phase table and must be stored separately.
alter table public.user_roadmaps
  add column if not exists starting_detailed_phase_id text
    references public.roadmap_phases(id) on delete set null;

comment on column public.user_roadmaps.starting_detailed_phase_id is
  'Personalized starting phase for a versioned detailed roadmap. Legacy '
  'starting_phase_id continues to reference public.phases(id).';
