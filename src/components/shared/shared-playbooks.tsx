"use client";

import { PlaybookView } from "@/components/shared/playbook-view";
import { BulletChecker } from "@/components/shared/bullet-checker";
import { INTERVIEW_PLAYBOOK } from "@/content/shared/interview-playbook";
import { RESUME_STUDIO } from "@/content/shared/resume-studio";
import { JOB_SEARCH_PLAYBOOK } from "@/content/shared/job-search-playbook";
import { useOnboardingResponses } from "@/lib/hooks/use-onboarding";
import { useRoleProfile } from "@/lib/hooks/use-role-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Role-specific interview focus pulled from the person's chosen role profile. */
function RoleFocus({ userId }: { userId: string }) {
  const { data: answers } = useOnboardingResponses(userId);
  const { data: info } = useRoleProfile(answers?.target_role_id);
  const focus = info?.profile?.interview_focus ?? [];
  if (focus.length === 0) return null;
  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">What interviews for your target role focus on</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm text-muted">
          {focus.map((f) => <li key={f} className="flex gap-2"><span className="text-accent">•</span><span>{f}</span></li>)}
        </ul>
      </CardContent>
    </Card>
  );
}

export function SharedInterviewPrep({ userId }: { userId: string }) {
  return <PlaybookView playbook={INTERVIEW_PLAYBOOK} header={<RoleFocus userId={userId} />} />;
}
export function SharedResumeStudio() {
  return <PlaybookView playbook={RESUME_STUDIO} header={<BulletChecker />} />;
}
export function SharedJobSearch() {
  return <PlaybookView playbook={JOB_SEARCH_PLAYBOOK} />;
}
