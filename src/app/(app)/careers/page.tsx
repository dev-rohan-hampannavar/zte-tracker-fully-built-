"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { ArrowRight, BookOpen, BriefcaseBusiness, Check, Compass, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import type { CareerFamily, CareerRole, CareerRoleProfile, TargetRole } from "@/types/database";

const INTERESTS = [
  { label: "Build apps and services", family: "software-development" },
  { label: "Create mobile experiences", family: "mobile-development" },
  { label: "Find patterns in data and AI", family: "data-ai" },
  { label: "Run reliable cloud systems", family: "cloud-infrastructure" },
  { label: "Investigate and prevent attacks", family: "cybersecurity" },
  { label: "Improve product quality", family: "software-quality" },
  { label: "Work close to devices and networks", family: "systems-hardware" },
  { label: "Design data systems and architecture", family: "database-architecture" },
  { label: "Customize business platforms", family: "enterprise-technology" },
  { label: "Build games, XR, or blockchain", family: "specialized-technology" },
];
const formatLevel = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());

export default function CareersPage() {
  const supabase = createClient();
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { data, error, isLoading, mutate } = useSWR("career-role-catalog", async () => {
    const [families, profiles, roles, targetRoles, assignments] = await Promise.all([
      supabase.from("career_families").select("*").order("sort_order"),
      supabase.from("career_role_profiles").select("*").eq("is_active", true).order("name"),
      supabase.from("career_roles").select("*").eq("is_active", true).order("id"),
      supabase.from("target_roles").select("*").eq("is_active", true).order("name"),
      supabase.from("role_roadmap_assignments").select("role_id,roadmap_id").order("priority"),
    ]);
    const firstError = families.error ?? profiles.error ?? roles.error ?? targetRoles.error ?? assignments.error;
    if (firstError) throw firstError;
    const assignedRoadmaps = new Map(((assignments.data ?? []) as { role_id: string; roadmap_id: string }[]).map((item) => [item.role_id, item.roadmap_id]));
    return {
      families: (families.data ?? []) as CareerFamily[],
      profiles: (profiles.data ?? []) as CareerRoleProfile[],
      roles: ((roles.data ?? []) as CareerRole[]).map((role) => {
        const roadmap = assignedRoadmaps.get(role.target_role_id) ?? null;
        return { ...role, roadmap_id: roadmap, curriculum_status: roadmap ? "mapped_to_detailed_track" : "core_curriculum" } as CareerRole;
      }),
      targetRoles: (targetRoles.data ?? []) as TargetRole[],
    };
  });

  const roleNames = useMemo(() => new Map((data?.targetRoles ?? []).map((role) => [role.id, role.name])), [data?.targetRoles]);
  const roleByTargetId = useMemo(() => new Map((data?.roles ?? []).map((role) => [role.target_role_id, role])), [data?.roles]);
  const profileById = useMemo(() => new Map((data?.profiles ?? []).map((profile) => [profile.id, profile])), [data?.profiles]);
  const familyById = useMemo(() => new Map((data?.families ?? []).map((family) => [family.id, family.name])), [data?.families]);
  const visibleRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.roles ?? []).filter((role) => {
      const profile = profileById.get(role.profile_id);
      if (!profile || (familyFilter !== "all" && role.family_id !== familyFilter)) return false;
      if (!query) return true;
      const searchable = [roleNames.get(role.target_role_id), role.role_focus, profile.name, profile.summary, familyById.get(role.family_id), ...profile.core_skills, ...profile.tool_stack]
        .filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [data?.roles, familyById, familyFilter, profileById, roleNames, search]);

  const visibleProfileIds = new Set(visibleRoles.map((role) => role.profile_id));
  const visibleProfiles = (data?.profiles ?? []).filter((profile) => visibleProfileIds.has(profile.id));
  const groups = visibleProfiles.map((profile) => ({
    profile,
    roles: visibleRoles.filter((role) => role.profile_id === profile.id),
  }));

  function recommend(familyId: string) {
    setFamilyFilter(familyId);
    document.getElementById("role-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveTarget() {
    if (!user || !selectedRole) return;
    setSaving(true);
    const { error: saveError } = await supabase.from("onboarding_responses").upsert({ user_id: user.id, target_role_id: selectedRole } as never, { onConflict: "user_id" });
    if (saveError) {
      toast.error("Could not update your target role.");
      setSaving(false);
      return;
    }
    await mutate();
    toast.success(`Target role set to ${roleNames.get(selectedRole) ?? selectedRole}. Your current roadmap enrollment stays in place.`);
    setSaving(false);
  }

  if (isLoading) return <div className="py-20 text-center text-sm text-muted">Loading career roles…</div>;
  if (error || !data) return <div className="py-20 text-center text-sm text-muted">Career roles are unavailable. Apply database migration 0087 and reload this page.</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-sm text-accent"><BriefcaseBusiness className="size-4" /> Career role explorer</p>
        <h1 className="text-3xl font-semibold tracking-tight">Find a role that fits how you like to work</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted">Browse 118 job titles across 10 career families. Related titles share one practical profile; the catalog describes common skills and proof of work, while employers may use different tools or expectations.</p>
      </header>

      <section aria-labelledby="recommend-title" className="space-y-3">
        <h2 id="recommend-title" className="flex items-center gap-2 text-lg font-semibold"><Compass className="size-5 text-accent" /> Start with the work you want to do</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {INTERESTS.map((interest) => <button key={interest.family} onClick={() => recommend(interest.family)} className={`rounded-lg border px-3 py-3 text-left text-sm transition-standard ${familyFilter === interest.family ? "border-accent bg-accent/10" : "border-border bg-surface hover:bg-surface-2"}`}>{interest.label}<ArrowRight className="ml-2 inline size-3.5 text-muted" /></button>)}
        </div>
        <p className="text-xs text-muted">This is a starting point based on your stated interest. You can browse every role and choose any title.</p>
      </section>

      <section id="role-results" className="scroll-mt-6 space-y-4" aria-label="Career role results">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles, skills, or tools" aria-label="Search career roles, skills, or tools" className="pl-9" /></div>
          <select aria-label="Filter by career family" value={familyFilter} onChange={(event) => setFamilyFilter(event.target.value)} className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground">
            <option value="all">All career families</option>{data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
          </select>
        </div>
        {familyFilter !== "all" && <p className="text-sm leading-6 text-muted">{data.families.find((family) => family.id === familyFilter)?.description}</p>}
        <p className="text-sm text-muted">Showing {visibleRoles.length} of {data.roles.length} role titles</p>
        {groups.length === 0 && <Card><CardContent className="p-6 text-sm text-muted">No roles match those filters. Try a broader search or another family.</CardContent></Card>}
        <div className="space-y-4">
          {groups.map(({ profile, roles }) => <Card key={profile.id}>
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-medium uppercase tracking-wide text-accent">{familyById.get(profile.family_id)}</p><h3 className="mt-1 text-lg font-semibold">{profile.name}</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{profile.summary}</p></div>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">Shared profile · {roles.length} titles</span>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Role titles">
                {roles.map((role) => {
                  const name = roleNames.get(role.target_role_id) ?? role.target_role_id;
                  return <button key={role.id} type="button" onClick={() => setSelectedRole(role.target_role_id)} className={`rounded-full border px-3 py-1.5 text-sm transition-standard ${selectedRole === role.target_role_id ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted hover:border-accent hover:text-foreground"}`}>{selectedRole === role.target_role_id && <Check className="mr-1 inline size-3.5" />}{name}<span className="ml-1 text-[10px] opacity-70">{role.roadmap_id ? "· track" : "· core"}</span></button>;
                })}
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div><h4 className="mb-2 text-sm font-semibold">Starting prerequisites</h4><ul className="mb-4 space-y-1 text-sm text-muted">{profile.prerequisites.map((item) => <li key={item}>• {item}</li>)}</ul><h4 className="mb-2 text-sm font-semibold">Core skills</h4><div className="flex flex-wrap gap-1.5">{profile.core_skills.map((skill) => <span key={skill} className="rounded-md bg-surface-2 px-2 py-1 text-xs">{skill}</span>)}</div><h4 className="mb-2 mt-4 text-sm font-semibold">Tools and technologies</h4><div className="flex flex-wrap gap-1.5">{profile.tool_stack.map((skill) => <span key={skill} className="rounded-md bg-surface-2 px-2 py-1 text-xs">{skill}</span>)}</div></div>
                <div><h4 className="mb-2 text-sm font-semibold">Portfolio project ideas</h4><ul className="space-y-2 text-sm text-muted">{profile.project_blueprints.map((project) => <li key={project} className="flex gap-2"><span className="text-accent">•</span><span>{project}</span></li>)}</ul><h4 className="mb-2 mt-4 text-sm font-semibold">Interview focus</h4><p className="text-sm leading-6 text-muted">{profile.interview_focus.join(" · ")}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-surface-2 px-2 py-1">DSA: {formatLevel(profile.dsa_expectation)}</span><span className="rounded-md bg-surface-2 px-2 py-1">System design: {formatLevel(profile.system_design_expectation)}</span></div><h4 className="mb-2 mt-4 text-sm font-semibold">Portfolio evidence</h4><ul className="space-y-1 text-xs text-muted">{profile.portfolio_evidence.map((item) => <li key={item}>• {item}</li>)}</ul></div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <p className="flex max-w-3xl items-start gap-2 text-xs leading-5 text-muted"><BookOpen className="mt-0.5 size-4 shrink-0" />{selectedRole && roles.some((role) => role.target_role_id === selectedRole) ? (() => { const role = roleByTargetId.get(selectedRole); return role?.roadmap_id ? `This title is assigned the shared ${role.roadmap_id} track. The track covers foundational learning and does not replace role-specific project or interview evidence.` : "No specialist track is mapped to this exact title yet. Onboarding uses the ZTE core curriculum; use this profile as a career requirements guide."; })() : "Choose a title to see whether a detailed track is mapped. Curriculum coverage is attached to exact job titles, not assumed from the shared profile."}</p>
                {selectedRole && roles.some((role) => role.target_role_id === selectedRole) && roleByTargetId.get(selectedRole)?.role_focus && <p className="w-full text-xs leading-5 text-muted"><span className="font-medium text-foreground">Title focus:</span> {roleByTargetId.get(selectedRole)?.role_focus}</p>}
                {selectedRole && roles.some((role) => role.target_role_id === selectedRole) && <Button onClick={() => void saveTarget()} disabled={saving}>{saving ? "Saving…" : "Set as my target role"}<ArrowRight className="size-4" /></Button>}
              </div>
            </CardContent>
          </Card>)}
        </div>
      </section>
    </div>
  );
}
