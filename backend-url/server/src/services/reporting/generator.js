import fs from 'fs/promises';
import path from 'path';
import { config } from '../../config/index.js';

/**
 * Generates downloadable HTML and JSON audit reports.
 */
export class ReportGenerator {
  constructor(auditId) {
    this.auditId = auditId;
    this.outputDir = path.join(config.outputDir, auditId);
  }

  async generate(report) {
    await fs.mkdir(this.outputDir, { recursive: true });

    const jsonPath = path.join(this.outputDir, 'report.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

    const htmlPath = path.join(this.outputDir, 'report.html');
    await fs.writeFile(htmlPath, this.buildHtmlReport(report), 'utf-8');

    return {
      jsonPath: `/outputs/${this.auditId}/report.json`,
      htmlPath: `/outputs/${this.auditId}/report.html`,
    };
  }

  buildHtmlReport(report) {
    const issuesHtml = (report.issues || [])
      .map(
        (issue) => `
      <div class="issue ${issue.severity}">
        <h3>${this.escape(issue.title)} <span class="badge">${issue.severity}</span></h3>
        <p><strong>Category:</strong> ${issue.category} | <strong>Priority:</strong> ${issue.priority} | <strong>Fix time:</strong> ${issue.estimatedFixTime}</p>
        <p>${this.escape(issue.explanation || issue.description)}</p>
        ${issue.screenshot ? `<div class="screenshot"><img src="${issue.screenshot}" alt="Issue highlight" style="max-width:100%;border:2px solid #ef4444;border-radius:8px;margin:12px 0"></div>` : ''}
        <div class="code-block">
          <h4>Original</h4>
          <pre>${this.escape(issue.originalCode || '')}</pre>
          <h4>Fixed</h4>
          <pre>${this.escape(issue.fixedCode || '')}</pre>
        </div>
      </div>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Report — ${this.escape(report.url)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; background: #0f172a; color: #e2e8f0; }
    h1 { color: #38bdf8; }
    .scores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 2rem 0; }
    .score-card { background: #1e293b; padding: 1.5rem; border-radius: 12px; text-align: center; }
    .score-card .value { font-size: 2.5rem; font-weight: bold; color: #38bdf8; }
    .issue { background: #1e293b; padding: 1.5rem; border-radius: 12px; margin: 1rem 0; border-left: 4px solid #64748b; }
    .issue.critical { border-color: #ef4444; }
    .issue.serious { border-color: #f97316; }
    .issue.moderate { border-color: #eab308; }
    .issue.minor { border-color: #22c55e; }
    .badge { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 4px; background: #334155; }
    pre { background: #0f172a; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; }
    .screenshots img { max-width: 100%; border-radius: 8px; margin: 0.5rem 0; }
  </style>
</head>
<body>
  <h1>UX & Accessibility Audit Report</h1>
  <p><strong>URL:</strong> ${this.escape(report.url)}</p>
  <p><strong>Date:</strong> ${new Date(report.completedAt || Date.now()).toLocaleString()}</p>

  <div class="scores">
    <div class="score-card"><div class="value">${report.scores?.overall ?? '—'}</div><div>Overall (${report.scores?.grade ?? '—'})</div></div>
    <div class="score-card"><div class="value">${report.scores?.wcag ?? '—'}</div><div>WCAG</div></div>
    <div class="score-card"><div class="value">${report.scores?.heuristic ?? '—'}</div><div>UX Heuristics</div></div>
    <div class="score-card"><div class="value">${report.issues?.length ?? 0}</div><div>Issues</div></div>
  </div>

  <div class="screenshots">
    <h2>Screenshots</h2>
    ${report.assets?.desktopScreenshot ? `<img src="${report.assets.desktopScreenshot}" alt="Desktop screenshot">` : ''}
    ${report.assets?.mobileScreenshot ? `<img src="${report.assets.mobileScreenshot}" alt="Mobile screenshot">` : ''}
  </div>

  <h2>Issues (${report.issues?.length ?? 0})</h2>
  ${issuesHtml}
</body>
</html>`;
  }

  escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export default ReportGenerator;
