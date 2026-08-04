export interface AchievementInput {
  phasesCompleted: number;
  totalPhases: number;
  topicsCompleted: number;
  dsaCompleted: number;
  dsaHard: number;
  projectsShipped: number;
  streakDays?: number;
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

/**
 * Achievements are computed client/server-side from existing progress data —
 * no dedicated table, no write path, nothing to get out of sync. Add a new
 * badge by adding an entry here; it's live everywhere that imports this file.
 */
export function computeAllAchievements(input: AchievementInput): Achievement[] {
  const defs: Omit<Achievement, "earned">[] = [
    { id: "first-topic", label: "First step", description: "Complete your first topic" },
    { id: "first-phase", label: "Phase one", description: "Complete your first phase" },
    { id: "quarter-way", label: "Quarter through", description: "Complete 25% of all phases" },
    { id: "halfway", label: "Halfway there", description: "Complete 50% of all phases" },
    { id: "three-quarter", label: "Home stretch", description: "Complete 75% of all phases" },
    { id: "all-phases", label: "Zero to Elite", description: "Complete every phase" },
    { id: "dsa-25", label: "DSA warm-up", description: "Solve 25 DSA problems" },
    { id: "dsa-100", label: "Century", description: "Solve 100 DSA problems" },
    { id: "dsa-250", label: "Grinder", description: "Solve 250 DSA problems" },
    { id: "dsa-hard-10", label: "Hard mode", description: "Solve 10 hard DSA problems" },
    { id: "first-ship", label: "Shipped", description: "Deploy your first project" },
    { id: "three-ships", label: "Serial shipper", description: "Deploy 3 projects" },
    { id: "streak-7", label: "Week streak", description: "Log activity 7 days in a row" },
    { id: "streak-30", label: "Month streak", description: "Log activity 30 days in a row" },
  ];

  const phasePct = input.totalPhases ? input.phasesCompleted / input.totalPhases : 0;
  const streak = input.streakDays ?? 0;

  const earnedIds = new Set<string>();
  if (input.topicsCompleted >= 1) earnedIds.add("first-topic");
  if (input.phasesCompleted >= 1) earnedIds.add("first-phase");
  if (phasePct >= 0.25) earnedIds.add("quarter-way");
  if (phasePct >= 0.5) earnedIds.add("halfway");
  if (phasePct >= 0.75) earnedIds.add("three-quarter");
  if (input.totalPhases > 0 && input.phasesCompleted >= input.totalPhases) earnedIds.add("all-phases");
  if (input.dsaCompleted >= 25) earnedIds.add("dsa-25");
  if (input.dsaCompleted >= 100) earnedIds.add("dsa-100");
  if (input.dsaCompleted >= 250) earnedIds.add("dsa-250");
  if (input.dsaHard >= 10) earnedIds.add("dsa-hard-10");
  if (input.projectsShipped >= 1) earnedIds.add("first-ship");
  if (input.projectsShipped >= 3) earnedIds.add("three-ships");
  if (streak >= 7) earnedIds.add("streak-7");
  if (streak >= 30) earnedIds.add("streak-30");

  return defs.map((d) => ({ ...d, earned: earnedIds.has(d.id) }));
}

/** Convenience: only the earned subset, for compact display (e.g. public profile). */
export function computeAchievements(input: AchievementInput): Achievement[] {
  return computeAllAchievements(input).filter((a) => a.earned);
}
