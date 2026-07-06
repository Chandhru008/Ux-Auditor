/**
 * API end-to-end audit test.
 * Usage: node scripts/api-test.js [url]
 */
const API = 'http://localhost:3001';
const url = process.argv[2] || 'https://example.com';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('Health:', await fetch(`${API}/api/health`).then((r) => r.json()));

  console.log(`\nStarting audit for ${url}...`);
  const startRes = await fetch(`${API}/api/audits/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const { auditId } = await startRes.json();
  console.log('Audit ID:', auditId);

  let report;
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    report = await fetch(`${API}/api/audits/${auditId}`).then((r) => r.json());
    const { status, progress } = report;
    console.log(`[${i + 1}] ${status} — ${progress?.percent ?? 0}% ${progress?.message ?? ''}`);
    if (status === 'completed' || status === 'failed') break;
  }

  if (report?.status === 'completed') {
    console.log('\n========== API AUDIT COMPLETE ==========');
    console.log(JSON.stringify({
      url: report.url,
      auditId: report._id,
      scores: report.scores,
      issueCount: report.issues?.length,
      assets: report.assets,
      topIssues: report.issues?.slice(0, 3).map((i) => ({
        title: i.title,
        severity: i.severity,
        priority: i.priority,
      })),
      dashboard: `http://localhost:5173/audit/${report._id}`,
    }, null, 2));
  } else {
    console.error('Audit did not complete:', report?.status, report?.error);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
