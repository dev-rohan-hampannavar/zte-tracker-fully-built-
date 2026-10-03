"use client";

import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { CareerFamily, CareerRole, CareerRoleProfile, TargetRole } from "@/types/database";

const fieldClass = "min-h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted";
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const lines = (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const csv = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export function CareerRoleCatalogAdmin() {
  const supabase = createClient();
  const { mutate: mutateGlobal } = useSWRConfig();
  const { data, isLoading, mutate } = useSWR("admin-career-role-catalog", async () => {
    const [families, profiles, roles, targets, roadmaps, versions, assignments] = await Promise.all([
      supabase.from("career_families").select("*").order("sort_order"),
      supabase.from("career_role_profiles").select("*").order("name"),
      supabase.from("career_roles").select("*").order("id"),
      supabase.from("target_roles").select("*").order("name"),
      supabase.from("roadmaps").select("id,title").eq("is_public", true).order("title"),
      supabase.from("roadmap_versions").select("roadmap_id,status,is_current").eq("status", "published").eq("is_current", true),
      supabase.from("role_roadmap_assignments").select("role_id,roadmap_id").order("priority"),
    ]);
    const error = families.error ?? profiles.error ?? roles.error ?? targets.error ?? roadmaps.error ?? versions.error ?? assignments.error;
    if (error) throw error;
    const publishedIds = new Set(((versions.data ?? []) as { roadmap_id: string }[]).map((version) => version.roadmap_id));
    const publicRoadmaps = (roadmaps.data ?? []) as { id: string; title: string }[];
    const assignedRoadmaps = new Map(((assignments.data ?? []) as { role_id: string; roadmap_id: string }[]).map((item) => [item.role_id, item.roadmap_id]));
    const catalogRoles = ((roles.data ?? []) as CareerRole[]).map((role) => {
      const roadmap = assignedRoadmaps.get(role.target_role_id) ?? null;
      return { ...role, roadmap_id: roadmap, curriculum_status: roadmap ? "mapped_to_detailed_track" : "core_curriculum" } as CareerRole;
    });
    return { families: (families.data ?? []) as CareerFamily[], profiles: (profiles.data ?? []) as CareerRoleProfile[], roles: catalogRoles, targets: (targets.data ?? []) as TargetRole[], roadmaps: publicRoadmaps.filter((roadmap) => publishedIds.has(roadmap.id)) };
  });

  const [profileFamily, setProfileFamily] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileSummary, setProfileSummary] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [skills, setSkills] = useState("");
  const [tools, setTools] = useState("");
  const [projects, setProjects] = useState("");
  const [interviewFocus, setInterviewFocus] = useState("");
  const [dsa, setDsa] = useState("foundational");
  const [systemDesign, setSystemDesign] = useState("foundational");
  const [roleTitle, setRoleTitle] = useState("");
  const [roleFamily, setRoleFamily] = useState("");
  const [roleProfile, setRoleProfile] = useState("");
  const [roleFocus, setRoleFocus] = useState("");
  const [roleRoadmap, setRoleRoadmap] = useState("");
  const [busy, setBusy] = useState<"profile" | "role" | null>(null);
  const profilesForRoleFamily = useMemo(() => (data?.profiles ?? []).filter((profile) => profile.family_id === roleFamily), [data?.profiles, roleFamily]);
  const targetNames = useMemo(() => new Map((data?.targets ?? []).map((role) => [role.id, role.name])), [data?.targets]);

  async function refreshCatalog() {
    await Promise.all([mutate(), mutateGlobal("career-role-catalog")]);
  }

  async function addProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileFamily || !profileName.trim() || !profileSummary.trim()) return;
    if (lines(prerequisites).length === 0 || csv(skills).length < 3 || csv(tools).length === 0 || lines(projects).length < 2 || lines(interviewFocus).length < 2) {
      toast.error("Add at least one prerequisite, three core skills, one tool, two projects, and two interview areas.");
      return;
    }
    setBusy("profile");
    const id = `${profileFamily}--${slugify(profileName)}`;
    const { error } = await supabase.from("career_role_profiles").insert({
      id, family_id: profileFamily, name: profileName.trim(), summary: profileSummary.trim(), prerequisites: lines(prerequisites),
      core_skills: csv(skills), tool_stack: csv(tools), project_blueprints: lines(projects),
      interview_focus: lines(interviewFocus), dsa_expectation: dsa, system_design_expectation: systemDesign,
      portfolio_evidence: ["Runnable work with setup instructions", "Tests or validation evidence", "A short note explaining an engineering trade-off"],
      roadmap_id: null, curriculum_status: "core_curriculum",
      coverage_notes: "Admin-curated role profile. Validate its skill and project guidance against current employer expectations.", is_active: true,
    } as never);
    if (error) toast.error(error.message);
    else {
      toast.success(`Profile “${profileName.trim()}” added.`);
      setProfileName(""); setProfileSummary(""); setPrerequisites(""); setSkills(""); setTools(""); setProjects(""); setInterviewFocus("");
      await refreshCatalog();
    }
    setBusy(null);
  }

  async function addRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roleTitle.trim() || !roleFamily || !roleProfile) return;
    const id = slugify(roleTitle);
    if (!id) return;
    setBusy("role");
    const profile = data?.profiles.find((item) => item.id === roleProfile);
    if (!profile) { toast.error("Choose a valid shared profile."); setBusy(null); return; }
    const roleDescription = roleFocus.trim() || `Career profile: ${profile.name}`;
    const { error: targetError } = await supabase.from("target_roles").insert({ id, name: roleTitle.trim(), description: roleDescription, is_active: true } as never);
    if (targetError) { toast.error(targetError.message); setBusy(null); return; }
    const curriculumStatus = roleRoadmap ? "mapped_to_detailed_track" : "core_curriculum";
    const { error: roleError } = await supabase.from("career_roles").insert({
      id, target_role_id: id, family_id: roleFamily, profile_id: roleProfile, role_focus: roleFocus.trim() || null,
      roadmap_id: roleRoadmap || null, curriculum_status: curriculumStatus, is_active: true,
    } as never);
    if (roleError) {
      await supabase.from("target_roles").delete().eq("id", id);
      toast.error(roleError.message);
      setBusy(null);
      return;
    }
    const { error: skillsError } = await supabase.rpc("admin_sync_career_role_skills", { p_role_id: id } as never);
    if (skillsError) {
      await supabase.from("career_roles").delete().eq("id", id);
      await supabase.from("target_roles").delete().eq("id", id);
      toast.error(`Role was not saved because its readiness skills could not be synchronized: ${skillsError.message}`);
      setBusy(null);
      return;
    }
    if (roleRoadmap) {
      const { error: assignmentError } = await supabase.rpc("set_role_roadmap_assignment", { p_role_id: id, p_roadmap_id: roleRoadmap } as never);
      if (assignmentError) {
        await supabase.from("career_roles").delete().eq("id", id);
        await supabase.from("target_roles").delete().eq("id", id);
        toast.error(`Role was not saved because the track could not be assigned: ${assignmentError.message}`);
        setBusy(null);
        return;
      }
    }
    toast.success(`Role “${roleTitle.trim()}” added.`);
    setRoleTitle(""); setRoleFocus(""); setRoleRoadmap("");
    await refreshCatalog();
    setBusy(null);
  }

  async function setRoleActive(role: CareerRole, active: boolean) {
    const { error: catalogError } = await supabase.from("career_roles").update({ is_active: active } as never).eq("id", role.id);
    if (catalogError) { toast.error(catalogError.message); return; }
    const { error: targetError } = await supabase.from("target_roles").update({ is_active: active } as never).eq("id", role.target_role_id);
    if (targetError) {
      await supabase.from("career_roles").update({ is_active: !active } as never).eq("id", role.id);
      toast.error(targetError.message);
      return;
    }
    toast.success(active ? "Role title activated." : "Role title deactivated. Existing learner enrollments remain unchanged.");
    await refreshCatalog();
  }

  if (isLoading || !data) return <Card className="mb-6"><CardContent className="p-5 text-sm text-muted">Loading role catalog controls…</CardContent></Card>;

  return <section className="mb-8 space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-semibold">Career role catalog</h2><p className="text-sm text-muted">Curate reusable role profiles and exact job titles. New records appear in onboarding and the role explorer.</p></div><Button variant="outline" size="sm" onClick={() => void refreshCatalog()}><RefreshCw className="size-3.5" /> Refresh</Button></div>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardContent className="p-5"><h3 className="mb-3 font-medium">Add a shared role profile</h3><form className="space-y-3" onSubmit={(event) => void addProfile(event)}>
        <select aria-label="Profile family" className={fieldClass} value={profileFamily} onChange={(event) => setProfileFamily(event.target.value)} required><option value="">Choose a career family</option>{data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}</select>
        <Input aria-label="Profile name" value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Profile name" required />
        <textarea aria-label="Profile summary" className={fieldClass} value={profileSummary} onChange={(event) => setProfileSummary(event.target.value)} placeholder="What this work focuses on" required />
        <textarea aria-label="Starting prerequisites" className={fieldClass} value={prerequisites} onChange={(event) => setPrerequisites(event.target.value)} placeholder="Starting prerequisites, one per line" />
        <Input aria-label="Core skills" value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Core skills, comma separated" />
        <Input aria-label="Tools and technologies" value={tools} onChange={(event) => setTools(event.target.value)} placeholder="Tools and technologies, comma separated" />
        <textarea aria-label="Project ideas" className={fieldClass} value={projects} onChange={(event) => setProjects(event.target.value)} placeholder="Two project ideas, one per line" />
        <textarea aria-label="Interview focus areas" className={fieldClass} value={interviewFocus} onChange={(event) => setInterviewFocus(event.target.value)} placeholder="Interview focus areas, one per line" />
        <div className="grid gap-2 sm:grid-cols-2"><select aria-label="DSA expectation" className={fieldClass} value={dsa} onChange={(event) => setDsa(event.target.value)}><option value="foundational">DSA: Foundational</option><option value="basic-to-intermediate">DSA: Basic to intermediate</option><option value="intermediate">DSA: Intermediate</option></select><select aria-label="System design expectation" className={fieldClass} value={systemDesign} onChange={(event) => setSystemDesign(event.target.value)}><option value="foundational">System design: Foundational</option><option value="applied">System design: Applied</option><option value="domain-specific">System design: Domain specific</option></select></div>
        <Button type="submit" disabled={busy !== null}><Plus className="size-4" />{busy === "profile" ? "Adding…" : "Add profile"}</Button>
      </form></CardContent></Card>

      <Card><CardContent className="p-5"><h3 className="mb-3 font-medium">Add a job title</h3><form className="space-y-3" onSubmit={(event) => void addRole(event)}>
        <Input aria-label="Job title" value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} placeholder="Job title (example: Kotlin Developer)" required />
        <select aria-label="Job title family" className={fieldClass} value={roleFamily} onChange={(event) => { setRoleFamily(event.target.value); setRoleProfile(""); }} required><option value="">Choose a career family</option>{data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}</select>
        <select aria-label="Shared role profile" className={fieldClass} value={roleProfile} onChange={(event) => setRoleProfile(event.target.value)} required><option value="">Choose a shared profile</option>{profilesForRoleFamily.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
        <textarea aria-label="Title-specific focus" className={fieldClass} value={roleFocus} onChange={(event) => setRoleFocus(event.target.value)} placeholder="Optional focus specific to this exact title" />
        <select aria-label="Published curriculum track" className={fieldClass} value={roleRoadmap} onChange={(event) => setRoleRoadmap(event.target.value)}><option value="">No specialist track (core curriculum)</option>{data.roadmaps.map((roadmap) => <option key={roadmap.id} value={roadmap.id}>{roadmap.title}</option>)}</select>
        <p className="text-xs leading-5 text-muted">A role uses the core curriculum by default. Map a detailed track only after checking that its content fits this title.</p>
        <Button type="submit" disabled={busy !== null || profilesForRoleFamily.length === 0}><Plus className="size-4" />{busy === "role" ? "Adding…" : "Add title"}</Button>
      </form></CardContent></Card>
    </div>
    <Card><CardContent className="p-5"><h3 className="mb-3 font-medium">Current catalog</h3><p className="mb-3 text-sm text-muted">{data.roles.filter((role) => role.is_active).length} active titles · {data.profiles.filter((profile) => profile.is_active).length} active profiles · {data.families.length} families</p><div className="max-h-72 space-y-2 overflow-y-auto">{data.roles.map((role) => <div key={role.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 text-sm last:border-0"><span className={role.is_active ? "" : "text-muted line-through"}>{targetNames.get(role.target_role_id) ?? role.target_role_id}</span><span className="ml-auto text-xs text-muted">{role.curriculum_status === "mapped_to_detailed_track" ? role.roadmap_id : "Core curriculum"}</span><Button type="button" size="sm" variant="outline" onClick={() => void setRoleActive(role, !role.is_active)}>{role.is_active ? "Deactivate" : "Activate"}</Button></div>)}</div></CardContent></Card>
  </section>;
}
