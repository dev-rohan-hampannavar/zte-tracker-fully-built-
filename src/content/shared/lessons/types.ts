export interface LessonExample {
  title: string;
  lang?: string;
  code?: string;
  walkthrough: string[];
}

export interface LessonQuestion {
  q: string;
  options: string[];
  answer: number; // index into options
  why: string;
}

export interface Lesson {
  id: string;
  familyId: string;
  /** Set on lessons written for one role-specific path (a PROFILE_PATHS id). */
  pathId?: string;
  /** Must equal the title of an add-on module of the lesson's path in role-paths.ts. */
  module: string;
  title: string;
  minutes: number;
  objectives: string[];
  explain: string[];
  keyIdeas: string[];
  example: LessonExample;
  practice: { task: string; hint: string }[];
  quiz: LessonQuestion[];
  pitfalls: string[];
}
