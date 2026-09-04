-- User-controlled links are integrity-sensitive. NOT VALID preserves existing
-- historical rows while enforcing the safe protocol on every new row and
-- update; an operator can validate after remediating legacy invalid values.
alter table public.project_progress
  add constraint project_progress_github_url_http check (github_url is null or github_url ~* '^https?://[^[:space:]]+$') not valid,
  add constraint project_progress_deployment_url_http check (deployment_url is null or deployment_url ~* '^https?://[^[:space:]]+$') not valid,
  add constraint project_progress_demo_url_http check (demo_url is null or demo_url ~* '^https?://[^[:space:]]+$') not valid;

alter table public.advanced_project_progress
  add constraint advanced_project_progress_github_url_http check (github_url is null or github_url ~* '^https?://[^[:space:]]+$') not valid,
  add constraint advanced_project_progress_deployment_url_http check (deployment_url is null or deployment_url ~* '^https?://[^[:space:]]+$') not valid;

alter table public.build_in_public_status
  add constraint build_in_public_status_proof_url_http check (proof_url is null or proof_url ~* '^https?://[^[:space:]]+$') not valid;

alter table public.dsa_progress
  add constraint dsa_progress_url_http check (url is null or url ~* '^https?://[^[:space:]]+$') not valid;

alter table public.career_tracker
  add constraint career_tracker_job_url_http check (job_url is null or job_url ~* '^https?://[^[:space:]]+$') not valid;

alter table public.topic_resources
  add constraint topic_resources_url_http check (url ~* '^https?://[^[:space:]]+$') not valid;

alter table public.topic_progress
  add constraint topic_progress_evidence_url_http check (evidence_url is null or evidence_url ~* '^https?://[^[:space:]]+$') not valid;
