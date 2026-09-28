import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/career-role-catalog.json"), "utf8"));
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const unique = (items) => new Set(items).size === items.length;

if (catalog.families.length !== 10) fail(`expected 10 career families, found ${catalog.families.length}`);
if (catalog.profiles.length !== 50) fail(`expected 50 shared role profiles, found ${catalog.profiles.length}`);
if (catalog.roles.length !== 118) fail(`expected 118 job titles, found ${catalog.roles.length}`);
if (!unique(catalog.families.map((item) => item.id))) fail("career family ids are not unique");
if (!unique(catalog.profiles.map((item) => item.id))) fail("profile ids are not unique");
if (!unique(catalog.roles.map((item) => item.id))) fail("role slugs are not unique");
if (!unique(catalog.roles.map((item) => item.target_role_id))) fail("target role ids are not unique");

const familyIds = new Set(catalog.families.map((item) => item.id));
const profileIds = new Set(catalog.profiles.map((item) => item.id));
const roleNames = catalog.roles.map((item) => item.title.toLowerCase());
if (!unique(roleNames)) fail("role titles are not unique (case insensitive)");
for (const family of catalog.families) if (!family.description?.trim()) fail(`family ${family.id} has no description`);
for (const profile of catalog.profiles) {
  if (!familyIds.has(profile.family_id)) fail(`profile ${profile.id} references unknown family ${profile.family_id}`);
  for (const key of ["prerequisites", "core_skills", "tool_stack", "project_blueprints", "interview_focus", "portfolio_evidence"]) {
    if (!Array.isArray(profile[key]) || profile[key].length === 0) fail(`profile ${profile.id} has no ${key}`);
  }
  if (profile.core_skills.length < 5) fail(`profile ${profile.id} has fewer than five core skills`);
  if (profile.tool_stack.length < 5) fail(`profile ${profile.id} has fewer than five tools/technologies`);
  if (profile.project_blueprints.length < 2) fail(`profile ${profile.id} has fewer than two project briefs`);
  if (profile.interview_focus.length < 4) fail(`profile ${profile.id} has fewer than four interview focus areas`);
}
for (const role of catalog.roles) {
  if (!familyIds.has(role.family_id)) fail(`role ${role.id} references unknown family`);
  if (!profileIds.has(role.profile_id)) fail(`role ${role.id} references unknown profile ${role.profile_id}`);
  if (!roleNames.includes(role.title.toLowerCase())) fail(`role ${role.id} title is missing`);
  if (role.curriculum_status === "mapped_to_detailed_track" && !role.roadmap_id) fail(`mapped role ${role.id} has no roadmap`);
  if (role.curriculum_status === "core_curriculum" && role.roadmap_id) fail(`core role ${role.id} unexpectedly has a roadmap`);
}

const mappedIds = catalog.roles.filter((role) => role.roadmap_id).map((role) => role.id).sort();
const expectedMappedIds = ["frontend-developer", "react-developer", "full-stack-developer", "full-stack-engineer", "software-engineer", "java-developer", "java-backend-engineer", "spring-boot-developer"].sort();
if (JSON.stringify(mappedIds) !== JSON.stringify(expectedMappedIds)) fail(`unexpected detailed-track role mapping: ${mappedIds.join(", ")}`);
for (const incorrect of ["backend-developer", "devops-engineer", "cloud-engineer", "qa-engineer", "data-analyst"]) {
  if (catalog.roles.find((role) => role.id === incorrect)?.roadmap_id) fail(`unrelated title ${incorrect} is mapped to a detailed track`);
}

const migration = fs.readFileSync(path.join(root, "supabase/migrations/0087_career_role_catalog.sql"), "utf8");
const versionedTracks = fs.readFileSync(path.join(root, "supabase/migrations/0078_versioned_curriculum_tracks.sql"), "utf8");
const trackSeed = fs.readFileSync(path.join(root, "supabase/seed_roadmap_tracks.sql"), "utf8");
for (const table of ["career_families", "career_role_profiles", "career_roles"]) {
  if (!migration.includes(`public.${table}`)) fail(`migration 0087 does not create or seed ${table}`);
}
if (!migration.includes("public.is_admin()")) fail("catalog writes are not admin-gated");
if (!migration.includes("public.role_skill_requirements")) fail("catalog skills are not connected to role readiness requirements");
if (!migration.includes("role_roadmap_assignments_admin_write")) fail("role-track writes are not admin-gated");
if (!migration.includes("admin_sync_career_role_skills")) fail("admin-created roles do not synchronize into the readiness skill engine");
for (const roadmapId of ["zte-frontend-v1", "zte-backend-java-v1", "zte-fullstack-v1"]) {
  if (!versionedTracks.includes(roadmapId) || !migration.includes(roadmapId)) fail(`roadmap shell ${roadmapId} is missing from ordered migrations`);
}
for (const role of catalog.roles.filter((item) => item.roadmap_id)) {
  if (!trackSeed.includes(`('${role.target_role_id}','${role.roadmap_id}',0)`)) fail(`generated track seed is missing the assignment for ${role.target_role_id}`);
}
for (const role of catalog.roles) if (!migration.includes(`'${role.target_role_id.replaceAll("'", "''")}'`)) fail(`migration is missing target role ${role.target_role_id}`);

if (!process.exitCode) console.log(`PASS: ${catalog.families.length} families, ${catalog.profiles.length} profiles, ${catalog.roles.length} roles, ${mappedIds.length} evidence-based detailed-track mappings.`);
