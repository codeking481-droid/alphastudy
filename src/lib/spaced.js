// Simple spaced-review scheduler (SM-2 inspired intervals in days).

const INTERVALS = [1, 3, 7, 16, 35];

export function scheduleNextReview(score, _prevNext) {
  let idx = 0;
  if (score >= 80) idx = 4;
  else if (score >= 65) idx = 3;
  else if (score >= 45) idx = 2;
  else idx = 1;
  const days = INTERVALS[idx];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}