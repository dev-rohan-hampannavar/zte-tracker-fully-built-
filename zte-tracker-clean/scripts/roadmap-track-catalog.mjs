import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const orderBy = (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0);
const difficultyFor = (band) => band === "Foundation" ? "beginner" : band === "Core" ? "intermediate" : "advanced";
const TRACK_OVERLAYS = {
  "zte-frontend-v1": [0, 2, 3, 4, 5],
  "zte-backend-java-v1": [0, 4, 5, 16, 18],
  "zte-fullstack-v1": [0, 1, 4, 5, 18],
};
const groupBy = (rows, selector) => {
  const grouped = new Map();
  for (const row of rows) {
    const key = selector(row);
    const items = grouped.get(key) ?? [];
    items.push(row);
    grouped.set(key, items);
  }
  return grouped;
};

function legacyTopic(topic, phase) {
  const groups = (topic.groups ?? []).filter((group) => group && (group.heading || group.bullets?.length));
  const bulletPoints = groups.flatMap((group) => group.bullets ?? []).filter(Boolean);
  const objectives = groups.map((group) => `Explain and apply ${group.heading} in ${topic.title}.`).slice(0, 5);
  while (objectives.length < 2) objectives.push(`Use ${topic.title} to complete a practical task in ${phase.title}.`);
  const practice = bulletPoints.slice(0, 5).map((bullet) => `Demonstrate ${bullet} in a small working example.`);
  if (practice.length < 2) {
    practice.push(`Build a small example that uses ${topic.title}.`);
    practice.push(`Debug or improve that example and record what changed.`);
  }
  const evidence = [
    `Submit a working ${topic.title} example and explain the key decisions.`,
    `Record a short review showing how the example satisfies the ${phase.title} learning goal.`,
  ];
  const hours = Number(topic.estimated_hours) || 1;
  return {
    id: topic.id,
    title: topic.title,
    objectives,
    practice,
    evidence,
    minutes: Math.max(30, Math.round(hours * 60)),
    difficulty: difficultyFor(phase.band),
    order_index: topic.order_index ?? topic.heading_number ?? 0,
  };
}

function legacyProject(project, phase, stage, orderIndex) {
  const title = project.title || project.name || "Applied engineering project";
  const brief = project.description || project.intro || `${title} applies the ideas in ${stage?.title ?? phase.title}.`;
  const skills = [...new Set([phase.title, stage?.title, ...(project.skills ?? [])].filter(Boolean))].slice(0, 8);
  if (skills.length < 2) skills.push("engineering documentation");
  return {
    id: project.id,
    title,
    problem: brief,
    requirements: [
      `Deliver the working outcome described in the ${title} brief.`,
      `Use at least two skills from ${stage?.title ?? phase.title}.`,
      "Document setup, decisions, and known limitations.",
    ],
    milestones: [
      "Write a short plan and split the work into reviewable steps.",
      "Build and refine the working result using the phase concepts.",
      "Review the result, capture evidence, and document what you learned.",
    ],
    deliverables: [
      `Working ${title}`,
      "README with setup instructions and design decisions",
      "Evidence of the result, such as a deployment, recording, or screenshots",
    ],
    skills: skills.length ? skills : [phase.title, "engineering documentation"],
    difficulty: project.difficulty === "hard" ? "advanced" : project.difficulty === "medium" ? "intermediate" : "beginner",
    order_index: orderIndex,
  };
}

function sourceModules(phase, stagesByPhase, topicsByPhase) {
  const phaseStages = (stagesByPhase.get(phase.id) ?? []).slice().sort(orderBy);
  const phaseTopics = (topicsByPhase.get(phase.id) ?? []).slice().sort(orderBy);
  const groups = [];
  const used = new Set();

  for (const stage of phaseStages) {
    const topics = phaseTopics.filter((topic) => topic.stage_id === stage.id);
    topics.forEach((topic) => used.add(topic.id));
    if (topics.length) groups.push({ stage, topics });
  }

  const orphans = phaseTopics.filter((topic) => !used.has(topic.id));
  if (orphans.length) {
    const split = Math.ceil(orphans.length / 2);
    if (phaseStages.length === 0 && orphans.length >= 4) {
      groups.push({ stage: { title: `${phase.title}: foundations`, description: `Core concepts in ${phase.title}.` }, topics: orphans.slice(0, split) });
      groups.push({ stage: { title: `${phase.title}: application`, description: `Practical application in ${phase.title}.` }, topics: orphans.slice(split) });
    } else {
      groups.push({ stage: { title: `${phase.title}: additional topics`, description: `Additional concepts in ${phase.title}.` }, topics: orphans });
    }
  }

  // Merge one-topic source stages into a neighboring module. The material
  // stays intact and the detailed curriculum presents modules with enough
  // substance to work through as a coherent unit.
  for (let index = 0; index < groups.length; index++) {
    if (groups[index].topics.length > 1 || groups.length === 1) continue;
    const neighborIndex = index > 0 ? index - 1 : 1;
    groups[neighborIndex].topics.push(...groups[index].topics);
    groups[neighborIndex].topics.sort(orderBy);
    groups[neighborIndex].stage.title = `${groups[neighborIndex].stage.title} and ${groups[index].stage.title}`;
    groups.splice(index, 1);
    index--;
  }

  return groups.map((group) => ({
    title: group.stage.title,
    description: group.stage.description || `Study and apply ${group.stage.title} in ${phase.title}.`,
    hours: Math.max(1, Number(group.stage.estimated_hours) || group.topics.reduce((sum, topic) => sum + (Number(topic.estimated_hours) || 1), 0)),
    topics: group.topics.map((topic) => legacyTopic(topic, phase)),
  }));
}

