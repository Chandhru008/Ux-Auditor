/**
 * Standalone audit test — runs the full pipeline without API/MongoDB.
 * Usage: node scripts/test-audit.js [url]
 */
import { v4 as uuidv4 } from 'uuid';
import PlaywrightAuditor from '../src/services/playwright/auditor.js';
import { captureIssueScreenshots } from '../src/services/playwright/issueScreenshots.js';
import { runWcagChecks, runWcagPageChecks } from '../src/services/checks/wcag/index.js';
import { runHeuristicChecks } from '../src/services/checks/heuristics/index.js';
import AiRecommendationService from '../src/services/ai/recommendations.js';
import { calculateScores, buildSummary } from '../src/services/scoring/index.js';
import ReportGenerator from '../src/services/reporting/generator.js';

const url = process.argv[2] || 'https://example.com';
const auditId = uuidv4();
const log = (msg) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

async function main() {
  log(`Starting audit for ${url}`);
  const start = Date.now();

  const playwright = new PlaywrightAuditor(auditId, (p) => log(`${p.stage}: ${p.message}`));
  const session = await playwright.run(url);
  const { page, pageData, assets, html } = session;

  const wcagStatic = runWcagChecks(pageData, html);
  const wcagLive = await runWcagPageChecks(page);
  const heuristicIssues = runHeuristicChecks(pageData, url);

  const rawIssues = [...wcagStatic, ...wcagLive, ...heuristicIssues].map((issue, i) => ({
    ...issue,
    id: issue.id || `issue-${i}`,
  }));
  log(`Found ${rawIssues.length} issues`);

  const issuesWithScreenshots = await captureIssueScreenshots(page, rawIssues, auditId, (p) =>
    log(p.message)
  );

  await session.finalize();

  const ai = new AiRecommendationService((p) => log(p.message));
  const enrichedIssues = await ai.enrichIssues(issuesWithScreenshots, { url, title: pageData.title });

  const withShots = enrichedIssues.filter((i) => i.screenshot).length;
  log(`Screenshots: ${withShots}/${enrichedIssues.length}`);

  const scores = calculateScores(enrichedIssues);
  const summary = buildSummary(enrichedIssues, scores);
  const reportGen = new ReportGenerator(auditId);
  await reportGen.generate({ url, scores, issues: enrichedIssues, assets, completedAt: new Date() });

  log(`\n========== AUDIT COMPLETE (${((Date.now() - start) / 1000).toFixed(1)}s) ==========`);
  enrichedIssues.slice(0, 5).forEach((i) => {
    console.log(`  [${i.severity}] ${i.title}`);
    console.log(`    screenshot: ${i.screenshot || 'MISSING'}`);
  });
}

main().catch((err) => { console.error('Audit failed:', err); process.exit(1); });
