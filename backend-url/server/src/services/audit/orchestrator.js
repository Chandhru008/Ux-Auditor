import { v4 as uuidv4 } from 'uuid';
import { auditRepository } from '../../store/repository.js';
import PlaywrightAuditor from '../playwright/auditor.js';
import { captureIssueScreenshots, verifyScreenshotExists } from '../playwright/issueScreenshots.js';
import { runWcagChecks, runWcagPageChecks } from '../checks/wcag/index.js';
import { runHeuristicChecks } from '../checks/heuristics/index.js';
import AiRecommendationService from '../ai/recommendations.js';
import { calculateScores, buildSummary } from '../scoring/index.js';
import ReportGenerator from '../reporting/generator.js';

/**
 * Orchestrates the full audit pipeline.
 */
export class AuditOrchestrator {
  constructor(io) {
    this.io = io;
  }

  async startAudit(url, existingId = null) {
    const auditId = existingId || uuidv4();
    const normalizedUrl = this.normalizeUrl(url);

    let report = await auditRepository.findById(auditId);
    if (!report) {
      report = await auditRepository.create({
        _id: auditId,
        url: normalizedUrl,
        status: 'running',
        startedAt: new Date(),
        progress: { stage: 'init', percent: 0, message: 'Starting audit...' },
      });
    } else {
      await auditRepository.findByIdAndUpdate(auditId, {
        status: 'running',
        startedAt: new Date(),
      });
    }

    this.emitProgress(auditId, 'init', 0, 'Audit queued...');
    this.runPipeline(auditId, normalizedUrl).catch(async (err) => {
      console.error(`Audit ${auditId} failed:`, err);
      this.io.to(auditId).emit('audit:error', { error: err.message || 'Audit failed' });
      await auditRepository.findByIdAndUpdate(auditId, { status: 'failed' }).catch(() => {});
    });

    return { auditId, url: normalizedUrl };
  }

  async runPipeline(auditId, url) {
    const emit = (stage, percent, message) => this.emitProgress(auditId, stage, percent, message);

    let session = null;

    try {
      const playwright = new PlaywrightAuditor(auditId, (p) => emit(p.stage, p.percent, p.message));
      session = await playwright.run(url);
      const { page, pageData, assets, html } = session;

      emit('checks', 52, 'Running WCAG accessibility checks...');
      const wcagStatic = runWcagChecks(pageData, html);
      const wcagLive = await runWcagPageChecks(page);

      emit('checks', 58, 'Running Nielsen UX heuristic checks...');
      const heuristicIssues = runHeuristicChecks(pageData, url);

      const rawIssues = [...wcagStatic, ...wcagLive, ...heuristicIssues].map((issue, i) => ({
        ...issue,
        id: issue.id || `issue-${i}`,
      }));

      emit('screenshots', 70, 'Capturing vulnerability screenshots with highlights...');
      let issuesWithScreenshots = await captureIssueScreenshots(
        page,
        rawIssues,
        auditId,
        (p) => emit(p.stage, p.percent, p.message)
      );

      emit('ai', 80, 'Generating AI-powered recommendations...');
      const ai = new AiRecommendationService((p) => emit(p.stage, p.percent, p.message));
      let enrichedIssues = await ai.enrichIssues(issuesWithScreenshots, {
        url,
        title: pageData.title,
      });

      // Ensure every issue retains a valid screenshot path
      enrichedIssues = enrichedIssues.map((issue, i) => ({
        ...issue,
        screenshot: issue.screenshot || issuesWithScreenshots[i]?.screenshot || null,
      }));

      // Retry capture for any issues still missing screenshots (same page session)
      const missing = enrichedIssues.filter((i) => !i.screenshot || !verifyScreenshotExists(i.screenshot));
      if (missing.length > 0) {
        emit('screenshots', 78, `Retrying ${missing.length} missing vulnerability screenshots...`);
        const retried = await captureIssueScreenshots(page, missing, auditId);
        const retriedMap = new Map(retried.map((r) => [r.id, r.screenshot]));
        enrichedIssues = enrichedIssues.map((issue) => ({
          ...issue,
          screenshot: retriedMap.get(issue.id) || issue.screenshot,
        }));
      }

      await session.finalize();
      session = null;

      const withScreenshots = enrichedIssues.filter((i) => i.screenshot).length;
      console.log(`Audit ${auditId}: ${withScreenshots}/${enrichedIssues.length} issues have screenshots`);

      emit('scoring', 92, 'Calculating scores...');
      const scores = calculateScores(enrichedIssues);
      const summary = buildSummary(enrichedIssues, scores);

      emit('report', 95, 'Generating downloadable report...');
      const reportGen = new ReportGenerator(auditId);
      const reportFiles = await reportGen.generate({
        url,
        scores,
        issues: enrichedIssues,
        assets,
        completedAt: new Date(),
      });

      const completedAt = new Date();
      const startedAt = (await auditRepository.findById(auditId))?.startedAt || completedAt;

      await auditRepository.findByIdAndUpdate(auditId, {
        status: 'completed',
        completedAt,
        duration: completedAt - startedAt,
        scores,
        pageData: {
          title: pageData.title,
          language: pageData.language,
          metaDescription: pageData.metaDescription,
          headings: pageData.headings,
          links: pageData.links?.length,
          buttons: pageData.buttons?.length,
          forms: pageData.forms,
          htmlLength: pageData.htmlLength,
          cssRulesCount: pageData.cssRulesCount,
        },
        assets: {
          ...assets,
          reportJson: reportFiles.jsonPath,
          reportHtml: reportFiles.htmlPath,
        },
        issues: enrichedIssues,
        summary,
        progress: { stage: 'complete', percent: 100, message: 'Audit complete!' },
      });

      emit('complete', 100, 'Audit complete!');
      this.io?.to(auditId).emit('audit:complete', { auditId });
    } catch (error) {
      if (session?.finalize) await session.finalize().catch(() => {});
      await auditRepository.findByIdAndUpdate(auditId, {
        status: 'failed',
        error: error.message,
        progress: { stage: 'error', percent: 0, message: error.message },
      });
      this.io?.to(auditId).emit('audit:error', { auditId, error: error.message });
    }
  }

  emitProgress(auditId, stage, percent, message) {
    const progress = { stage, percent, message };
    auditRepository.findByIdAndUpdate(auditId, { progress }).catch(() => {});
    this.io?.to(auditId).emit('audit:progress', { auditId, progress });
  }

  normalizeUrl(url) {
    let u = url.trim();
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    return u;
  }
}

export default AuditOrchestrator;
