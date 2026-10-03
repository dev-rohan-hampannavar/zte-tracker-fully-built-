import type { Lesson } from "./types";
import { ALL_PATHS, getRolePath, pathId, type RolePath } from "../role-paths";
import { DATA_AI_LESSONS } from "./data-ai";
import { CLOUD_LESSONS } from "./cloud-infrastructure";
import { QUALITY_LESSONS, SECURITY_LESSONS, MOBILE_LESSONS } from "./quality-security-mobile";
import { SOFTWARE_DEV_LESSONS, DATABASE_LESSONS } from "./software-database";
import { SYSTEMS_LESSONS, ENTERPRISE_LESSONS, SPECIALIZED_LESSONS } from "./systems-enterprise-specialized";
import { DATA_ANALYST_LESSONS } from "./data-analyst";
import { AI_ML_LESSONS_A } from "./ai-ml-engineer-a";
import { AI_ML_LESSONS_B } from "./ai-ml-engineer-b";

export type { Lesson } from "./types";

export const ALL_LESSONS: Lesson[] = [
  ...DATA_AI_LESSONS,
  ...CLOUD_LESSONS,
  ...QUALITY_LESSONS,
  ...SECURITY_LESSONS,
  ...MOBILE_LESSONS,
  ...SOFTWARE_DEV_LESSONS,
  ...DATABASE_LESSONS,
  ...SYSTEMS_LESSONS,
  ...ENTERPRISE_LESSONS,
  ...SPECIALIZED_LESSONS,
  ...DATA_ANALYST_LESSONS,
  ...AI_ML_LESSONS_A,
  ...AI_ML_LESSONS_B,
];

/** Lessons written for the family path itself (not for a role-specific path). */
export function lessonsForFamily(familyId: string | null | undefined): Lesson[] {
  return ALL_LESSONS.filter((l) => l.familyId === familyId && !l.pathId);
}

/**
 * Lessons for any path, in the order of the path's modules. A role-specific path
 * shows its own lessons plus the family lessons for the modules it includes.
 */
export function lessonsForPath(path: RolePath): Lesson[] {
  const id = pathId(path);
  const own = ALL_LESSONS.filter((l) => l.pathId === id);
  const included = path.include
    ? ALL_LESSONS.filter((l) => !l.pathId && l.familyId === path.familyId && path.include!.includes(l.module))
    : [];
  const pool = path.profileIds ? [...own, ...included] : lessonsForFamily(path.familyId);
  const order = (l: Lesson) => path.addOns.findIndex((m) => m.title === l.module);
  return pool
    .map((l, i) => ({ l, i }))
    .sort((a, b) => order(a.l) - order(b.l) || a.i - b.i)
    .map((x) => x.l);
}

export function getLesson(id: string | null | undefined): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}

/** Every path (family or role-specific) that has at least one lesson. */
export function pathsWithLessons(): RolePath[] {
  return ALL_PATHS.filter((p) => lessonsForPath(p).length > 0);
}

/** The path a lesson is shown under by default (its own role path, else its family path). */
export function pathForLesson(lesson: Lesson): RolePath | null {
  if (lesson.pathId) return ALL_PATHS.find((p) => pathId(p) === lesson.pathId) ?? null;
  return getRolePath(lesson.familyId);
}
