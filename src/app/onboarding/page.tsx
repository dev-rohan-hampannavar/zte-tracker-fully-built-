"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/lib/hooks/use-user";
import { useRoleRoadmapIds, useTechnologies } from "@/lib/hooks/use-roadmap";
import {
  useOnboardingResponses,
  useTargetRoles,
  saveOnboardingDraft,
  completeOnboarding,
  type OnboardingDraft,
} from "@/lib/hooks/use-onboarding";
import type { OnboardingResponses } from "@/types/database";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";

// Question set matches the master prompt's Phase 6 list exactly, kept to
// one question (or a tight cluster) per step, per its own instruction not
// to overwhelm the user with a long questionnaire. "Existing projects" is
// intentionally free text, not structured — see migration 0072's comment
// for why that's a Phase 12 concern, not an onboarding-storage concern.

type Step = "goal" | "role" | "experience" | "hours" | "date" | "dsa" | "interview" | "situation" | "review";

const STEPS: Step[] = ["goal", "role", "experience", "hours", "date", "dsa", "interview", "situation", "review"];

const GOAL_OPTIONS: { value: NonNullable<OnboardingResponses["goal"]>; label: string }[] = [
  { value: "first_job", label: "Get my first developer job" },
  { value: "get_better", label: "Become better at development" },
  { value: "interview_prep", label: "Prepare for interviews" },
  { value: "build_projects", label: "Build projects" },
  { value: "career_switch", label: "Switch careers into tech" },
  { value: "upskill", label: "Upskill for my current role" },
  { value: "other", label: "Something else" },
];

const EXPERIENCE_OPTIONS: { value: NonNullable<OnboardingResponses["experience_level"]>; label: string }[] = [
  { value: "beginner", label: "Beginner — just starting out" },
  { value: "foundation", label: "Foundation — know the basics" },
  { value: "intermediate", label: "Intermediate — built a few things" },
  { value: "advanced", label: "Advanced — working developer" },
];

const HOURS_OPTIONS = [5, 10, 15, 20];

