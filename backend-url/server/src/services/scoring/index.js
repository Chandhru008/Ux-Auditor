const SEVERITY_WEIGHTS = {
  critical: 15,
  serious: 10,
  moderate: 5,
  minor: 2,
};

const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A' },
  { min: 80, grade: 'B' },
  { min: 70, grade: 'C' },
  { min: 60, grade: 'D' },
  { min: 0, grade: 'F' },
];

function scoreCategory(issues) {
  if (!issues.length) return 100;
  const penalty = issues.reduce((sum, issue) => {
    return sum + (SEVERITY_WEIGHTS[issue.severity] || 5);
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function toGrade(score) {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t.grade;
  }
  return 'F';
}

/**
 * Computes overall UX, WCAG, and heuristic scores from audit issues.
 */
export function calculateScores(issues) {
  const wcagIssues = issues.filter((i) => i.category === 'wcag');
  const heuristicIssues = issues.filter((i) => i.category === 'heuristic');

  const wcag = Math.round(scoreCategory(wcagIssues));
  const heuristic = Math.round(scoreCategory(heuristicIssues));
  const overall = Math.round(wcag * 0.55 + heuristic * 0.45);

  return {
    overall,
    grade: toGrade(overall),
    wcag,
    heuristic,
  };
}

export function buildSummary(issues, scores) {
  const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const byCategory = { wcag: 0, heuristic: 0 };

  for (const issue of issues) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
  }

  const totalFixTime = issues.reduce((acc, i) => {
    const match = (i.estimatedFixTime || '').match(/(\d+)/);
    return acc + (match ? parseInt(match[1], 10) : 15);
  }, 0);

  return {
    totalIssues: issues.length,
    bySeverity,
    byCategory,
    estimatedTotalFixTime: `~${totalFixTime} minutes`,
    topPriorities: issues
      .filter((i) => i.priority === 'high')
      .slice(0, 5)
      .map((i) => i.title),
    scores,
  };
}

export default { calculateScores, buildSummary };