export function buildRoadmapTrackCatalog() {
  const owner = JSON.parse(fs.readFileSync(path.join(root, "data/seed.json"), "utf8"));
  const trackData = JSON.parse(fs.readFileSync(path.join(root, "data/roadmap-tracks.json"), "utf8"));
  const stagesByPhase = groupBy(owner.stages ?? [], (stage) => stage.phase_id);
  const topicsByPhase = groupBy(owner.topics ?? [], (topic) => topic.phase_id);
  const stagesById = new Map((owner.stages ?? []).map((stage) => [stage.id, stage]));
  const stageProjectsByPhase = groupBy(owner.stage_projects ?? [], (project) => stagesById.get(project.stage_id)?.phase_id);
  const capstonesByPhase = groupBy(owner.capstones ?? [], (capstone) => capstone.phase_id);

  return trackData.tracks.map((track) => {
    const overlayIndexes = TRACK_OVERLAYS[track.id] ?? [];
    const expandedPhases = (owner.phases ?? []).slice().sort(orderBy).map((phase, phaseIndex) => {
      const modules = sourceModules(phase, stagesByPhase, topicsByPhase);
      const specialist = track.phases[overlayIndexes.indexOf(phaseIndex)];
      if (specialist) {
        for (const trackModule of specialist.modules) modules.push({
          title: `${track.title}: ${trackModule.title}`,
          description: `${trackModule.title} focus for the ${track.title} pathway.`,
          hours: Math.max(1, Math.ceil(trackModule.topics.reduce((sum, topic) => sum + topic.minutes, 0) / 60)),
          topics: trackModule.topics.map((topic, topicIndex) => ({ ...topic, order_index: topicIndex })),
        });
      }

      const stageProjects = stageProjectsByPhase.get(phase.id) ?? [];
      const projects = stageProjects.map((project, index) => legacyProject(project, phase, stagesById.get(project.stage_id), index));
      for (const capstone of capstonesByPhase.get(phase.id) ?? []) {
        projects.push(legacyProject({ ...capstone, name: capstone.title || capstone.name, difficulty: "hard" }, phase, null, projects.length));
      }
      if (specialist) {
        for (const project of specialist.projects ?? []) {
          const skills = [...new Set([...(project.skills ?? []), track.track, "engineering delivery"])].slice(0, 8);
          projects.push({ ...project, skills, order_index: projects.length });
        }
      }
      if (!projects.length) {
        projects.push({
          title: `${phase.title} applied challenge`,
          problem: `Apply the core ideas in ${phase.title} to a small, useful engineering outcome.`,
          requirements: ["Choose a concrete problem that uses the phase concepts.", "Deliver a working result and document setup and decisions."],
          milestones: ["Write the problem and a short plan.", "Build and review the result.", "Capture evidence and a retrospective."],
          deliverables: ["Working implementation", "README with design decisions", "Evidence and retrospective"],
          skills: [phase.title, "engineering documentation"],
          difficulty: difficultyFor(phase.band),
          order_index: 0,
        });
      }

      const stageDescription = (stagesByPhase.get(phase.id) ?? []).slice().sort(orderBy).map((stage) => stage.description).find(Boolean);
      const specialistHours = specialist
        ? specialist.modules.reduce((sum, module) => sum + module.topics.reduce((moduleSum, topic) => moduleSum + topic.minutes, 0), 0) / 60
        : 0;
      return {
        id: `core-${phase.id}`,
        source_phase_id: phase.id,
        title: phase.title,
        band: phase.band,
        description: stageDescription || `Build the skills in ${phase.title} through focused learning and applied practice.`,
        estimated_hours: Math.max(1, (Number(phase.estimated_hours) || 1) + Math.ceil(specialistHours)),
        phase_number: String(phaseIndex + 1).padStart(2, "0"),
        order_index: phaseIndex,
        modules,
        projects,
      };
    });
    return { ...track, phases: expandedPhases };
  });
}
