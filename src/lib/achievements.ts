export interface AchievementInput {
  phasesCompleted: number;
  totalPhases: number;
  topicsCompleted: number;
  dsaCompleted: number;
  dsaHard: number;
  projectsShipped: number;
  streakDays?: number;
  // Career OS additions — computed from the same real tables Phases 1-9
  // already read (goals, career_tracker, interview_attempts). Optional so
  // every existing caller of computeAllAchievements keeps working
  // unchanged if it doesn't pass these.
  goalsCompleted?: number;
  applicationsSubmitted?: number;
  offersReceived?: number;
  interviewAttemptsLogged?: number;
  skillsWithEvidence?: number;
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
    // Career OS badges — reward the parts of the job search that are easy
    // to neglect (applying, practicing interviews, finishing what you
    // start), not just curriculum progress.
    { id: "first-goal", label: "Goal setter", description: "Complete your first goal" },
    { id: "five-goals", label: "Goal crusher", description: "Complete 5 goals" },
    { id: "first-application", label: "In the arena", description: "Submit your first job application" },
    { id: "ten-applications", label: "Volume player", description: "Submit 10 job applications" },
    { id: "first-offer", label: "Got an offer", description: "Receive your first offer" },
    { id: "interview-warmup", label: "Interview warm-up", description: "Log 10 interview practice attempts" },
    { id: "interview-grinder", label: "Interview grinder", description: "Log 50 interview practice attempts" },
    { id: "skill-collector", label: "Skill collector", description: "Build evidence in 5 different skills" },
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
  if ((input.goalsCompleted ?? 0) >= 1) earnedIds.add("first-goal");
  if ((input.goalsCompleted ?? 0) >= 5) earnedIds.add("five-goals");
  if ((input.applicationsSubmitted ?? 0) >= 1) earnedIds.add("first-application");
  if ((input.applicationsSubmitted ?? 0) >= 10) earnedIds.add("ten-applications");
  if ((input.offersReceived ?? 0) >= 1) earnedIds.add("first-offer");
  if ((input.interviewAttemptsLogged ?? 0) >= 10) earnedIds.add("interview-warmup");
  if ((input.interviewAttemptsLogged ?? 0) >= 50) earnedIds.add("interview-grinder");
  if ((input.skillsWithEvidence ?? 0) >= 5) earnedIds.add("skill-collector");

  return defs.map((d) => ({ ...d, earned: earnedIds.has(d.id) }));
}

/** Convenience: only the earned subset, for compact display (e.g. public profile). */
export function computeAchievements(input: AchievementInput): Achievement[] {
  return computeAllAchievements(input).filter((a) => a.earned);
}
