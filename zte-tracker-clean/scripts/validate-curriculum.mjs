import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const seed = readJson("data/seed.json");
const manualDays = readJson("src/data/manual-days.json");
const errors = [];
const warnings = [];
const strict = process.argv.includes("--strict");
const duplicateIds = (rows, label) => {
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.id)) errors.push(`duplicate ${label} id: ${row.id}`);
    seen.add(row.id);
  }
};

const phases = Array.isArray(seed.phases) ? seed.phases : [];
const stages = Array.isArray(seed.stages) ? seed.stages : [];
const topics = Array.isArray(seed.topics) ? seed.topics : [];
const technologies = Array.isArray(seed.technologies) ? seed.technologies : [];
const phaseIds = new Set(phases.map((phase) => phase.id));
const stageMap = new Map(stages.map((stage) => [stage.id, stage]));
const technologyIds = new Set(technologies.map((technology) => technology.id));

duplicateIds(phases, "phase");
duplicateIds(stages, "stage");
duplicateIds(topics, "topic");

const topicTitles = new Map();
for (const topic of topics) {
  if (!phaseIds.has(topic.phase_id)) errors.push(`topic ${topic.id} references missing phase ${topic.phase_id}`);
  if (topic.stage_id && !stageMap.has(topic.stage_id)) errors.push(`topic ${topic.id} references missing stage ${topic.stage_id}`);
  if (topic.stage_id && stageMap.has(topic.stage_id) && stageMap.get(topic.stage_id).phase_id !== topic.phase_id) {
    errors.push(`topic ${topic.id} stage ${topic.stage_id} belongs to a different phase`);
  }
  if (topic.estimated_hours == null) {
    warnings.push(`topic ${topic.id} has no estimated_hours value`);
  } else if (!Number.isFinite(topic.estimated_hours) || topic.estimated_hours <= 0) {
    errors.push(`topic ${topic.id} has an invalid estimated_hours value`);
  }
  const titleKey = String(topic.title ?? "").trim().toLowerCase();
  if (titleKey) {
    const previous = topicTitles.get(titleKey);
    if (previous) warnings.push(`duplicate topic title: ${topic.title} (${previous} and ${topic.id})`);
    topicTitles.set(titleKey, topic.id);
  }
}

for (const mapping of Array.isArray(seed.topic_technologies) ? seed.topic_technologies : []) {
  if (!topics.some((topic) => topic.id === mapping.topic_id)) errors.push(`technology mapping references missing topic ${mapping.topic_id}`);
  if (!technologyIds.has(mapping.technology_id)) errors.push(`technology mapping references missing technology ${mapping.technology_id}`);
}

const dayNumbers = Object.values(manualDays)
  .map((day) => Number(day.day))
  .filter(Number.isInteger)
  .sort((a, b) => a - b);
const expectedDays = dayNumbers.length ? Array.from({ length: dayNumbers.at(-1) }, (_, index) => index + 1) : [];
if (dayNumbers.length !== new Set(dayNumbers).size) errors.push("manual-days.json contains duplicate day numbers");
if (expectedDays.some((day, index) => day !== dayNumbers[index])) errors.push("manual-days.json has gaps in its day-number sequence");

const estimatedHours = topics.reduce((total, topic) => total + Number(topic.estimated_hours || 0), 0);
const summary = `curriculum validation: ${phases.length} phases, ${topics.length} topics, ${dayNumbers.length} days, ${estimatedHours} estimated hours`;
if (errors.length) {
  console.error(`${summary}; ${errors.length} error(s), ${warnings.length} warning(s)`);
  for (const error of errors) console.error(`- ${error}`);
  for (const warning of warnings) console.error(`- warning: ${warning}`);
  process.exitCode = 1;
} else {
  console.log(`${summary}; structural checks passed${warnings.length ? ` with ${warnings.length} warning(s)` : ""}`);
  if (strict && warnings.length) {
    console.error("strict curriculum validation failed because warnings are treated as errors");
    process.exitCode = 1;
  }
}
