"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboardingResponses, useTargetRoles } from "@/lib/hooks/use-onboarding";
import { useRoleProfile } from "@/lib/hooks/use-role-profile";
import Link from "next/link";
import { lessonsForPath } from "@/content/shared/lessons";
import { PHASE_TITLES, getRolePathForProfile, type PhaseTier, type RolePath } from "@/content/shared/role-paths";

const TIERS: { tier: PhaseTier; label: string; hint: string; className: string }[] = [
  { tier: "core", label: "Do in full", hint: "These carry the most weight for your role.", className: "border-accent/40 text-accent" },
  { tier: "light", label: "Skim and apply", hint: "Learn the ideas; build only what you need.", className: "border-warning/40 text-warning" },
  { tier: "skip", label: "Skip for now", hint: "Come back if your plans change.", className: "border-border text-muted" },
];

export function RolePathGuide({ path, roleName }: { path: RolePath; roleName?: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-accent/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{path.title}{roleName ? ` · ${roleName}` : ""}</CardTitle>
          <p className="text-sm text-muted">{path.pitch}</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">A day in the role</p>
            <ul className="space-y-1 text-muted">
              {path.dayInTheLife.map((d) => <li key={d} className="flex gap-2"><span className="text-accent">•</span><span>{d}</span></li>)}
            </ul>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">How to use the roadmap for this role</p>
            {TIERS.map(({ tier, label, hint, className }) => {
              const ids = Object.keys(PHASE_TITLES).filter((id) => path.phaseMap[id] === tier);
              if (ids.length === 0) return null;
              return (
                <div key={tier}>
                  <p className="text-sm font-medium">{label} <span className="font-normal text-muted">· {hint}</span></p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {ids.map((id) => <Badge key={id} variant="outline" className={className}>{PHASE_TITLES[id]}</Badge>)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {path.addOns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add these modules</CardTitle>
            <p className="text-sm text-muted">What the core curriculum doesn&apos;t cover for your role, in a sensible order.</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {path.addOns.map((m, i) => (
              <div key={m.title} className="rounded-lg border border-border/60 p-3">
                <p className="font-medium">{i + 1}. {m.title} <span className="font-normal text-muted">· about {m.weeks} weeks</span></p>
                <p className="mt-1 text-muted">{m.outcome}</p>
                <ul className="mt-2 space-y-1 text-muted">
                  {m.topics.map((t) => <li key={t} className="flex gap-2"><span className="text-accent">•</span><span>{t}</span></li>)}
                </ul>
                <p className="mt-2 rounded-md bg-surface-2 p-2 text-xs"><span className="font-medium">Build: </span>{m.project}</p>
                {lessonsForPath(path).filter((l) => l.module === m.title).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="font-medium">Lessons:</span>
                    {lessonsForPath(path).filter((l) => l.module === m.title).map((l) => (
                      <Link key={l.id} href={`/learn/${l.id}`} className="text-accent hover:underline">{l.title}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Portfolio projects employers look for</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {path.portfolio.map((p) => (
            <div key={p.name} className="rounded-lg border border-border/60 p-3">
              <p className="font-medium">{p.name}</p>
              <p className="mt-1 text-muted">{p.brief}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted">Done when</p>
              <ul className="mt-1 space-y-1 text-muted">
                {p.acceptance.map((a) => <li key={a} className="flex gap-2"><span className="text-accent">✓</span><span>{a}</span></li>)}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">You&apos;re ready to apply when</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-muted">
              {path.readyWhen.map((r) => <li key={r} className="flex gap-2"><span className="text-accent">✓</span><span>{r}</span></li>)}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Common mistakes to avoid</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-muted">
              {path.mistakes.map((m) => <li key={m} className="flex gap-2"><span className="text-danger">✕</span><span>{m}</span></li>)}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Looks up the person's chosen role and renders the matching path. */
export function RolePathForUser({ userId, collapsible = false }: { userId: string; collapsible?: boolean }) {
  const { data: answers } = useOnboardingResponses(userId);
  const { data: roles } = useTargetRoles();
  const { data: info } = useRoleProfile(answers?.target_role_id);
  const path = getRolePathForProfile(info?.role?.profile_id, info?.family?.id);
  if (!path) return null;
  const guide = <RolePathGuide path={path} roleName={roles?.find((r) => r.id === answers?.target_role_id)?.name ?? null} />;
  if (!collapsible) return guide;
  return (
    <details className="group rounded-xl border border-border bg-surface p-4">
      <summary className="cursor-pointer text-sm font-medium">
        How to use this roadmap for your role: what to prioritise, skip and add
      </summary>
      <div className="mt-4">{guide}</div>
    </details>
  );
}