const DSA_OPTIONS: { value: NonNullable<OnboardingResponses["dsa_level"]>; label: string }[] = [
  { value: "none", label: "None yet" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const INTERVIEW_OPTIONS: { value: NonNullable<OnboardingResponses["interview_readiness"]>; label: string }[] = [
  { value: "none", label: "No experience yet" },
  { value: "beginner", label: "A little" },
  { value: "some_experience", label: "Some experience" },
  { value: "strong", label: "Strong" },
];

const SITUATION_OPTIONS: { value: NonNullable<OnboardingResponses["career_situation"]>; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "recent_graduate", label: "Recent graduate" },
  { value: "career_switcher", label: "Career switcher" },
  { value: "working_developer", label: "Working developer" },
  { value: "experienced_professional", label: "Experienced professional" },
];

function OptionGrid<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={`rounded-lg border px-4 py-3 text-left text-sm transition-standard ${
            value === opt.value
              ? "border-accent bg-accent/10 text-foreground"
              : "border-border bg-surface hover:bg-surface-2"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { data: existing, isLoading: existingLoading } = useOnboardingResponses(user?.id);
  const { data: targetRoles } = useTargetRoles();
  const { data: technologies } = useTechnologies();

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Already onboarded (e.g. navigated here directly with a stale tab) —
  // no reason to make them redo it.
  useEffect(() => {
    if (existing?.completed_at) {
      router.replace("/dashboard");
    }
  }, [existing, router]);

  if (userLoading || existingLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return <OnboardingFlow user={user} existing={existing ?? null} stepIndex={stepIndex} setStepIndex={setStepIndex} submitting={submitting} setSubmitting={setSubmitting} router={router} targetRoles={targetRoles} technologies={technologies} />;
}

/**
 * Split out from OnboardingPage so the parent can gate on
 * userLoading/existingLoading before this ever mounts. That means
 * `existing` is already resolved by the time this component's initial
 * render happens, so `useState(() => deriveDraft(existing))` below runs
 * exactly once with the right data — no effect, no
 * react-hooks/set-state-in-effect issue, and no risk of the "flash of
 * empty form then repopulate" a mount effect would cause.
 */
function OnboardingFlow({
  user,
  existing,
  stepIndex,
  setStepIndex,
  submitting,
  setSubmitting,
  router,
  targetRoles,
  technologies,
}: {
  user: { id: string } | null;
  existing: OnboardingResponses | null;
  stepIndex: number;
  setStepIndex: React.Dispatch<React.SetStateAction<number>>;
  submitting: boolean;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  router: ReturnType<typeof useRouter>;
  targetRoles: { id: string; name: string }[] | undefined;
  technologies: { id: string; name: string }[] | undefined;
}) {
  const { data: roleRoadmapIds } = useRoleRoadmapIds();
  const [answers, setAnswers] = useState<OnboardingDraft>(() => deriveDraft(existing));

  const step = STEPS[stepIndex];

  const targetDateChoices = useMemo(() => {
    const now = new Date();
    return [3, 6, 12].map((months) => {
      const d = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
      return { months, iso: d.toISOString().slice(0, 10) };
    });
  }, []);

  async function persist(next: OnboardingDraft) {
    setAnswers(next);
    if (!user) return;
    try {
      await saveOnboardingDraft(user.id, next);
    } catch {
      // Non-fatal: local state still advances the flow. The next
      // successful save (or the final completeOnboarding submit) will
      // catch this back up — we don't block navigation on a draft save
      // failing, only on the final submit.
    }
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    try {
      await completeOnboarding(user.id, answers);
      toast.success("Your roadmap is ready.");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent transition-standard" style={{ width: `${progress}%` }} />
        </div>

        <Card>
          <CardContent className="p-6">
            {step === "goal" && (
              <StepShell title="What's your main goal?">
                <OptionGrid
                  options={GOAL_OPTIONS}
                  value={answers.goal}
                  onSelect={(v) => persist({ ...answers, goal: v })}
                />
                {answers.goal === "other" && (
                  <Input
                    className="mt-3"
                    placeholder="Tell us briefly"
                    value={answers.goal_other ?? ""}
                    onChange={(e) => setAnswers({ ...answers, goal_other: e.target.value })}
                    onBlur={() => persist(answers)}
                  />
                )}
              </StepShell>
            )}

            {step === "role" && (
              <StepShell title="What role are you targeting?">
                {answers.target_role_id && roleRoadmapIds && <p className="mb-3 text-sm text-muted">{roleRoadmapIds.some((assignment) => assignment.role_id === answers.target_role_id) ? "A role-focused detailed learning path is available for this target." : "We’ll use the complete ZTE full-stack curriculum for this target."}</p>}
                <Select
                  value={answers.target_role_id ?? undefined}
                  onValueChange={(v) => persist({ ...answers, target_role_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a target role" />
                  </SelectTrigger>
                  <SelectContent>
                    {(targetRoles ?? []).map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </StepShell>
            )}

            {step === "experience" && (
              <StepShell title="How would you describe your current level?">
                <OptionGrid
                  options={EXPERIENCE_OPTIONS}
                  value={answers.experience_level}
                  onSelect={(v) => persist({ ...answers, experience_level: v })}
                />
                <div className="mt-4">
                  <p className="mb-2 text-sm text-muted">Any of these you already know? (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {(technologies ?? []).slice(0, 24).map((tech) => {
                      const selected = (answers.existing_skills ?? []).includes(tech.id);
                      return (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => {
                            const current = answers.existing_skills ?? [];
                            const next = selected ? current.filter((s) => s !== tech.id) : [...current, tech.id];
                            persist({ ...answers, existing_skills: next });
                          }}
                          className={`rounded-full border px-3 py-1 text-xs transition-standard ${
                            selected
                              ? "border-accent bg-accent/15 text-accent"
                              : "border-border bg-surface hover:bg-surface-2"
                          }`}
                        >
                          {tech.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </StepShell>
            )}

            {step === "hours" && (
              <StepShell title="How many hours a week can you commit?">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {HOURS_OPTIONS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => persist({ ...answers, weekly_hours: h })}
                      className={`rounded-lg border px-4 py-3 text-sm transition-standard ${
                        answers.weekly_hours === h
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-border bg-surface hover:bg-surface-2"
                      }`}
                    >
                      {h} hrs/wk
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  className="mt-3"
                  placeholder="Or enter a custom number"
                  value={answers.weekly_hours ?? ""}
                  onChange={(e) =>
                    setAnswers({ ...answers, weekly_hours: e.target.value ? Number(e.target.value) : undefined })
                  }
                  onBlur={() => persist(answers)}
                />
              </StepShell>
            )}

            {step === "date" && (
              <StepShell title="What's your target date?">
                <div className="grid gap-2 sm:grid-cols-3">
                  {targetDateChoices.map(({ months, iso }) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => persist({ ...answers, target_date: iso })}
                      className={`rounded-lg border px-4 py-3 text-sm transition-standard ${
                        answers.target_date === iso
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-border bg-surface hover:bg-surface-2"
                      }`}
                    >
                      {months} months
                    </button>
                  ))}
                </div>
                <Input
                  type="date"
                  className="mt-3"
                  value={answers.target_date ?? ""}
                  onChange={(e) => setAnswers({ ...answers, target_date: e.target.value })}
                  onBlur={() => persist(answers)}
                />
                <p className="mt-3 text-sm text-muted">Have an existing project worth mentioning? (optional)</p>
                <Input
                  className="mt-2"
                  placeholder="Briefly describe it"
                  value={answers.existing_projects_note ?? ""}
                  onChange={(e) => setAnswers({ ...answers, existing_projects_note: e.target.value })}
                  onBlur={() => persist(answers)}
                />
              </StepShell>
            )}

            {step === "dsa" && (
              <StepShell title="How comfortable are you with data structures & algorithms?">
                <OptionGrid
                  options={DSA_OPTIONS}
                  value={answers.dsa_level}
                  onSelect={(v) => persist({ ...answers, dsa_level: v })}
                />
              </StepShell>
            )}

            {step === "interview" && (
              <StepShell title="How ready do you feel for interviews?">
                <OptionGrid
                  options={INTERVIEW_OPTIONS}
                  value={answers.interview_readiness}
                  onSelect={(v) => persist({ ...answers, interview_readiness: v })}
                />
              </StepShell>
            )}

            {step === "situation" && (
              <StepShell title="Which best describes you right now?">
                <OptionGrid
                  options={SITUATION_OPTIONS}
                  value={answers.career_situation}
                  onSelect={(v) => persist({ ...answers, career_situation: v })}
                />
              </StepShell>
            )}

            {step === "review" && (
              <StepShell title="Ready to build your roadmap">
                <p className="text-sm text-muted">
                  We&apos;ll set you up with a roadmap based on what you told us. You can always adjust your pace
                  later from Settings.
                </p>
              </StepShell>
            )}

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={goBack} disabled={stepIndex === 0}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {step === "review" ? (
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Build my roadmap
                </Button>
              ) : (
                <Button onClick={goNext}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-foreground">{title}</h1>
      {children}
    </div>
  );
}

/** Pulls the resumable fields out of a previously-saved response row.
 * Kept as a plain function (not a hook) since it's pure and only ever
 * called once, as the useState initializer in OnboardingFlow. */
function deriveDraft(existing: OnboardingResponses | null): OnboardingDraft {
  if (!existing) return {};
  return {
    goal: existing.goal ?? undefined,
    goal_other: existing.goal_other ?? undefined,
    target_role_id: existing.target_role_id ?? undefined,
    experience_level: existing.experience_level ?? undefined,
    existing_skills: existing.existing_skills ?? undefined,
    weekly_hours: existing.weekly_hours ?? undefined,
    target_date: existing.target_date ?? undefined,
    existing_projects_note: existing.existing_projects_note ?? undefined,
    dsa_level: existing.dsa_level ?? undefined,
    interview_readiness: existing.interview_readiness ?? undefined,
    career_situation: existing.career_situation ?? undefined,
  };
}
