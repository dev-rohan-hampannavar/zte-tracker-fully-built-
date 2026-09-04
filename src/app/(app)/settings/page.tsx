"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useUser } from "@/lib/hooks/use-user";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useAllTopicNotes, updateTopicProgress, setTopicCompletion } from "@/lib/hooks/use-roadmap";
import { useUserSettings } from "@/lib/hooks/use-user-settings";
import { setNotificationKindMuted, type NotificationKind } from "@/lib/hooks/use-notifications";
import { useDailyLogs } from "@/lib/hooks/use-daily-logs";
import { useDsaProgress } from "@/lib/hooks/use-dsa";
import { useCareerTracker, useInterviewRounds } from "@/lib/hooks/use-career";
import { useProjectProgress, upsertProjectProgress } from "@/lib/hooks/use-projects";
import { useGoals } from "@/lib/hooks/use-goals";
import { useUserSkills } from "@/lib/hooks/use-skills";
import { useProjectSkills } from "@/lib/hooks/use-project-skills";
import { useInterviewAttempts } from "@/lib/hooks/use-interview-prep";
import { useAllProjectInterviewQuestions, useAllProjectInterviewAttempts, type ProjectInterviewQuestionRow, type ProjectInterviewAttemptRow } from "@/lib/hooks/use-project-interview-prep";
import { useTargetRoles, useJobReadiness } from "@/lib/hooks/use-job-readiness";
import { computeCareerMilestones } from "@/lib/career-milestones";
import { downloadCareerSummaryPdf } from "@/lib/career-summary-pdf";
import { useAllStudySessions } from "@/lib/hooks/use-study-sessions";
import { useAllFocusSessions } from "@/lib/hooks/use-focus-session";
import {
  useAllWeeklyCommitments,
  useAllTimeBlocks,
  useEvidenceItems,
  useFinancialProfile,
} from "@/lib/hooks/use-execution-os";
import { useBackupDomainData } from "@/lib/hooks/use-backup-data";
import { createClient } from "@/lib/supabase/client";
import { normalizeHttpUrl } from "@/lib/validate-url";
import { FadeUp } from "@/components/motion/primitives";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Download, Loader2, Sun, Moon, Monitor, Share2, Copy, Check, Upload, AlertTriangle, Trash2, RotateCcw, Mail } from "lucide-react";
import { useTheme } from "@/lib/hooks/use-theme";
import { useDeveloperMode } from "@/lib/hooks/use-developer-mode";
import { useTopicLockingDisabled } from "@/lib/hooks/use-topic-locking";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  TopicNote,
  DailyLog,
  DsaProgressRow,
  CareerTrackerRow,
  ProjectProgress,
  Goal,
  Milestone,
  InterviewRound,
  UserSkill,
  ProjectSkill,
  InterviewAttempt,
  StudySession,
  FocusSession,
  WeeklyCommitment,
  TimeBlock,
  EvidenceItem,
  FinancialProfile,
} from "@/types/database";


