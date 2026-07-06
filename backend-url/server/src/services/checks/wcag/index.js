/**
 * WCAG 2.x inspired accessibility checks run against extracted page data and Playwright page.
 */

function createIssue(overrides) {
  return {
    id: overrides.id,
    category: 'wcag',
    rule: overrides.rule,
    title: overrides.title,
    description: overrides.description,
    element: overrides.element || '',
    selector: overrides.selector || '',
    originalCode: overrides.originalCode || '',
    wcagCriteria: overrides.wcagCriteria || [],
    severity: overrides.severity || 'moderate',
    metadata: overrides.metadata || {},
  };
}

export function runWcagChecks(pageData, html) {
  const issues = [];

  // Page language (WCAG 3.1.1)
  if (!pageData.language || pageData.language.trim() === '') {
    issues.push(
      createIssue({
        id: 'wcag-lang',
        rule: 'page-language',
        title: 'Missing page language attribute',
        description: 'The <html> element does not have a valid lang attribute, making it harder for screen readers to pronounce content correctly.',
        element: '<html>',
        selector: 'html',
        originalCode: '<html>',
        fixedCode: '<html lang="en">',
        wcagCriteria: ['3.1.1'],
        severity: 'serious',
      })
    );
  }

  // Page title (WCAG 2.4.2)
  if (!pageData.title || pageData.title.trim().length < 3) {
    issues.push(
      createIssue({
        id: 'wcag-title',
        rule: 'page-title',
        title: 'Missing or inadequate page title',
        description: 'Every page should have a descriptive <title> element for navigation and orientation.',
        element: 'title',
        selector: 'title',
        originalCode: `<title>${pageData.title || ''}</title>`,
        fixedCode: '<title>Descriptive Page Title — Site Name</title>',
        wcagCriteria: ['2.4.2'],
        severity: 'serious',
      })
    );
  }

  // Image alt text (WCAG 1.1.1)
  for (const img of pageData.images || []) {
    if (img.alt === null || img.alt === undefined) {
      issues.push(
        createIssue({
          id: `wcag-alt-${img.selector}-${issues.length}`,
          rule: 'image-alt',
          title: 'Image missing alt attribute',
          description: `Image at ${img.selector} has no alt attribute. Decorative images should use alt="" and meaningful images need descriptive alt text.`,
          element: 'img',
          selector: img.selector,
          originalCode: `<img src="${img.src?.slice(0, 80)}">`,
          fixedCode: `<img src="${img.src?.slice(0, 80)}" alt="Describe the image purpose">`,
          wcagCriteria: ['1.1.1'],
          severity: 'critical',
          metadata: { src: img.matchSrc || img.src?.split('/').pop() },
        })
      );
    } else if (img.alt.trim() === '' && img.width > 50 && img.height > 50) {
      issues.push(
        createIssue({
          id: `wcag-alt-empty-${img.selector}-${issues.length}`,
          rule: 'image-alt-empty',
          title: 'Large image with empty alt text',
          description: 'Large images with empty alt may be meaningful content that needs a description.',
          element: 'img',
          selector: img.selector,
          originalCode: `<img src="${img.src?.slice(0, 80)}" alt="">`,
          fixedCode: `<img src="${img.src?.slice(0, 80)}" alt="Meaningful description of image content">`,
          wcagCriteria: ['1.1.1'],
          severity: 'moderate',
          metadata: { src: img.matchSrc || img.src?.split('/').pop() },
        })
      );
    }
  }

  // Heading structure (WCAG 1.3.1, 2.4.6)
  const headings = pageData.headings || [];
  if (headings.filter((h) => h.level === 1).length === 0) {
    issues.push(
      createIssue({
        id: 'wcag-h1-missing',
        rule: 'heading-h1',
        title: 'Page missing H1 heading',
        description: 'Every page should have exactly one H1 that describes the main topic.',
        element: 'h1',
        selector: 'h1',
        originalCode: '<!-- No h1 found -->',
        fixedCode: '<h1>Main Page Heading</h1>',
        wcagCriteria: ['1.3.1', '2.4.6'],
        severity: 'serious',
      })
    );
  }
  if (headings.filter((h) => h.level === 1).length > 1) {
    issues.push(
      createIssue({
        id: 'wcag-h1-multiple',
        rule: 'heading-h1-multiple',
        title: 'Multiple H1 headings detected',
        description: 'Using more than one H1 can confuse screen reader users about page structure.',
        element: 'h1',
        selector: 'h1',
        originalCode: headings.filter((h) => h.level === 1).map((h) => `<h1>${h.text}</h1>`).join('\n'),
        fixedCode: '<h1>Single main heading</h1>\n<h2>Subsequent sections use h2+</h2>',
        wcagCriteria: ['1.3.1'],
        severity: 'moderate',
      })
    );
  }

  let prevLevel = 0;
  for (const h of headings) {
    if (prevLevel > 0 && h.level > prevLevel + 1) {
      issues.push(
        createIssue({
          id: `wcag-heading-skip-${h.selector}`,
          rule: 'heading-order',
          title: 'Heading levels skip sequentially',
          description: `Heading jumps from h${prevLevel} to h${h.level} ("${h.text.slice(0, 50)}"), which breaks document outline.`,
          element: `h${h.level}`,
          selector: h.selector,
          originalCode: `<h${h.level}>${h.text}</h${h.level}>`,
          fixedCode: `<h${prevLevel + 1}>${h.text}</h${prevLevel + 1}>`,
          wcagCriteria: ['1.3.1'],
          severity: 'moderate',
        })
      );
    }
    prevLevel = h.level;
  }

  // Form labels (WCAG 1.3.1, 3.3.2)
  for (const form of pageData.forms || []) {
    for (const field of form.fields) {
      if (!field.hasLabel && !['hidden', 'submit', 'button'].includes(field.type)) {
        issues.push(
          createIssue({
            id: `wcag-label-${field.selector}`,
            rule: 'form-label',
            title: 'Form field missing accessible label',
            description: `Input "${field.name || field.id || field.selector}" has no associated label, aria-label, or aria-labelledby.`,
            element: field.tag,
            selector: field.selector,
            originalCode: `<${field.tag} type="${field.type}" name="${field.name}" id="${field.id}">`,
            fixedCode: `<label for="${field.id || field.name}">Field Label</label>\n<${field.tag} type="${field.type}" name="${field.name}" id="${field.id || field.name}">`,
            wcagCriteria: ['1.3.1', '3.3.2'],
            severity: 'critical',
          })
        );
      }
    }
  }

  // Link purpose (WCAG 2.4.4)
  for (const link of pageData.links || []) {
    const text = link.text.toLowerCase();
    const vague = ['click here', 'here', 'read more', 'more', 'link', 'learn more'];
    if (!link.text || vague.includes(text) || text.length < 2) {
      issues.push(
        createIssue({
          id: `wcag-link-text-${link.selector}`,
          rule: 'link-purpose',
          title: 'Non-descriptive link text',
          description: `Link "${link.text || '(empty)'}" does not clearly describe its destination out of context.`,
          element: 'a',
          selector: link.selector,
          originalCode: `<a href="${link.href}">${link.text || ''}</a>`,
          fixedCode: `<a href="${link.href}">Descriptive link text about destination</a>`,
          wcagCriteria: ['2.4.4'],
          severity: 'moderate',
        })
      );
    }
    if (link.opensNewTab && !link.hasAriaLabel && !/new (tab|window)/i.test(link.text)) {
      issues.push(
        createIssue({
          id: `wcag-link-newtab-${link.selector}`,
          rule: 'link-new-window',
          title: 'New window link without warning',
          description: 'Links opening in a new tab should inform users, especially screen reader users.',
          element: 'a',
          selector: link.selector,
          originalCode: `<a href="${link.href}" target="_blank">${link.text}</a>`,
          fixedCode: `<a href="${link.href}" target="_blank" rel="noopener noreferrer" aria-label="${link.text} (opens in new tab)">${link.text} <span aria-hidden="true">↗</span></a>`,
          wcagCriteria: ['3.2.5'],
          severity: 'minor',
        })
      );
    }
  }

  // Button labels (WCAG 4.1.2)
  for (const btn of pageData.buttons || []) {
    if (!btn.hasLabel) {
      issues.push(
        createIssue({
          id: `wcag-button-label-${btn.selector}`,
          rule: 'button-name',
          title: 'Button missing accessible name',
          description: 'Interactive buttons must have visible text or an aria-label for assistive technologies.',
          element: btn.type,
          selector: btn.selector,
          originalCode: `<${btn.type}></${btn.type}>`,
          fixedCode: `<${btn.type} aria-label="Describe button action">Action</${btn.type}>`,
          wcagCriteria: ['4.1.2'],
          severity: 'critical',
        })
      );
    }
  }

  // Meta description for SEO/accessibility context
  if (!pageData.metaDescription) {
    issues.push(
      createIssue({
        id: 'wcag-meta-description',
        rule: 'meta-description',
        title: 'Missing meta description',
        description: 'A meta description helps users understand page purpose in search results and summaries.',
        element: 'meta',
        selector: 'meta[name="description"]',
        originalCode: '<!-- no meta description -->',
        fixedCode: '<meta name="description" content="Concise summary of page content and purpose.">',
        wcagCriteria: ['2.4.2'],
        severity: 'minor',
      })
    );
  }

  // Keyboard: check for positive tabindex abuse in HTML
  const tabindexMatches = html.match(/tabindex\s*=\s*["'](\d+)["']/gi) || [];
  for (const match of tabindexMatches) {
    const num = parseInt(match.match(/\d+/)?.[0] || '0', 10);
    if (num > 0) {
      issues.push(
        createIssue({
          id: `wcag-tabindex-${num}`,
          rule: 'keyboard-tabindex',
          title: 'Positive tabindex disrupts keyboard order',
          description: 'Positive tabindex values override natural tab order and harm keyboard navigation.',
          element: '[tabindex]',
          selector: '[tabindex]',
          originalCode: match,
          fixedCode: 'tabindex="0" or remove tabindex to use natural DOM order',
          wcagCriteria: ['2.4.3'],
          severity: 'serious',
        })
      );
    }
  }

  return issues;
}

/**
 * Contrast and touch-target checks require live page context.
 */
export async function runWcagPageChecks(page) {
  const issues = [];

  const contrastIssues = await page.evaluate(() => {
    const results = [];
    const MIN_RATIO = 4.5;
    const MIN_LARGE_RATIO = 3;

    const getUniqueSelector = (el) => {
      if (el.id) return `#${el.id}`;
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(Boolean);
        for (const cls of classes) {
          const sel = `${el.tagName.toLowerCase()}.${cls}`;
          if (document.querySelectorAll(sel).length === 1) return sel;
        }
        if (classes[0]) return `${el.tagName.toLowerCase()}.${classes[0]}`;
      }
      return el.tagName.toLowerCase();
    };

    const parseColor = (color) => {
      const el = document.createElement('div');
      el.style.color = color;
      document.body.appendChild(el);
      const computed = getComputedStyle(el).color;
      document.body.removeChild(el);
      const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
    };

    const luminance = ([r, g, b]) => {
      const [rs, gs, bs] = [r, g, b].map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const contrastRatio = (fg, bg) => {
      const l1 = luminance(fg);
      const l2 = luminance(bg);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    };

    const textEls = [...document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, label, li')]
      .filter((el) => el.textContent?.trim() && el.offsetParent !== null)
      .slice(0, 80);

    for (const el of textEls) {
      const style = getComputedStyle(el);
      const fg = parseColor(style.color);
      let bgEl = el;
      let bgColor = null;
      while (bgEl && bgEl !== document.body) {
        const bgStyle = getComputedStyle(bgEl);
        if (bgStyle.backgroundColor && bgStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          bgColor = parseColor(bgStyle.backgroundColor);
          break;
        }
        bgEl = bgEl.parentElement;
      }
      if (!fg || !bgColor) continue;
      const ratio = contrastRatio(fg, bgColor);
      const fontSize = parseFloat(style.fontSize);
      const isLarge = fontSize >= 18 || (fontSize >= 14 && parseInt(style.fontWeight, 10) >= 700);
      const required = isLarge ? MIN_LARGE_RATIO : MIN_RATIO;
      if (ratio < required) {
        const text = el.textContent.trim().slice(0, 60);
        results.push({
          selector: getUniqueSelector(el),
          text,
          ratio: Math.round(ratio * 100) / 100,
          required,
          fontSize: Math.round(fontSize),
        });
      }
    }
    return results;
  });

  for (const c of contrastIssues.slice(0, 15)) {
    const title = c.fontSize && c.fontSize < 14
      ? 'Font size too small / insufficient contrast'
      : 'Insufficient color contrast';
    issues.push(
      createIssue({
        id: `wcag-contrast-${c.selector}-${c.text?.slice(0, 12).replace(/\W/g, '') || issues.length}`,
        rule: 'color-contrast',
        title,
        description: `Text "${c.text}" has contrast ratio ${c.ratio}:1 (required ${c.required}:1)${c.fontSize ? `, font-size ${c.fontSize}px` : ''}.`,
        element: 'text',
        selector: c.selector,
        originalCode: `/* contrast ratio: ${c.ratio}:1 */\n${c.selector} { color: /* too low contrast */ }`,
        fixedCode: `${c.selector} {\n  color: #1a1a1a;\n  background-color: #ffffff;\n  font-size: max(16px, 1rem);\n}`,
        wcagCriteria: ['1.4.3'],
        severity: c.ratio < 3 ? 'critical' : 'serious',
        metadata: { ratio: c.ratio, required: c.required, matchText: c.text, fontSize: c.fontSize },
      })
    );
  }

  const touchIssues = await page.evaluate(() => {
    const MIN = 44;

    const getUniqueSelector = (el) => {
      if (el.id) return `#${el.id}`;
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(Boolean);
        for (const cls of classes) {
          const sel = `${el.tagName.toLowerCase()}.${cls}`;
          if (document.querySelectorAll(sel).length === 1) return sel;
        }
        if (classes[0]) return `${el.tagName.toLowerCase()}.${classes[0]}`;
      }
      if (el.tagName === 'A') {
        const href = el.getAttribute('href');
        if (href) return `a[href="${href}"]`;
      }
      return el.tagName.toLowerCase();
    };

    const results = [];
    const targets = [...document.querySelectorAll('a, button, input, [role="button"]')]
      .filter((el) => el.offsetParent !== null)
      .slice(0, 60);

    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < MIN || rect.height < MIN)) {
        results.push({
          selector: getUniqueSelector(el),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          text: el.textContent?.trim().slice(0, 40) || el.getAttribute('aria-label') || '',
        });
      }
    }
    return results;
  });

  for (const t of touchIssues.slice(0, 15)) {
    issues.push(
      createIssue({
        id: `wcag-touch-${t.selector}-${t.text?.slice(0, 8).replace(/\W/g, '') || issues.length}`,
        rule: 'touch-target',
        title: 'Touch target too small',
        description: `Interactive element (${t.width}×${t.height}px) is below the 44×44px minimum touch target size.`,
        element: 'interactive',
        selector: t.selector,
        originalCode: `${t.selector} { /* ${t.width}x${t.height}px */ }`,
        fixedCode: `${t.selector} {\n  min-width: 44px;\n  min-height: 44px;\n  padding: 12px 16px;\n}`,
        wcagCriteria: ['2.5.5'],
        severity: 'moderate',
        metadata: { width: t.width, height: t.height, matchText: t.text },
      })
    );
  }

  return issues;
}

export default { runWcagChecks, runWcagPageChecks };
