import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { config } from '../../config/index.js';

const HIGHLIGHT_ID = '__cicaada-highlight__';
const BANNER_ID = '__cicaada-banner__';
const LABEL_ID = '__cicaada-label__';
const VIEWPORT = { width: 1440, height: 900 };
const CLIP_PADDING = 56;
const MIN_BOX = 48;

function sanitizeFilename(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size > 500;
  } catch {
    return false;
  }
}

export function verifyScreenshotExists(publicPath) {
  if (!publicPath) return false;
  const relative = publicPath.replace(/^\/outputs\//, '');
  const filePath = path.join(config.outputDir, relative);
  try {
    const stat = fsSync.statSync(filePath);
    return stat.size > 500;
  } catch {
    return false;
  }
}

function isPageLevelSelector(selector) {
  if (!selector) return true;
  const s = selector.toLowerCase();
  const pageLevel = ['html', 'head', 'title', 'body', 'page', 'meta', 'link'];
  return pageLevel.includes(s) || s.startsWith('meta[') || s === 'nav' || s === 'form';
}

function removeOverlays(page) {
  return page.evaluate(
    ([highlightId, bannerId, labelId]) => {
      [highlightId, bannerId, labelId].forEach((id) => {
        document.getElementById(id)?.remove();
      });
    },
    [HIGHLIGHT_ID, BANNER_ID, LABEL_ID]
  );
}

function expandBox(box) {
  const x = box.x - Math.max(0, (MIN_BOX - box.width) / 2);
  const y = box.y - Math.max(0, (MIN_BOX - box.height) / 2);
  const width = Math.max(box.width, MIN_BOX);
  const height = Math.max(box.height, MIN_BOX);
  return { x, y, width, height };
}

async function injectHighlight(page, box, title, rule) {
  const displayBox = expandBox(box);
  const labelText = rule === 'color-contrast' ? 'VULNERABILITY — Low contrast text' : `VULNERABILITY — ${title}`;

  await page.evaluate(
    ({ box: b, labelText: label, title: t, highlightId, bannerId, labelId }) => {
      [highlightId, bannerId, labelId].forEach((id) => {
        document.getElementById(id)?.remove();
      });

      const banner = document.createElement('div');
      banner.id = bannerId;
      banner.innerHTML =
        `<span style="color:#ef4444;font-weight:800;letter-spacing:0.05em">⚠ VULNERABILITY DETECTED</span>` +
        `<span style="opacity:0.85;margin-left:8px">${t}</span>`;
      banner.style.cssText =
        'position:fixed;top:0;left:0;right:0;padding:12px 16px;background:rgba(127,29,29,0.95);' +
        'border-bottom:3px solid #ef4444;color:#fef2f2;font-family:system-ui,sans-serif;font-size:13px;' +
        'z-index:2147483647;box-sizing:border-box;';
      document.body.appendChild(banner);

      const overlay = document.createElement('div');
      overlay.id = highlightId;
      overlay.style.cssText =
        `position:fixed;left:${b.x}px;top:${b.y}px;width:${b.width}px;height:${b.height}px;` +
        'border:4px solid #ef4444;outline:2px dashed rgba(255,255,255,0.8);' +
        'box-shadow:0 0 0 4px rgba(239,68,68,0.4),0 0 24px rgba(239,68,68,0.5),inset 0 0 16px rgba(239,68,68,0.15);' +
        'pointer-events:none;z-index:2147483646;box-sizing:border-box;background:rgba(239,68,68,0.12);' +
        'animation:cicaada-pulse 1.2s ease-in-out infinite;';
      document.body.appendChild(overlay);

      const style = document.createElement('style');
      style.textContent =
        '@keyframes cicaada-pulse{0%,100%{box-shadow:0 0 0 4px rgba(239,68,68,0.4),0 0 24px rgba(239,68,68,0.5)}' +
        '50%{box-shadow:0 0 0 8px rgba(239,68,68,0.6),0 0 32px rgba(239,68,68,0.7)}}';
      style.id = '__cicaada-style__';
      document.getElementById('__cicaada-style__')?.remove();
      document.head.appendChild(style);

      const labelEl = document.createElement('div');
      labelEl.id = labelId;
      labelEl.textContent = label;
      const labelTop = Math.max(52, b.y - 32);
      labelEl.style.cssText =
        `position:fixed;left:${Math.max(8, b.x)}px;top:${labelTop}px;` +
        'padding:6px 10px;background:#dc2626;color:#fff;font-family:system-ui,sans-serif;font-size:12px;' +
        'font-weight:800;letter-spacing:0.04em;text-transform:uppercase;border-radius:4px;' +
        'z-index:2147483647;max-width:360px;box-shadow:0 4px 12px rgba(0,0,0,0.4);border:2px solid #fca5a5;';
      document.body.appendChild(labelEl);
    },
    {
      box: displayBox,
      labelText,
      title,
      highlightId: HIGHLIGHT_ID,
      bannerId: BANNER_ID,
      labelId: LABEL_ID,
    }
  );
}

async function injectPageLevelHighlight(page, title) {
  await page.evaluate(
    ({ title: t, highlightId, bannerId }) => {
      [highlightId, bannerId].forEach((id) => {
        document.getElementById(id)?.remove();
      });

      const banner = document.createElement('div');
      banner.id = bannerId;
      banner.innerHTML =
        `<span style="color:#ef4444;font-weight:800">⚠ VULNERABILITY DETECTED</span>` +
        `<span style="margin-left:8px">${t}</span>`;
      banner.style.cssText =
        'position:fixed;top:0;left:0;right:0;padding:12px 16px;background:rgba(127,29,29,0.95);' +
        'border-bottom:3px solid #ef4444;color:#fef2f2;font-family:system-ui,sans-serif;font-size:13px;' +
        'z-index:2147483647;';
      document.body.appendChild(banner);

      const overlay = document.createElement('div');
      overlay.id = highlightId;
      overlay.style.cssText =
        'position:fixed;top:56px;left:20px;right:20px;bottom:20px;border:4px dashed #ef4444;' +
        'box-shadow:inset 0 0 0 4px rgba(239,68,68,0.25);pointer-events:none;z-index:2147483646;' +
        'background:rgba(239,68,68,0.06);';
      document.body.appendChild(overlay);

      const label = document.createElement('div');
      label.textContent = 'VULNERABILITY — Page-level issue';
      label.style.cssText =
        'position:fixed;top:64px;left:28px;padding:6px 10px;background:#dc2626;color:#fff;' +
        'font-family:system-ui,sans-serif;font-size:12px;font-weight:800;z-index:2147483647;border-radius:4px;';
      document.body.appendChild(label);
    },
    { title, highlightId: HIGHLIGHT_ID, bannerId: BANNER_ID }
  );
}

function buildClip(box, viewport = VIEWPORT) {
  const x = Math.max(0, box.x - CLIP_PADDING);
  const y = Math.max(0, box.y - CLIP_PADDING);
  const width = Math.min(box.width + CLIP_PADDING * 2, viewport.width - x);
  const height = Math.min(box.height + CLIP_PADDING * 2, viewport.height - y);
  return { x, y, width: Math.max(width, 240), height: Math.max(height, 160) };
}

function extractSrcFromCode(code) {
  const match = code?.match(/src=["']([^"']+)["']/i);
  if (!match) return null;
  return match[1].split('/').pop()?.split('?')[0];
}

async function waitForElementReady(page, locator) {
  await locator.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await locator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);

  await locator.evaluate((el) => {
    if (el.tagName === 'IMG' && !el.complete) {
      return new Promise((resolve) => {
        el.onload = resolve;
        el.onerror = resolve;
        setTimeout(resolve, 2000);
      });
    }
  }).catch(() => {});
}

