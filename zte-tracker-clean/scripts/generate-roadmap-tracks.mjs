import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRoadmapTrackCatalog } from "./roadmap-track-catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tracks = buildRoadmapTrackCatalog();
const sql = (value) => value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const textArray = (values) => `array[${values.map(sql).join(", ")}]::text[]`;
const lines = [
  "-- Generated from data/roadmap-tracks.json + data/seed.json by scripts/generate-roadmap-tracks.mjs.",
  "-- Adds each role focus to a 21-phase conversion of the authored ZTE curriculum.",
  "-- Existing owner curriculum tables and user progress are not modified.",
  "begin;",
];

for (const track of tracks) {
  lines.push(`insert into public.roadmaps (id, title, track, description, is_public) values (${sql(track.id)}, ${sql(track.title)}, ${sql(track.track)}, ${sql(track.description)}, true) on conflict (id) do update set title=excluded.title, track=excluded.track, description=excluded.description, is_public=true;`);
  lines.push(`update public.roadmap_versions set is_current=false where roadmap_id=${sql(track.id)};`);
  lines.push(`insert into public.roadmap_versions (roadmap_id, version_number, label, is_current) values (${sql(track.id)}, 2, 'v2.0', true) on conflict (roadmap_id, version_number) do update set label=excluded.label, is_current=true returning id;`);
  for (const [phaseIndex, phase] of track.phases.entries()) {
    const phaseId = `${track.id}-${phase.id}`;
    lines.push(`insert into public.roadmap_phases (id, roadmap_id, roadmap_version_id, phase_number, title, band, description, estimated_hours, order_index) select ${sql(phaseId)}, ${sql(track.id)}, id, ${sql(String(phaseIndex + 1).padStart(2, "0"))}, ${sql(phase.title)}, ${sql(phase.band)}, ${sql(phase.description)}, ${phase.estimated_hours}, ${phaseIndex} from public.roadmap_versions where roadmap_id=${sql(track.id)} and version_number=2 on conflict (id) do update set title=excluded.title, band=excluded.band, description=excluded.description, estimated_hours=excluded.estimated_hours, order_index=excluded.order_index;`);
    for (const [moduleIndex, module] of phase.modules.entries()) {
      const moduleId = `${phaseId}-m${String(moduleIndex + 1).padStart(2, "0")}`;
      lines.push(`insert into public.roadmap_modules (id, phase_id, module_number, title, description, estimated_hours, order_index) values (${sql(moduleId)}, ${sql(phaseId)}, ${moduleIndex + 1}, ${sql(module.title)}, ${sql(module.description)}, ${module.hours}, ${moduleIndex}) on conflict (id) do update set title=excluded.title, description=excluded.description, estimated_hours=excluded.estimated_hours, order_index=excluded.order_index;`);
      for (const [topicIndex, topic] of module.topics.entries()) {
        const topicId = `${moduleId}-t${String(topicIndex + 1).padStart(2, "0")}`;
        const prerequisites = topicIndex ? [`${moduleId}-t${String(topicIndex).padStart(2, "0")}`] : [];
        const resources = JSON.stringify(topic.learning_resources ?? []);
        lines.push(`insert into public.roadmap_topics (id, module_id, title, learning_objectives, practice_tasks, completion_evidence, prerequisite_topic_ids, learning_resources, estimated_minutes, difficulty, order_index) values (${sql(topicId)}, ${sql(moduleId)}, ${sql(topic.title)}, ${textArray(topic.objectives)}, ${textArray(topic.practice)}, ${textArray(topic.evidence)}, ${textArray(prerequisites)}, ${sql(resources)}::jsonb, ${topic.minutes}, ${sql(topic.difficulty)}, ${topicIndex}) on conflict (id) do update set title=excluded.title, learning_objectives=excluded.learning_objectives, practice_tasks=excluded.practice_tasks, completion_evidence=excluded.completion_evidence, prerequisite_topic_ids=excluded.prerequisite_topic_ids, learning_resources=excluded.learning_resources, estimated_minutes=excluded.estimated_minutes, difficulty=excluded.difficulty, order_index=excluded.order_index;`);
      }
    }
    for (const [projectIndex, project] of phase.projects.entries()) {
      const projectId = `${phaseId}-project-${String(projectIndex + 1).padStart(2, "0")}`;
      lines.push(`insert into public.roadmap_projects (id, phase_id, title, problem_statement, requirements, milestones, deliverables, skills, difficulty, order_index) values (${sql(projectId)}, ${sql(phaseId)}, ${sql(project.title)}, ${sql(project.problem)}, ${textArray(project.requirements)}, ${textArray(project.milestones)}, ${textArray(project.deliverables)}, ${textArray(project.skills)}, ${sql(project.difficulty)}, ${projectIndex}) on conflict (id) do update set title=excluded.title, problem_statement=excluded.problem_statement, requirements=excluded.requirements, milestones=excluded.milestones, deliverables=excluded.deliverables, skills=excluded.skills, difficulty=excluded.difficulty, order_index=excluded.order_index;`);
    }
  }
}

lines.push(
  "delete from public.role_roadmap_assignments where role_id in ('backend-developer','devops-engineer','cloud-engineer','mobile-engineer','qa-engineer','bi-data-analyst','operations-analyst','sde-1');",
  "insert into public.role_roadmap_assignments (role_id, roadmap_id, priority) values",
  "  ('frontend-developer','zte-frontend-v1',0), ('react-developer','zte-frontend-v1',0),",
  "  ('java-developer','zte-backend-java-v1',0), ('java-backend-engineer','zte-backend-java-v1',0), ('spring-boot-developer','zte-backend-java-v1',0),",
  "  ('fullstack-developer','zte-fullstack-v1',0), ('full-stack-engineer','zte-fullstack-v1',0), ('sde-1','zte-fullstack-v1',0)",
  "on conflict (role_id, roadmap_id) do update set priority=excluded.priority;"
);

lines.push("commit;", "");
fs.writeFileSync(path.join(root, "supabase/seed_roadmap_tracks.sql"), lines.join("\n"), "utf8");
console.log(`Wrote supabase/seed_roadmap_tracks.sql (${lines.length} lines)`);
