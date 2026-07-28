export interface Score {
  hardViolations: number;
  softViolations: number;
  totalPenalty: number;
  value: number;
  max: 100;
}

export const MAX_SCORE = 100;

export function makeScore(hardViolations: number, softViolations: number, totalPenalty: number): Score {
  const value =
    hardViolations > 0 ? 0 : Math.max(0, Math.min(MAX_SCORE, Math.round(MAX_SCORE - totalPenalty)));
  return { hardViolations, softViolations, totalPenalty, value, max: MAX_SCORE };
}

export function isPerfectScore(score: Score): boolean {
  return score.hardViolations === 0 && score.value === MAX_SCORE;
}
