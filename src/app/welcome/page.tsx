"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  useOrientation,
  useWhyThisWorks,
  useMasterPhaseTable,
  useNavigationNotes,
} from "@/lib/hooks/use-roadmap";
import {
  ArrowRight,
  ArrowLeft,
  Compass,
  Users,
  Briefcase,
  Megaphone,
  ListChecks,
  Clock,
  Route,
  ShieldCheck,
  LayoutGrid,
  Rocket,
} from "lucide-react";

type StepDef = {
  key: string;
  icon: typeof Compass;
  title: string;
  render: () => React.ReactNode;
};

export default function WelcomePage() {
  const { data: orientation, isLoading: oLoading } = useOrientation();
  const { data: whyThisWorks } = useWhyThisWorks();
  const { data: masterPhaseTable } = useMasterPhaseTable();
  const { data: navigationNotes } = useNavigationNotes();

  const [step, setStep] = useState(0);

  const steps: StepDef[] = useMemo(() => {
    const list: StepDef[] = [];

    list.push({
      key: "overview",
      icon: Compass,
      title: "What this is",
      render: () => (
        <p className="text-base text-muted leading-relaxed whitespace-pre-line">
          {orientation?.overview ??
            "A structured, phase-based path from beginner to job-ready full-stack engineer."}
        </p>
      ),
    });

    if (orientation?.who_is_this_for && orientation.who_is_this_for.length > 0) {
      list.push({
        key: "who",
        icon: Users,
        title: "Who this is for",
        render: () => (
          <dl className="w-full flex flex-col gap-3 text-left">
            {orientation.who_is_this_for.map((row) => (
              <div key={row.category}>
                <dt className="text-sm text-muted mb-0.5">{row.category}</dt>
                <dd className="text-base">{row.details}</dd>
              </div>
            ))}
          </dl>
        ),
      });
    }

    if (orientation?.job_market_case) {
      list.push({
        key: "job-market",
        icon: Briefcase,
        title: "Yes, you can still get hired",
        render: () => (
          <p className="text-base text-muted leading-relaxed whitespace-pre-line text-left max-h-64 overflow-y-auto">
            {orientation.job_market_case}
          </p>
        ),
      });
    }

    if (whyThisWorks && whyThisWorks.length > 0) {
      list.push({
        key: "why",
        icon: ShieldCheck,
        title: "Why most roadmaps fail — and this one doesn't",
        render: () => (
          <div className="w-full flex flex-col gap-2 text-left max-h-64 overflow-y-auto">
            {whyThisWorks.map((row) => (
              <div key={row.id} className="text-base">
                <span className="font-medium">{row.failure_mode}</span>
                <span className="text-muted"> — {row.mechanism}</span>
              </div>
            ))}
          </div>
        ),
      });
    }

    if (orientation?.build_in_public_guide) {
      list.push({
        key: "build-in-public",
        icon: Megaphone,
        title: "Build in public",
        render: () => (
          <p className="text-base text-muted leading-relaxed whitespace-pre-line text-left max-h-64 overflow-y-auto">
            {orientation.build_in_public_guide}
          </p>
        ),
      });
    }

    if (masterPhaseTable && masterPhaseTable.length > 0) {
      list.push({
        key: "phases",
        icon: LayoutGrid,
        title: `${masterPhaseTable.length} phases, four difficulty bands`,
        render: () => (
          <div className="w-full flex flex-col gap-1.5 text-left max-h-64 overflow-y-auto">
            {masterPhaseTable.map((row) => (
              <div key={row.phase} className="flex items-center gap-2 text-base">
                <Badge variant="outline" className="font-mono-tabular text-xs font-normal shrink-0">
                  {row.phase}
                </Badge>
                <span className="flex-1 truncate">{row.focus}</span>
                <span className="text-xs text-muted font-mono-tabular shrink-0">{row.realistic_hours}h</span>
              </div>
            ))}
          </div>
        ),
      });
    }

    if (orientation?.weekly_pace_options && orientation.weekly_pace_options.length > 0) {
      list.push({
        key: "pace",
        icon: Clock,
        title: "Choose your pace",
        render: () => (
          <div className="w-full flex flex-col gap-2 text-left">
            {orientation.weekly_pace_options.map((row) => (
              <div key={row.weekly_hours} className="flex items-baseline justify-between text-base border-b border-border pb-2 last:border-0">
                <span className="font-mono-tabular">{row.weekly_hours} hrs/wk</span>
                <span className="text-accent font-mono-tabular">{row.timeline}</span>
              </div>
            ))}
          </div>
        ),
      });
    }

    if (navigationNotes?.mvp_fast_path && navigationNotes.mvp_fast_path.length > 0) {
      list.push({
        key: "fast-path",
        icon: Route,
        title: "There's a fast path to your first offer",
        render: () => (
          <div className="w-full flex flex-col gap-3 text-left">
            {navigationNotes.mvp_fast_path.map((line, i) => (
              <p key={i} className="text-base text-muted leading-relaxed">{line}</p>
            ))}
          </div>
        ),
      });
    }

    if (orientation?.quick_start_checklist && orientation.quick_start_checklist.length > 0) {
      list.push({
        key: "checklist",
        icon: ListChecks,
        title: "Your quick start checklist",
        render: () => (
          <ol className="w-full flex flex-col gap-2 text-left max-h-64 overflow-y-auto">
            {orientation.quick_start_checklist.map((item) => (
              <li key={item.step} className="flex items-start gap-3 text-base">
                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-accent text-[10px] font-mono-tabular font-semibold mt-0.5">
                  {item.step}
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ol>
        ),
      });
    }

    list.push({
      key: "start",
      icon: Rocket,
      title: "Ready to start",
      render: () => (
        <p className="text-base text-muted leading-relaxed">
          {orientation?.decision_rule ??
            "Sign in to get your dashboard, your first phase, and your streak tracking started."}
        </p>
      ),
    });

    return list;
  }, [orientation, whyThisWorks, masterPhaseTable, navigationNotes]);

  const isLoading = oLoading && steps.length <= 1;
  const isLast = step === steps.length - 1;
  const Current = steps[step]?.icon ?? Compass;

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="flex items-center gap-2 justify-center">
          <div className="flex h-8 w-8 items-center justify-center">
            <Image
              src="/icons/logo-mark.png"
              alt="ZTE Tracker"
              width={32}
              height={32}
              className="h-8 w-8 rounded-md object-contain"
            />
          </div>
          <span className="text-base font-semibold tracking-tight">ZTE Tracker</span>
        </div>

        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent shrink-0">
                <Current className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{steps[step]?.title}</h1>
              <div className="w-full flex justify-center">{steps[step]?.render()}</div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-accent" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {!isLast ? (
            <Button onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))} className="flex-1">
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Link href="/login" className="flex-1">
              <Button className="w-full">
                Sign in to start <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>

        <Link href="/login" className="text-sm text-muted hover:text-foreground text-center">
          Skip — I already have an account
        </Link>
      </div>
    </div>
  );
}
