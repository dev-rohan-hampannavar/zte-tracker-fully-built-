-- ============================================================================
-- FIX: race condition in daily_logs hour accumulation (use-daily-logs.ts,
-- logStudySession).
--
-- The client-side implementation was:
--
--   const { data: existing } = await supabase.from("daily_logs")
--     .select("hours,note").eq("user_id", userId).eq("date", date)
--     .maybeSingle();
--   const newHours = (existing?.hours ?? 0) + hours;
--   await supabase.from("daily_logs").upsert({ ..., hours: newHours }, ...);
--
-- This is a classic read-modify-write race: two concurrent calls (a
-- double-click on "log session", or two tabs/devices open at once) can
-- both SELECT the same starting `hours` value before either UPSERT lands.
-- The second write overwrites the first instead of adding to it — one
-- logged session's hours silently vanish from the daily total, which then
-- silently under-counts that day's streak/heatmap/weekly-hours figures
-- too, since they're all derived from this same row.
--
-- Fix: do the increment atomically inside a single SQL statement via a
-- SECURITY DEFINER function, the same way reset_user_progress() and
-- delete_own_account() already do in this codebase — no read/compute/
-- write round trip from the client, so there's nothing for a second
-- concurrent call to race against. `on conflict ... do update` performs
-- the read-and-increment as one atomic operation at the database level.
--
-- The date is passed in as a parameter (client's local todayISO()) rather
-- than using current_date, which would evaluate in the database server's
-- timezone — daily_logs.date is deliberately the user's own calendar day
-- (see the localDateISO comments in use-daily-logs.ts / utils.ts), and a
-- server-side current_date would silently reintroduce exactly the
-- day-boundary bug that code already works around.
-- ============================================================================

create or replace function public.log_study_session_hours(p_date date, p_hours numeric, p_note text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.daily_logs (user_id, date, hours, note, updated_at)
  values (auth.uid(), p_date, p_hours, p_note, now())
  on conflict (user_id, date) do update
    set hours = public.daily_logs.hours + excluded.hours,
        note = case
          when public.daily_logs.note is null or public.daily_logs.note = '' then excluded.note
          when excluded.note is null or excluded.note = '' then public.daily_logs.note
          else public.daily_logs.note || ' · ' || excluded.note
        end,
        updated_at = now();
end;
$$;

grant execute on function public.log_study_session_hours(date, numeric, text) to authenticated;