// One entry per NotificationKind (exhaustively — see use-notifications.ts)
// so the settings card can't silently omit a kind a person might actually
// want to mute.
const NOTIFICATION_KIND_OPTIONS: { kind: NotificationKind; label: string; description: string }[] = [
  { kind: "revision_overdue", label: "Revision overdue", description: "Topics past their spaced-repetition review date." },
  { kind: "milestone_pending", label: "ClientSync milestone pending", description: "A phase's roadmap topics are done but its deliverable isn't marked complete." },
  { kind: "ready_to_apply", label: "Ready to apply", description: "An exit-ladder tier just became fully complete." },
  { kind: "exit_almost_ready", label: "Exit tier almost ready", description: "An exit-ladder tier is 90%+ complete." },
  { kind: "project_inactive", label: "Project inactive", description: "An in-progress project hasn't been updated in 14+ days." },
  { kind: "daily_log_missing", label: "Daily log missing", description: "No study time logged yet today, with an active streak at risk." },
  { kind: "skill_stale", label: "Skill going stale", description: "A skill's evidence hasn't been refreshed recently." },
  { kind: "goal_deadline", label: "Goal deadline approaching", description: "An active goal is due within 7 days." },
  { kind: "interview_reminder", label: "Interview reminder", description: "A tracked interview is scheduled within 3 days." },
  { kind: "follow_up_reminder", label: "Application follow-up", description: "A follow-up date on an application has arrived or passed." },
  { kind: "career_milestone", label: "Career milestone reached", description: "A readiness checkpoint on the Milestones page was just reached." },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { data: settings, mutate, isLoading } = useUserSettings(user?.id);
  const { phases, mutateProgress } = usePhasesWithProgress(user?.id);
  const { data: logs, mutate: mutateLogs } = useDailyLogs(user?.id);
  const { data: dsa, mutate: mutateDsa } = useDsaProgress(user?.id);
  const { data: career, mutate: mutateCareer } = useCareerTracker(user?.id);
  const { data: notes, mutate: mutateNotes } = useAllTopicNotes(user?.id);
  const { data: projectProgress, mutate: mutateProjects } = useProjectProgress(user?.id);
  // Phases 1-6 domains — included in export/import so a backup is
  // actually complete, not just the original six tables from before
  // this build (see the migration comments patching reset_user_progress
  // each phase for the same "don't leave new data out of cross-cutting
  // features" reasoning applied here).
  const { data: goals, mutate: mutateGoals } = useGoals(user?.id);
  const { data: interviewRounds, mutate: mutateInterviewRounds } = useInterviewRounds(user?.id);
  const { data: userSkills, mutate: mutateUserSkills } = useUserSkills(user?.id);
  const { data: projectSkills, mutate: mutateProjectSkills } = useProjectSkills(user?.id);
  const { data: interviewAttempts, mutate: mutateInterviewAttempts } = useInterviewAttempts(user?.id);
  const { data: projectInterviewQuestions } = useAllProjectInterviewQuestions(user?.id);
  const { data: projectInterviewAttempts } = useAllProjectInterviewAttempts(user?.id);
  const { data: targetRoles } = useTargetRoles();
  const { breakdown: readinessBreakdown } = useJobReadiness(user?.id, targetRoles?.[0]);
  const { data: allStudySessions, mutate: mutateStudySessions } = useAllStudySessions(user?.id);
  const { data: allFocusSessions, mutate: mutateFocusSessions } = useAllFocusSessions(user?.id);
  const { data: weeklyCommitments, mutate: mutateWeeklyCommitments } = useAllWeeklyCommitments(user?.id);
  const { data: timeBlocks, mutate: mutateTimeBlocks } = useAllTimeBlocks(user?.id);
  const { data: evidenceItems, mutate: mutateEvidenceItems } = useEvidenceItems(user?.id);
  const { data: financialProfile, mutate: mutateFinancialProfile } = useFinancialProfile(user?.id);
  const { data: backupDomains, error: backupError, mutate: mutateBackupDomains, isLoading: backupLoading } = useBackupDomainData(user?.id);

  const [goalType, setGoalType] = useState<"hours" | "topics">("hours");
  const [goalValue, setGoalValue] = useState("20");
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme(user?.id);
  const { enabled: devMode, setEnabled: setDevMode } = useDeveloperMode(user?.id);
  const { disabled: topicLockingDisabled, setDisabled: setTopicLockingDisabled } = useTopicLockingDisabled(user?.id);
  const [publicToggling, setPublicToggling] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [weeklySummaryRecipientEmail, setWeeklySummaryRecipientEmail] = useState("");
  const [weeklySummaryRecipientName, setWeeklySummaryRecipientName] = useState("");
  const [weeklySummaryToggling, setWeeklySummaryToggling] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (settings) {
      // Syncing fetched (SWR) data into local editable-field state once it
      // arrives — there's no way to know these values during the initial
      // render, and they need to be local state (not just rendered directly)
      // because the fields are editable. Same legitimate category as the
      // remote-sync effects in use-theme.ts / use-developer-mode.ts /
      // use-topic-locking.ts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGoalType(settings.weekly_goal_type);
      setGoalValue(String(settings.weekly_goal_value));
      setDisplayName(settings.display_name ?? "");
      setBio(settings.public_profile_bio ?? "");
      setGithubUsername(settings.github_username ?? "");
      setWeeklySummaryRecipientEmail(settings.weekly_summary_recipient_email ?? "");
      setWeeklySummaryRecipientName(settings.weekly_summary_recipient_name ?? "");
    }
  }, [settings]);

  async function togglePublicProfile(enabled: boolean) {
    if (!user) return;
    setPublicToggling(true);
    const supabase = createClient();
    try {
      if (enabled && !settings?.public_profile_slug) {
        const { data: slug, error: slugErr } = (await supabase.rpc(
          "ensure_profile_slug" as never
        )) as { data: string | null; error: Error | null };
        if (slugErr) throw slugErr;
        const { error } = await supabase
          .from("user_settings")
          .update({ public_profile_enabled: true, public_profile_slug: slug } as never)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_settings")
          .update({ public_profile_enabled: enabled } as never)
          .eq("user_id", user.id);
        if (error) throw error;
      }
      await mutate();
      toast.success(enabled ? "Public profile enabled" : "Public profile disabled");
    } catch {
      toast.error("Couldn't update public profile setting.");
    } finally {
      setPublicToggling(false);
    }
  }

  async function saveDisplayName() {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("user_settings")
      .update({ display_name: displayName || null } as never)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Couldn't save display name.");
      return;
    }
    await mutate();
    toast.success("Display name saved");
  }

  async function saveBio() {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("user_settings")
      .update({ public_profile_bio: bio || null } as never)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Couldn't save bio.");
      return;
    }
    await mutate();
    toast.success("Bio saved");
  }

  async function saveGithubUsername() {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("user_settings")
      .update({ github_username: githubUsername || null } as never)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Couldn't save GitHub username.");
      return;
    }
    await mutate();
    toast.success("GitHub username saved");
  }

  async function saveWeeklySummaryRecipient() {
    if (!user) return;
    if (weeklySummaryRecipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(weeklySummaryRecipientEmail)) {
      toast.error("That doesn't look like a valid email address.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("user_settings")
      .update({
        weekly_summary_recipient_email: weeklySummaryRecipientEmail || null,
        weekly_summary_recipient_name: weeklySummaryRecipientName || null,
      } as never)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Couldn't save recipient.");
      return;
    }
    await mutate();
    toast.success("Recipient saved");
  }

  async function toggleWeeklySummary(enabled: boolean) {
    if (!user) return;
    if (enabled && !settings?.weekly_summary_recipient_email && !weeklySummaryRecipientEmail) {
      toast.error("Add a recipient email before turning this on.");
      return;
    }
    setWeeklySummaryToggling(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("user_settings")
      .update({ weekly_summary_enabled: enabled } as never)
      .eq("user_id", user.id);
    setWeeklySummaryToggling(false);
    if (error) {
      toast.error("Couldn't update weekly summary setting.");
      return;
    }
    await mutate();
    toast.success(enabled ? "Weekly summary enabled" : "Weekly summary disabled");
  }

  async function copyProfileLink() {
    if (!settings?.public_profile_slug) return;
    const url = `${window.location.origin}/u/${settings.public_profile_slug}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success("Link copied");
    setTimeout(() => setLinkCopied(false), 1500);
  }

  async function handleSaveGoal() {
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, weekly_goal_type: goalType, weekly_goal_value: parseInt(goalValue, 10) || 20 } as never,
        { onConflict: "user_id" }
      );
    setSaving(false);
    if (error) {
      toast.error("Couldn't save goal.");
      return;
    }
    await mutate();
    toast.success("Weekly goal updated");
  }

  // Versioned, flat export shape — deliberately not `{ phases, ... }` (the
  // old shape) since nested phase/topic data is derived/joined, not a raw
  // table a re-import could upsert against. Each key here maps 1:1 to a
  // table this person owns rows in, matching the plan's field list
  // (topic_progress, daily_logs, topic_notes, project_progress) plus the
  // two extra domains this app already tracks (dsa_progress, career_tracker).
  //
  // v4 adds canonical study events and the remaining user-owned domains
  // (daily-plan state, revision history, activity, resources, and public
  // streak projection). Older exports remain importable (missing keys are
  // simply skipped).
  // v3 adds the Execution OS planning/evidence/financial domains. A v2
  // export is still importable (older keys are simply absent).
  // v2 adds every per-user domain from the Goals/Focus-Timer/Career-CRM/
  // Skill-Evidence/Project-Skills/Interview-Prep phases of the Career OS
  // build — a v1 export is still importable (older keys are just absent
  // and the import loop below no-ops on missing keys), but a v1 export
  // taken today would silently miss real user data, which is exactly what
  // rule #19 ("never allow a user to lose their data because of a UI
  // operation") means to prevent.
  const EXPORT_VERSION = 4;

  function buildExportPayload() {
    const topicProgress = phases.flatMap((p) =>
      p.topics
        .filter((t) => t.progress)
        .map((t) => ({ ...t.progress, topic_id: t.id }))
    );
    return {
      export_version: EXPORT_VERSION,
      exported_at: new Date().toISOString(),
      topic_progress: topicProgress,
      daily_logs: logs ?? [],
      topic_notes: notes ?? [],
      project_progress: projectProgress ?? [],
      dsa_progress: dsa ?? [],
      career_tracker: career ?? [],
      goals: goals ?? [],
      // milestones are nested inside each GoalWithMilestones from useGoals;
      // flattened here since the import path (and the milestones table
      // itself) is keyed independently of its parent goal's shape.
      milestones: (goals ?? []).flatMap((g) => g.milestones),
      interview_rounds: interviewRounds ?? [],
      user_skills: userSkills ?? [],
      project_skills: projectSkills ?? [],
      interview_attempts: interviewAttempts ?? [],
      project_interview_questions: projectInterviewQuestions ?? [],
      project_interview_attempts: projectInterviewAttempts ?? [],
      study_sessions: allStudySessions ?? [],
      focus_sessions: allFocusSessions ?? [],
      weekly_commitments: weeklyCommitments ?? [],
      time_blocks: timeBlocks ?? [],
      evidence_items: evidenceItems ?? [],
      // useFinancialProfile intentionally returns a safe empty object when
      // no row exists; omit that synthetic object from exports.
      financial_profile:
        financialProfile && financialProfile.updated_at !== new Date(0).toISOString()
          ? financialProfile
          : null,
      ...backupDomains,
    };
  }

  function exportJSON() {
    downloadFile(JSON.stringify(buildExportPayload(), null, 2), "zte-tracker-export.json", "application/json");
    toast.success("JSON export downloaded");
  }

  function exportCSV() {
    const allTopics = phases.flatMap((p) =>
      p.topics.map((t) => ({
        phase: p.phase_number,
        phase_title: p.title,
        topic: t.title,
        completed: t.progress?.completed ?? false,
        completed_at: t.progress?.completed_at ?? "",
        difficulty: t.progress?.difficulty ?? "",
        bookmarked: t.progress?.bookmarked ?? false,
      }))
    );
    const header = "phase,phase_title,topic,completed,completed_at,difficulty,bookmarked";
    const rows = allTopics.map((t) =>
      [t.phase, `"${t.phase_title.replace(/"/g, '""')}"`, `"${t.topic.replace(/"/g, '""')}"`, t.completed, t.completed_at, t.difficulty, t.bookmarked].join(",")
    );
    downloadFile([header, ...rows].join("\n"), "zte-tracker-progress.csv", "text/csv");
    toast.success("CSV export downloaded");
  }

  function exportPDF() {
    const realApplications = (career ?? []).filter((a) => a.application_status !== "wishlist");
    const projectsShipped = (projectProgress ?? []).filter(
      (p) => p.status === "completed" && (p.github_url || p.deployment_url)
    ).length;
    const dsaSolved = (dsa ?? []).filter((d) => d.completed).length;
    const topicsCompleted = phases.reduce((s, p) => s + p.topics.filter((t) => t.progress?.completed).length, 0);
    const totalTopics = phases.reduce((s, p) => s + p.topics.length, 0);
    const milestonesReached = computeCareerMilestones({
      phasesCompleted: phases.filter((p) => p.topics.length > 0 && p.topics.every((t) => t.progress?.completed)).length,
      totalPhases: phases.length,
      projectsShipped,
      dsaCompleted: dsaSolved,
      overallReadinessPct: readinessBreakdown?.overallPct ?? null,
      hasUsedResumeVersion: realApplications.some((a) => a.resume_version && a.resume_version.trim().length > 0),
      applicationsSubmitted: realApplications.length,
      mockInterviewAttempts: (interviewAttempts ?? []).length,
      offersReceived: realApplications.filter((a) => a.offer).length,
    }).filter((m) => m.reached);

    downloadCareerSummaryPdf({
      displayName: settings?.display_name ?? null,
      phasesCompleted: phases.filter((p) => p.topics.length > 0 && p.topics.every((t) => t.progress?.completed)).length,
      totalPhases: phases.length,
      topicsCompleted,
      totalTopics,
      dsaSolved,
      projectsShipped,
      applicationsSubmitted: realApplications.length,
      offersReceived: realApplications.filter((a) => a.offer).length,
      readinessPct: readinessBreakdown?.overallPct ?? null,
      readinessRoleName: readinessBreakdown?.roleName ?? null,
      milestonesReached: milestonesReached.map((m) => ({ label: m.label, description: m.description })),
    });
    toast.success("PDF summary downloaded");
  }

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Import ---------------------------------------------------------
  // Upserts each domain back in via the same upsert helpers/conflict keys
  // the rest of the app already uses to write these tables, so a re-import
  // behaves identically to the person re-doing those actions by hand — it
  // overwrites matching rows (same user_id + natural key) and leaves
  // everything else untouched.

  type ImportPayload = {
    export_version?: number;
    topic_progress?: Array<Record<string, unknown> & { topic_id: string }>;
    daily_logs?: DailyLog[];
    topic_notes?: TopicNote[];
    project_progress?: ProjectProgress[];
    dsa_progress?: DsaProgressRow[];
    career_tracker?: CareerTrackerRow[];
    goals?: Goal[];
    milestones?: Milestone[];
    interview_rounds?: InterviewRound[];
    user_skills?: UserSkill[];
    project_skills?: ProjectSkill[];
    interview_attempts?: InterviewAttempt[];
    project_interview_questions?: ProjectInterviewQuestionRow[];
    project_interview_attempts?: ProjectInterviewAttemptRow[];
    study_sessions?: StudySession[];
    focus_sessions?: FocusSession[];
    weekly_commitments?: WeeklyCommitment[];
    time_blocks?: TimeBlock[];
    evidence_items?: EvidenceItem[];
    financial_profile?: FinancialProfile | null;
    advanced_project_progress?: Array<Record<string, unknown>>;
    exercise_progress?: Array<Record<string, unknown>>;
    build_in_public_status?: Array<Record<string, unknown>>;
    manual_item_checks?: Array<Record<string, unknown>>;
    revision_history?: Array<Record<string, unknown>>;
    career_decisions?: Array<Record<string, unknown>>;
    topic_resources?: Array<Record<string, unknown>>;
    daily_plan_task_state?: Array<Record<string, unknown>>;
    activity_log?: Array<Record<string, unknown>>;
    study_events?: Array<Record<string, unknown>>;
    public_streak_summary?: Array<Record<string, unknown>>;
  };

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPayload | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleImportFileSelected(file: File) {
    setImportFile(file);
    setImportError(null);
    setImportPreview(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ImportPayload;
      if (!parsed || typeof parsed !== "object") throw new Error("not an object");
      setImportPreview(parsed);
    } catch {
      setImportError("This doesn't look like a valid ZTE Tracker export file — couldn't parse it as JSON.");
    }
  }

  async function runImport() {
    if (!user || !importPreview) return;
    setImporting(true);
    const supabase = createClient();
    let failures = 0;

    try {
      // topic_progress — upsert per row via the same helper the roadmap
      // page uses, keyed on (user_id, topic_id).
      for (const row of importPreview.topic_progress ?? []) {
        try {
          const { topic_id, user_id: _u, completed, completed_at, next_review_due, revision_status, ...patch } = row as Record<string, unknown> & { topic_id: string };
          void _u;
          if (typeof completed === "boolean") {
            await setTopicCompletion(
              user.id,
              topic_id,
              completed,
              typeof completed_at === "string" ? completed_at : null,
              typeof next_review_due === "string" ? next_review_due : null,
              typeof revision_status === "string" ? revision_status as never : null,
            );
          }
          if (Object.keys(patch).length) await updateTopicProgress(user.id, topic_id, patch as never);
        } catch (err) {
          // Previously swallowed silently — the failure toast below told
          // users to "see console for details" but nothing was ever
          // actually logged there, so that instruction pointed at an
          // empty console. Logging the real error makes that message true.
          console.error("Import: failed to restore topic_progress row", row, err);
          failures++;
        }
      }

      // daily_logs — full-row upsert keyed on (user_id, date); this is a
      // raw table write rather than the narrower logStudySession/
      // saveJournalEntry helpers, since those merge into today's row by
      // design and an import needs to restore historical dates as-is.
      if ((importPreview.daily_logs ?? []).length) {
        const rows = (importPreview.daily_logs ?? []).map((log) => ({ ...log, user_id: user.id }));
        const { error } = await supabase.from("daily_logs").upsert(rows as never, { onConflict: "user_id,date" });
        if (error) {
          console.error("Import: failed to restore daily_logs rows", error);
          failures++;
        }
      }

      // topic_notes — has its own id; upsert on id so re-importing the
      // same file doesn't create duplicate notes.
      if ((importPreview.topic_notes ?? []).length) {
        const rows = (importPreview.topic_notes ?? []).map((note) => ({ ...note, user_id: user.id }));
        const { error } = await supabase.from("topic_notes").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore topic_notes rows", error);
          failures++;
        }
      }

      // project_progress — same helper/conflict key as the Projects and
      // ClientSync pages use.
      for (const row of importPreview.project_progress ?? []) {
        try {
          const { phase_id, user_id: _u, ...patch } = row as ProjectProgress;
          void _u;
          await upsertProjectProgress(user.id, phase_id, patch as never);
        } catch (err) {
          console.error("Import: failed to restore project_progress row", row, err);
          failures++;
        }
      }

      // dsa_progress — upsert on id (not addDsaProblem, which always
      // inserts and would duplicate every problem on re-import).
      if ((importPreview.dsa_progress ?? []).length) {
        const rows = (importPreview.dsa_progress ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("dsa_progress").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore dsa_progress rows", error);
          failures++;
        }
      }

      // career_tracker — upsert on id, same reasoning as dsa_progress.
      if ((importPreview.career_tracker ?? []).length) {
        const rows = (importPreview.career_tracker ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("career_tracker").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore career_tracker rows", error);
          failures++;
        }
      }

      // goals — upsert on id. Milestones are restored separately below
      // (they reference goal_id, so goals must land first — same
      // dependency ordering the FK itself enforces).
      if ((importPreview.goals ?? []).length) {
        const rows = (importPreview.goals ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("goals").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore goals rows", error);
          failures++;
        }
      }

      // milestones — upsert on id, after goals (FK dependency).
      if ((importPreview.milestones ?? []).length) {
        const rows = (importPreview.milestones ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("milestones").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore milestones rows", error);
          failures++;
        }
      }

      // interview_rounds — upsert on id, references career_tracker
      // (already restored above).
      if ((importPreview.interview_rounds ?? []).length) {
        const rows = (importPreview.interview_rounds ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("interview_rounds").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore interview_rounds rows", error);
          failures++;
        }
      }

      // user_skills — upsert on id.
      if ((importPreview.user_skills ?? []).length) {
        const rows = (importPreview.user_skills ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("user_skills").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore user_skills rows", error);
          failures++;
        }
      }

      // project_skills — upsert on id.
      if ((importPreview.project_skills ?? []).length) {
        const rows = (importPreview.project_skills ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("project_skills").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore project_skills rows", error);
          failures++;
        }
      }

      // interview_attempts — upsert on id, references interview_questions
      // (global reference data, not exported/imported — always present).
      if ((importPreview.interview_attempts ?? []).length) {
        const rows = (importPreview.interview_attempts ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("interview_attempts").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore interview_attempts rows", error);
          failures++;
        }
      }

      // project_interview_questions — upsert on id, must restore BEFORE
      // project_interview_attempts since attempts FK-reference questions
      // (unlike interview_attempts above, this reference data is
      // per-user, not global, so it has to be restored here rather than
      // assumed present).
      if ((importPreview.project_interview_questions ?? []).length) {
        const rows = (importPreview.project_interview_questions ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("project_interview_questions").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore project_interview_questions rows", error);
          failures++;
        }
      }

      // project_interview_attempts — upsert on id, references
      // project_interview_questions restored just above.
      if ((importPreview.project_interview_attempts ?? []).length) {
        const rows = (importPreview.project_interview_attempts ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("project_interview_attempts").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore project_interview_attempts rows", error);
          failures++;
        }
      }

      // study_sessions — upsert on id.
      if ((importPreview.study_sessions ?? []).length) {
        const rows = (importPreview.study_sessions ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("study_sessions").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore study_sessions rows", error);
          failures++;
        }
      }

      // focus_sessions — upsert on id.
      if ((importPreview.focus_sessions ?? []).length) {
        const rows = (importPreview.focus_sessions ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("focus_sessions").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore focus_sessions rows", error);
          failures++;
        }
      }

      // Execution OS — all rows are user-scoped by RLS; overwrite by id so
      // restoring the same backup remains idempotent. The financial profile
      // is a one-row upsert and is deliberately restored last.
      if ((importPreview.weekly_commitments ?? []).length) {
        const rows = (importPreview.weekly_commitments ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("weekly_commitments").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore weekly_commitments rows", error);
          failures++;
        }
      }

      if ((importPreview.time_blocks ?? []).length) {
        const rows = (importPreview.time_blocks ?? []).map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from("time_blocks").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore time_blocks rows", error);
          failures++;
        }
      }

      if ((importPreview.evidence_items ?? []).length) {
        const rows = (importPreview.evidence_items ?? []).map((row) => ({
          ...row,
          user_id: user.id,
          // Re-validate URLs on restore so a hand-edited export cannot
          // bypass the same scheme/credential checks used by the Evidence UI.
          url: normalizeHttpUrl(row.url),
        }));
        const { error } = await supabase.from("evidence_items").upsert(rows as never, { onConflict: "id" });
        if (error) {
          console.error("Import: failed to restore evidence_items rows", error);
          failures++;
        }
      }

      if (importPreview.financial_profile) {
        const { error } = await supabase
          .from("financial_profiles")
          .upsert({ ...importPreview.financial_profile, user_id: user.id } as never, { onConflict: "user_id" });
        if (error) {
          console.error("Import: failed to restore financial_profile", error);
          failures++;
        }
      }

      const restoreRows = async (key: keyof ImportPayload, table: string, conflict: string) => {
        const values = importPreview[key];
        if (!Array.isArray(values) || values.length === 0) return;
        const rows = values.map((row) => ({ ...(row as Record<string, unknown>), user_id: user.id }));
        const { error } = await supabase.from(table as never).upsert(rows as never, { onConflict: conflict });
        if (error) {
          console.error(`Import: failed to restore ${table} rows`, error);
          failures++;
        }
      };

      // Remaining user-owned domains. Dependency order matters: study
      // sessions are restored above before daily-plan task state and DSA
      // progress before study events.
      await restoreRows("advanced_project_progress", "advanced_project_progress", "user_id,project_id");
      await restoreRows("exercise_progress", "exercise_progress", "user_id,exercise_id");
      await restoreRows("build_in_public_status", "build_in_public_status", "user_id,phase_id");
      await restoreRows("manual_item_checks", "manual_item_checks", "user_id,day_number,section_title,item_index");
      await restoreRows("revision_history", "revision_history", "id");
      await restoreRows("career_decisions", "career_decisions", "id");
      await restoreRows("topic_resources", "topic_resources", "id");
      await restoreRows("daily_plan_task_state", "daily_plan_task_state", "user_id,plan_date,task_key");
      await restoreRows("activity_log", "activity_log", "id");
      await restoreRows("study_events", "study_events", "id");
      await restoreRows("public_streak_summary", "public_streak_summary", "user_id");

      await Promise.all([mutateProgress(), mutateLogs(), mutateNotes(), mutateProjects(), mutateDsa(), mutateCareer(), mutateGoals(), mutateInterviewRounds(), mutateUserSkills(), mutateProjectSkills(), mutateInterviewAttempts(), mutateStudySessions(), mutateFocusSessions(), mutateWeeklyCommitments(), mutateTimeBlocks(), mutateEvidenceItems(), mutateFinancialProfile()]);
      await mutateBackupDomains();

      if (failures > 0) {
        toast.error(
          `Import finished, but ${failures} row${failures === 1 ? "" : "s"} couldn't be restored — check the browser console for details.`
        );
      } else {
        toast.success("Import complete");
      }
      setImportOpen(false);
      setImportFile(null);
      setImportPreview(null);
    } catch {
      toast.error("Import failed.");
    } finally {
      setImporting(false);
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  // --- Reset progress / Delete account ----------------------------------
  // Both call security-definer RPCs scoped to auth.uid() on the backend
  // (see migration 0017) rather than deleting rows from the client, since
  // delete_own_account needs to touch auth.users, which the client's
  // anon/authenticated role can't do directly.
  async function handleResetProgress() {
    if (!user) return;
    setResetting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("reset_user_progress" as never);
    setResetting(false);
    if (error) {
      toast.error("Couldn't reset progress. Try again.");
      return;
    }
    await Promise.all([mutateProgress(), mutateLogs(), mutateNotes(), mutateProjects(), mutateDsa(), mutateCareer(), mutateGoals(), mutateInterviewRounds(), mutateUserSkills(), mutateProjectSkills(), mutateInterviewAttempts(), mutateStudySessions(), mutateFocusSessions(), mutateWeeklyCommitments(), mutateTimeBlocks(), mutateEvidenceItems(), mutateFinancialProfile()]);
    setResetOpen(false);
    setResetConfirmText("");
    toast.success("Progress reset");
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_own_account" as never);
    if (error) {
      setDeleting(false);
      toast.error("Couldn't delete account. Try again.");
      return;
    }
    await supabase.auth.signOut();
    // Hard navigation after account deletion — same reasoning as the
    // sidebar/mobile-nav sign-out fix: guarantees no stale state from the
    // now-deleted account lingers in memory.
    router.replace("/login");
  }


  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <FadeUp>
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted mt-1">Goals, export, and preferences.</p>
      </div>
      </FadeUp>

      <Card>
        <CardHeader>
          <CardTitle>Weekly goal</CardTitle>
          <CardDescription>Track against hours or topics per week.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div>
            <Label htmlFor="weekly-goal-type">Type</Label>
            <Select value={goalType} onValueChange={(v) => setGoalType(v as "hours" | "topics")}>
              <SelectTrigger id="weekly-goal-type" className="mt-1 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="topics">Topics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="weekly-goal-target">Target</Label>
            <Input
              id="weekly-goal-target"
              type="number"
              className="mt-1 w-28"
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveGoal} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Light, dark, or follow your system.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {(
            [
              { value: "light" as const, label: "Light", icon: Sun },
              { value: "dark" as const, label: "Dark", icon: Moon },
              { value: "system" as const, label: "System", icon: Monitor },
            ]
          ).map((opt) => (
            <Button
              key={opt.value}
              variant={theme === opt.value ? "default" : "secondary"}
              size="sm"
              onClick={() => setTheme(opt.value)}
            >
              <opt.icon className="h-4 w-4" /> {opt.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Developer mode</CardTitle>
          <CardDescription>
            Show raw internal IDs (phase, topic, stage) throughout the app, for debugging or curiosity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="dev-mode-toggle" className="text-sm font-normal">
              Enable developer mode
            </Label>
            <Switch id="dev-mode-toggle" checked={devMode} onCheckedChange={setDevMode} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topic locking</CardTitle>
          <CardDescription>
            By default, a topic within a stage is locked until the previous topic in that stage is
            marked complete. Disable this if you want to work out of order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="topic-lock-toggle" className="text-sm font-normal">
              Disable topic locking
            </Label>
            <Switch
              id="topic-lock-toggle"
              checked={topicLockingDisabled}
              onCheckedChange={setTopicLockingDisabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Turn off any notification type entirely — separate from dismissing or snoozing an individual one from
            the bell.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {NOTIFICATION_KIND_OPTIONS.map((opt) => {
            const muted = (settings?.muted_notification_kinds ?? []).includes(opt.kind);
            return (
              <div key={opt.kind} className="flex items-center justify-between">
                <div>
                  <Label htmlFor={`notif-${opt.kind}`} className="text-sm font-normal">
                    {opt.label}
                  </Label>
                  <p className="text-xs text-muted">{opt.description}</p>
                </div>
                <Switch
                  id={`notif-${opt.kind}`}
                  checked={!muted}
                  onCheckedChange={async (checked) => {
                    if (!user) return;
                    try {
                      await setNotificationKindMuted(user.id, opt.kind, !checked);
                      mutate();
                    } catch {
                      toast.error("Couldn't update notification setting.");
                    }
                  }}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export & backup</CardTitle>
          <CardDescription>Download your progress data, or restore it from a previous export.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={exportJSON} disabled={backupLoading || !!backupError}>
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button variant="secondary" onClick={exportCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="secondary" onClick={exportPDF}>
              <Download className="h-4 w-4" /> Export PDF summary
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import JSON
            </Button>
          </div>
          <p className="text-xs text-muted">
            Import expects a JSON file downloaded from &quot;Export JSON&quot; above. It restores
            topic progress, daily logs, notes, project links, DSA problems, career tracker,
            Execution OS commitments/time blocks/evidence, and financial runway settings —
            matching rows are overwritten, nothing else is touched.
          </p>
          {backupError && (
            <p className="text-xs text-destructive">
              Backup is temporarily unavailable. Apply the latest Supabase migrations, then reload this page before exporting.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={(open) => {
        setImportOpen(open);
        if (!open) {
          setImportFile(null);
          setImportPreview(null);
          setImportError(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Import data
            </DialogTitle>
            <DialogDescription>
              Choose a JSON file exported from this app. Rows matching your existing progress
              (by topic, date, note, project, problem, or application) will be overwritten.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFileSelected(file);
              }}
            />

            {importError && (
              <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {importError}
              </div>
            )}

            {importPreview && !importError && (
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  This will overwrite any existing rows that match by topic, date, note, project,
                  problem, or application. This can&apos;t be undone.
                </div>
                <div className="rounded-md border border-border px-3 py-2 text-xs text-muted flex flex-col gap-1">
                  <p>{importFile?.name}</p>
                  <p>{(importPreview.topic_progress ?? []).length} topic progress rows</p>
                  <p>{(importPreview.daily_logs ?? []).length} daily logs</p>
                  <p>{(importPreview.topic_notes ?? []).length} notes</p>
                  <p>{(importPreview.project_progress ?? []).length} project links</p>
                  <p>{(importPreview.dsa_progress ?? []).length} DSA problems</p>
                  <p>{(importPreview.career_tracker ?? []).length} career tracker entries</p>
                  {(importPreview.goals ?? []).length > 0 && <p>{importPreview.goals!.length} goals</p>}
                  {(importPreview.milestones ?? []).length > 0 && <p>{importPreview.milestones!.length} milestones</p>}
                  {(importPreview.interview_rounds ?? []).length > 0 && (
                    <p>{importPreview.interview_rounds!.length} interview rounds</p>
                  )}
                  {(importPreview.user_skills ?? []).length > 0 && <p>{importPreview.user_skills!.length} declared skills</p>}
                  {(importPreview.project_skills ?? []).length > 0 && (
                    <p>{importPreview.project_skills!.length} project skill links</p>
                  )}
                  {(importPreview.interview_attempts ?? []).length > 0 && (
                    <p>{importPreview.interview_attempts!.length} interview practice attempts</p>
                  )}
                  {(importPreview.project_interview_questions ?? []).length > 0 && (
                    <p>{importPreview.project_interview_questions!.length} project-based interview questions</p>
                  )}
                  {(importPreview.project_interview_attempts ?? []).length > 0 && (
                    <p>{importPreview.project_interview_attempts!.length} project-based practice attempts</p>
                  )}
                  {(importPreview.study_sessions ?? []).length > 0 && (
                    <p>{importPreview.study_sessions!.length} study sessions</p>
                  )}
                  {(importPreview.focus_sessions ?? []).length > 0 && (
                    <p>{importPreview.focus_sessions!.length} focus sessions</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={runImport} disabled={!importPreview || !!importError || importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import & overwrite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            <Share2 className="h-4 w-4" /> Public profile
          </CardTitle>
          <CardDescription>
            Share a read-only page showing completed phases, DSA stats, shipped projects, your
            build-in-public post history, and study streak — application data and journal
            entries stay private.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="public-toggle" className="text-sm font-normal">
              Enable public profile
            </Label>
            <Switch
              id="public-toggle"
              checked={settings?.public_profile_enabled ?? false}
              disabled={publicToggling}
              onCheckedChange={togglePublicProfile}
            />
          </div>
          <div>
            <Label htmlFor="display-name-input">Display name (shown on profile instead of your email)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="display-name-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Rohan K."
              />
              <Button variant="secondary" size="sm" onClick={saveDisplayName}>
                Save
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="profile-bio-input">Bio (shown at the top of your public profile)</Label>
            <Textarea
              id="profile-bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder='e.g. "BCA grad building in public toward a full-stack role. Self-taught, shipping projects weekly."'
              className="mt-1 min-h-20"
              maxLength={280}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted">{bio.length}/280</span>
              <Button variant="secondary" size="sm" onClick={saveBio}>
                Save
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="github-username-input">GitHub username (shows recent public activity on your profile)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="github-username-input"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="e.g. rohan-dev"
              />
              <Button variant="secondary" size="sm" onClick={saveGithubUsername}>
                Save
              </Button>
            </div>
          </div>
          {settings?.public_profile_enabled && settings?.public_profile_slug && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
                <code className="text-xs flex-1 truncate text-muted">
                  /u/{settings.public_profile_slug}
                </code>
                <Button variant="ghost" size="sm" onClick={copyProfileLink}>
                  {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted">
                JSON API for embedding these stats elsewhere:{" "}
                <code className="text-[11px]">/api/public/{settings.public_profile_slug}</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Weekly summary email
          </CardTitle>
          <CardDescription>
            Every Sunday, send a recap of the week — hours logged, topics finished, and your
            streak — to someone who&rsquo;d want to see it. Journal entries and application data are
            never included.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="weekly-summary-toggle" className="text-sm font-normal">
              Send weekly summary
            </Label>
            <Switch
              id="weekly-summary-toggle"
              checked={settings?.weekly_summary_enabled ?? false}
              disabled={weeklySummaryToggling}
              onCheckedChange={toggleWeeklySummary}
            />
          </div>
          <div>
            <Label htmlFor="weekly-summary-recipient-name">Recipient name (optional, used as &ldquo;Hi ___,&rdquo;)</Label>
            <Input
              id="weekly-summary-recipient-name"
              value={weeklySummaryRecipientName}
              onChange={(e) => setWeeklySummaryRecipientName(e.target.value)}
              placeholder="e.g. Dad"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="weekly-summary-recipient-email">Recipient email</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="weekly-summary-recipient-email"
                type="email"
                value={weeklySummaryRecipientEmail}
                onChange={(e) => setWeeklySummaryRecipientEmail(e.target.value)}
                placeholder="e.g. dad@example.com"
              />
              <Button variant="secondary" size="sm" onClick={saveWeeklySummaryRecipient}>
                Save
              </Button>
            </div>
          </div>
          {settings?.weekly_summary_last_sent_at && (
            <p className="text-xs text-muted">
              Last sent{" "}
              {new Date(settings.weekly_summary_last_sent_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Signed in as {user?.email}</p>
        </CardContent>
      </Card>

      <Card className="border-danger/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-danger">
            <AlertTriangle className="h-4 w-4" /> Danger zone
          </CardTitle>
          <CardDescription>These actions can&apos;t be undone.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Reset your progress</p>
              <p className="text-xs text-muted mt-0.5">
                Clears topic progress, daily logs, notes, project links, DSA problems, and career
                tracker entries. Your account, theme, and other preferences stay as they are.
              </p>
            </div>
            <Button variant="outline" onClick={() => setResetOpen(true)} className="shrink-0">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
            <div>
              <p className="text-sm font-medium">Delete your account</p>
              <p className="text-xs text-muted mt-0.5">
                Permanently deletes your account and everything tied to it. There&apos;s no way to
                recover this afterward.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              className="shrink-0 border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) setResetConfirmText("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <RotateCcw className="h-4 w-4" /> Reset your progress?
            </DialogTitle>
            <DialogDescription>
              This clears topic progress, daily logs, notes, project links, DSA problems, and
              career tracker entries. This can&apos;t be undone — consider exporting a backup
              first from the Export &amp; backup section above.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-confirm" className="text-xs">
              Type <span className="font-mono font-semibold">reset</span> to confirm
            </Label>
            <Input
              id="reset-confirm"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="reset"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetProgress}
              disabled={resetConfirmText.trim().toLowerCase() !== "reset" || resetting}
            >
              {resetting && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteConfirmText("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <Trash2 className="h-4 w-4" /> Delete your account?
            </DialogTitle>
            <DialogDescription>
              This permanently deletes your account, sign-in, and everything tied to it — progress,
              logs, notes, and settings. There&apos;s no way to recover this afterward.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-confirm" className="text-xs">
              Type <span className="font-mono font-semibold">delete</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="delete"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText.trim().toLowerCase() !== "delete" || deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