async function findLocator(page, issue) {
  const attempts = [];

  if (issue.selector && !isPageLevelSelector(issue.selector)) {
    attempts.push(issue.selector);
  }

  if (issue.metadata?.src) {
    attempts.push(`img[src*="${issue.metadata.src}"]`);
  }

  const srcPartial = extractSrcFromCode(issue.originalCode);
  if (srcPartial) {
    attempts.push(`img[src*="${srcPartial}"]`);
  }

  if (issue.metadata?.href) {
    attempts.push(`a[href="${issue.metadata.href.replace(/"/g, '\\"')}"]`);
  }

  for (const sel of [...new Set(attempts)]) {
    try {
      const locator = page.locator(sel).first();
      if ((await locator.count()) > 0) return locator;
    } catch {
      // try next strategy
    }
  }

  if (issue.metadata?.matchText) {
    try {
      const locator = page.getByText(issue.metadata.matchText, { exact: false }).first();
      if ((await locator.count()) > 0) return locator;
    } catch {
      // continue
    }
  }

  return null;
}

async function captureElementIssue(page, issue, issuesDir, auditId) {
  const locator = await findLocator(page, issue);
  if (!locator) return null;

  await waitForElementReady(page, locator);

  const box = await locator.boundingBox();
  if (!box || box.width < 1 || box.height < 1) return null;

  await injectHighlight(page, box, issue.title, issue.rule);
  await page.waitForTimeout(250);

  const clip = buildClip(expandBox(box));
  const filename = `${sanitizeFilename(issue.id)}.png`;
  const filePath = path.join(issuesDir, filename);

  await page.screenshot({ path: filePath, clip });
  await removeOverlays(page);

  const publicPath = `/outputs/${auditId}/issues/${filename}`;
  if (!(await fileExists(filePath))) return null;
  return publicPath;
}

