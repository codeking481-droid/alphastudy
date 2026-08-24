// Deterministic mastery engine — AI never decides mastery.

export function computeMastery(record) {
  if (!record) return 0;
  const attempts = record.attempts || 0;
  if (attempts === 0) return 0;
  const accuracy = record.correct / attempts;            // 0..1
  const volume = Math.min(attempts / 10, 1);             // enough practice
  const streak = Math.min((record.streak || 0) / 3, 1);  // consistency
  const lastScore = (record.last_score || 0) / 100;      // most recent timed perf
  const score = accuracy * 0.4 + volume * 0.15 + streak * 0.2 + lastScore * 0.25;
  return Math.round(Math.min(100, score * 100));
}

export function isMastered(record) {
  return (
    computeMastery(record) >= 80 &&
    (record.attempts || 0) >= 5 &&
    (record.last_score || 0) >= 70 &&
    !((record.weak_patterns || []).length)
  );
}