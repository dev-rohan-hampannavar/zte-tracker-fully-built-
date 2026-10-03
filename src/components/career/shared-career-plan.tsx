"use client";

import { BookOpen, Briefcase, Hammer, MessageSquare, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonalPlanCard } from "@/components/roadmap/personal-plan-card";
import { usePhasesWithProgress } from "@/lib/hooks/use-roadmap";
import { useOnboardingResponses, useTargetRoles } from "@/lib/hooks/use-onboarding";
import { useRoleProfile } from "@/lib/hooks/use-role-profile";
import { RolePathForUser } from "@/components/shared/role-path-guide";
import { Compass } from "lucide-react";
import Link from "next/link";

function ListCard({ icon: Icon, title, items }: { icon: typeof BookOpen; title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Icon className="size-4 text-accent" /> {title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm text-muted">
          {items.map((item) => <li key={item} className="flex gap-2"><span className="text-accent">•</span><span>{item}</span></li>)}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * Career plan for shared-workspace users. Built entirely from the person's own
 * onboarding answers and the catalog profile of the role they chose. It
 * replaces the original owner-authored plan (fixed tracks, salaries, employer)
 * that shared accounts must never see.
 */
export function SharedCareerPlan({ userId }: { userId: string }) {
  const { data: answers, isLoading: answersLoading } = useOnboardingResponses(userId);
  const { data: roles } = useTargetRoles();
  const { data: info, isLoading: infoLoading } = useRoleProfile(answers?.target_role_id);
  const { phases, isLoading: phasesLoading } = usePhasesWithProgress(userId);

  if (answersLoading || phasesLoading || infoLoading) {
    return <div className="mx-auto flex max-w-5xl flex-col gap-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>;
  }

  const topics = phases.flatMap((p) => p.topics);
  const remainingHours = topics.filter((t) => !t.progress?.completed).reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0);
  const nextTopic = topics.find((t) => !t.progress?.completed);
  const roleName = roles?.find((r) => r.id === answers?.target_role_id)?.name;
  const profile = info?.profile;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-page-title font-semibold tracking-tight">Career plan</h1>
        <p className="mt-1 text-sm text-muted">Built from your goals, your level, and the role you picked. It updates as you learn.</p>
      </div>

      <PersonalPlanCard
        userId={userId}
        remainingHours={remainingHours}
        completedTopics={topics.filter((t) => t.progress?.completed).length}
        totalTopics={topics.length}
        nextTopicTitle={nextTopic?.title ?? null}
      />

      <RolePathForUser userId={userId} />

      {!profile ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6 text-sm text-muted">
            <p className="flex items-center gap-2 text-foreground"><Compass className="size-4 text-accent" /> {roleName ? `We don't have a detailed profile for ${roleName} yet.` : "You haven't picked a target role yet."}</p>
            <p>Choose a role in Careers to see the skills, projects, and interview focus that role rewards.</p>
            <Link href="/careers" className="text-accent hover:underline">Browse careers</Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <Briefcase className="size-4 text-accent" /> What a {roleName ?? profile.name} does
                {info?.family && <Badge variant="outline">{info.family.name}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted">
              <p>{profile.summary}</p>
              {profile.dsa_expectation && <p><span className="text-foreground">DSA expectation:</span> {profile.dsa_expectation}</p>}
              {profile.system_design_expectation && <p><span className="text-foreground">System design:</span> {profile.system_design_expectation}</p>}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <ListCard icon={BookOpen} title="Before you start" items={profile.prerequisites} />
            <ListCard icon={Wrench} title="Core skills" items={profile.core_skills} />
            <ListCard icon={Wrench} title="Tools you'll meet" items={profile.tool_stack} />
            <ListCard icon={Hammer} title="Projects worth building" items={profile.project_blueprints} />
            <ListCard icon={MessageSquare} title="What interviews focus on" items={profile.interview_focus} />
            <ListCard icon={Briefcase} title="Proof of work to show" items={profile.portfolio_evidence} />
          </div>
        </>
      )}
    </div>
  );
}