async function capturePageLevelIssue(page, issue, issuesDir, auditId) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await injectPageLevelHighlight(page, issue.title);
  await page.waitForTimeout(200);

  const filename = `${sanitizeFilename(issue.id)}.png`;
  const filePath = path.join(issuesDir, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  await removeOverlays(page);

  const publicPath = `/outputs/${auditId}/issues/${filename}`;
  return (await fileExists(filePath)) ? publicPath : null;
}

async function captureFallbackIssue(page, issue, issuesDir, auditId) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await injectPageLevelHighlight(page, issue.title);
  await page.waitForTimeout(250);

  const filename = `${sanitizeFilename(issue.id)}-fallback.png`;
  const filePath = path.join(issuesDir, filename);
  await page.screenshot({ path: filePath, fullPage: false });
  await removeOverlays(page);

  const publicPath = `/outputs/${auditId}/issues/${filename}`;
  return (await fileExists(filePath)) ? publicPath : null;
}

/**
 * Captures a highlighted screenshot for every issue.
 */
export async function captureIssueScreenshots(page, issues, auditId, onProgress) {
  const outputDir = path.join(config.outputDir, auditId);
  const issuesDir = path.join(outputDir, 'issues');
  await fs.mkdir(issuesDir, { recursive: true });

  const enriched = [];

  for (let i = 0; i < issues.length; i++) {
    const issue = { ...issues[i] };

    if (onProgress) {
      onProgress({
        stage: 'screenshots',
        percent: 70 + Math.round((i / Math.max(issues.length, 1)) * 8),
        message: `Highlighting vulnerability ${i + 1} of ${issues.length}`,
      });
    }

    try {
      let screenshotPath = null;

      if (isPageLevelSelector(issue.selector)) {
        screenshotPath = await capturePageLevelIssue(page, issue, issuesDir, auditId);
      } else {
        screenshotPath = await captureElementIssue(page, issue, issuesDir, auditId);
      }

      if (!screenshotPath) {
        screenshotPath = await captureFallbackIssue(page, issue, issuesDir, auditId);
      }

      issue.screenshot = screenshotPath;
    } catch (err) {
      console.warn(`Screenshot failed for ${issue.id}:`, err.message);
      try {
        issue.screenshot = await captureFallbackIssue(page, issue, issuesDir, auditId);
      } catch {
        issue.screenshot = null;
      }
    }

    enriched.push(issue);
    await removeOverlays(page).catch(() => {});
  }

  return enriched;
}

export default { captureIssueScreenshots };
