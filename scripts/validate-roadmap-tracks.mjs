import { buildRoadmapTrackCatalog } from "./roadmap-track-catalog.mjs";

const tracks = buildRoadmapTrackCatalog();
const errors = [];
const roadmapIds = new Set();
let totalPhases = 0;
let totalTopics = 0;
let totalProjects = 0;

for (const track of tracks) {
  if (roadmapIds.has(track.id)) errors.push(`duplicate roadmap id ${track.id}`);
  roadmapIds.add(track.id);
  if (!track.title || !track.description || !track.track) errors.push(`${track.id}: missing catalog metadata`);
  if ((track.phases ?? []).length < 5) errors.push(`${track.id}: roadmap depth requires at least five phases`);
  const phaseIds = new Set();
  for (const [phaseIndex, phase] of (track.phases ?? []).entries()) {
    totalPhases++;
    if (phaseIds.has(phase.id)) errors.push(`${track.id}: duplicate phase id ${phase.id}`);
    phaseIds.add(phase.id);
    if (phaseIndex && phase.order_index != null && phase.order_index <= track.phases[phaseIndex - 1].order_index) errors.push(`${phase.id}: non-increasing phase order`);
    if (!phase.title || !phase.description || !["Foundation", "Core", "Advanced", "Expert"].includes(phase.band)) errors.push(`${phase.id}: incomplete phase definition`);
    if ((phase.modules ?? []).length < 2) errors.push(`${phase.id}: each phase needs at least two coherent modules`);
    if (!(phase.projects ?? []).length) errors.push(`${phase.id}: phase needs an applied project`);
    totalProjects += phase.projects?.length ?? 0;
    for (const project of phase.projects ?? []) {
      for (const key of ["problem", "requirements", "milestones", "deliverables", "skills"]) {
        if (!project[key] || (Array.isArray(project[key]) && project[key].length < 2)) errors.push(`${phase.id}/${project.title}: insufficient project ${key}`);
      }
    }
    for (const curriculumModule of phase.modules ?? []) {
      if (!curriculumModule.title || (curriculumModule.topics ?? []).length < 2) errors.push(`${phase.id}: module needs a title and at least two topics`);
      for (const topic of curriculumModule.topics ?? []) {
        totalTopics++;
        if (!topic.title || !Number.isInteger(topic.minutes) || topic.minutes < 30) errors.push(`${phase.id}/${curriculumModule.title}: invalid topic title or duration`);
        for (const [key, minimum] of [["objectives", 2], ["practice", 2], ["evidence", 1]]) {
          if (!Array.isArray(topic[key]) || topic[key].length < minimum || topic[key].some((item) => !String(item).trim())) errors.push(`${phase.id}/${topic.title}: needs at least ${minimum} ${key} item(s)`);
        }
        if (!["beginner", "intermediate", "advanced"].includes(topic.difficulty)) errors.push(`${phase.id}/${topic.title}: invalid difficulty`);
      }
    }
  }
}

if (!tracks.length) errors.push("no roadmap tracks provided");
for (const track of tracks) {
  const trackTopicCount = track.phases.reduce((sum, phase) => sum + phase.modules.reduce((moduleSum, module) => moduleSum + module.topics.length, 0), 0);
  const trackProjectCount = track.phases.reduce((sum, phase) => sum + phase.projects.length, 0);
  if (track.phases.length < 21) errors.push(`${track.id}: curriculum must match the existing 21-phase roadmap depth`);
  if (trackTopicCount < 375) errors.push(`${track.id}: curriculum must match the existing 375-topic roadmap depth`);
  if (trackProjectCount < 179) errors.push(`${track.id}: curriculum must include at least 179 applied projects`);
}
console.log(`roadmap track validation: ${tracks.length} tracks, ${totalPhases} phases, ${totalTopics} detailed topics, ${totalProjects} applied projects`);
if (errors.length) {
  console.error(`${errors.length} validation error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("content structure passed; subject-matter quality still requires expert review");
}
