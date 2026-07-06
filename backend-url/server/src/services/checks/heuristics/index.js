/**
 * Nielsen's 10 Usability Heuristics inspired UX checks.
 */

function createIssue(overrides) {
  return {
    id: overrides.id,
    category: 'heuristic',
    rule: overrides.rule,
    title: overrides.title,
    description: overrides.description,
    element: overrides.element || '',
    selector: overrides.selector || '',
    originalCode: overrides.originalCode || '',
    heuristic: overrides.heuristic || '',
    severity: overrides.severity || 'moderate',
    metadata: overrides.metadata || {},
  };
}

export function runHeuristicChecks(pageData, url) {
  const issues = [];

  // H1: Visibility of system status — loading states
  if (!pageData.meta?.viewport) {
    issues.push(
      createIssue({
        id: 'ux-viewport',
        rule: 'responsive-viewport',
        title: 'Missing viewport meta tag',
        description: 'Without a viewport meta tag, mobile users may see a desktop-scaled page, harming usability.',
        heuristic: 'Flexibility and efficiency of use',
        element: 'meta',
        selector: 'meta[name="viewport"]',
        originalCode: '<!-- missing viewport -->',
        fixedCode: '<meta name="viewport" content="width=device-width, initial-scale=1">',
        severity: 'serious',
      })
    );
  }

  // H2: Match between system and real world — vague CTAs
  const vagueButtons = (pageData.buttons || []).filter((b) => {
    const t = b.text.toLowerCase();
    return ['submit', 'ok', 'go', 'click', ''].includes(t);
  });
  for (const btn of vagueButtons.slice(0, 5)) {
    issues.push(
      createIssue({
        id: `ux-vague-cta-${btn.selector}`,
        rule: 'clear-cta',
        title: 'Vague call-to-action label',
        description: `Button "${btn.text || '(empty)'}" does not clearly communicate what will happen when clicked.`,
        heuristic: 'Match between system and real world',
        element: btn.type,
        selector: btn.selector,
        originalCode: `<${btn.type}>${btn.text}</${btn.type}>`,
        fixedCode: `<${btn.type}>Start Free Trial</${btn.type}>`,
        severity: 'moderate',
      })
    );
  }

  // H3: User control and freedom — external links
  const externalLinks = (pageData.links || []).filter((l) => {
    try {
      const linkUrl = new URL(l.href, url);
      const pageUrl = new URL(url);
      return linkUrl.hostname !== pageUrl.hostname;
    } catch {
      return false;
    }
  });
  if (externalLinks.length > 10) {
    issues.push(
      createIssue({
        id: 'ux-external-links',
        rule: 'external-link-overload',
        title: 'High number of external links',
        description: `${externalLinks.length} external links may distract users and pull them away from their task.`,
        heuristic: 'User control and freedom',
        element: 'a',
        selector: 'a[href]',
        severity: 'minor',
        metadata: { count: externalLinks.length },
      })
    );
  }

  // H4: Consistency and standards — mixed heading styles
  const h1Count = (pageData.headings || []).filter((h) => h.level === 1).length;
  if (h1Count === 0) {
    issues.push(
      createIssue({
        id: 'ux-visual-hierarchy',
        rule: 'visual-hierarchy',
        title: 'Weak visual hierarchy',
        description: 'No primary heading (H1) makes it hard for users to quickly understand page purpose.',
        heuristic: 'Consistency and standards',
        element: 'h1',
        selector: 'h1',
        severity: 'serious',
      })
    );
  }

  // H5: Error prevention — forms without required indicators
  for (const form of pageData.forms || []) {
    const requiredFields = form.fields.filter((f) => f.required);
    const unlabeledRequired = requiredFields.filter((f) => !f.hasLabel);
    if (unlabeledRequired.length > 0) {
      issues.push(
        createIssue({
          id: `ux-form-required-${form.index}`,
          rule: 'form-error-prevention',
          title: 'Required fields lack clear labels',
          description: 'Required form fields should have visible labels and indicators to prevent submission errors.',
          heuristic: 'Error prevention',
          element: 'form',
          selector: `form:nth-of-type(${form.index + 1})`,
          severity: 'serious',
        })
      );
    }

    if (form.fields.length > 0 && !form.action) {
      issues.push(
        createIssue({
          id: `ux-form-action-${form.index}`,
          rule: 'form-feedback',
          title: 'Form may lack clear submission behavior',
          description: 'Forms without an explicit action can confuse users about what happens on submit.',
          heuristic: 'Visibility of system status',
          element: 'form',
          selector: `form:nth-of-type(${form.index + 1})`,
          originalCode: '<form method="post">',
          fixedCode: '<form action="/submit" method="post" aria-describedby="form-help">',
          severity: 'moderate',
        })
      );
    }
  }

  // H6: Recognition rather than recall — navigation links
  const navLinks = (pageData.links || []).filter((l) => l.text.length > 0);
  if (navLinks.length < 3 && pageData.links?.length > 5) {
    issues.push(
      createIssue({
        id: 'ux-navigation-labels',
        rule: 'navigation-clarity',
        title: 'Navigation may lack descriptive labels',
        description: 'Many links have empty or unclear text, forcing users to recall context from surrounding content.',
        heuristic: 'Recognition rather than recall',
        element: 'nav',
        selector: 'nav a',
        severity: 'moderate',
      })
    );
  }

  // H7: Flexibility — too many interactive elements
  if (pageData.interactiveElements > 150) {
    issues.push(
      createIssue({
        id: 'ux-cognitive-load',
        rule: 'cognitive-load',
        title: 'High cognitive load from too many interactive elements',
        description: `${pageData.interactiveElements} interactive elements may overwhelm users and slow task completion.`,
        heuristic: 'Aesthetic and minimalist design',
        element: 'page',
        selector: 'body',
        severity: 'moderate',
        metadata: { count: pageData.interactiveElements },
      })
    );
  }

  // H8: Aesthetic and minimalist design — page weight
  if (pageData.htmlLength > 500000) {
    issues.push(
      createIssue({
        id: 'ux-page-weight',
        rule: 'page-complexity',
        title: 'Excessive page HTML size',
        description: 'Large HTML payloads can slow rendering and create cluttered experiences.',
        heuristic: 'Aesthetic and minimalist design',
        element: 'html',
        selector: 'html',
        severity: 'moderate',
        metadata: { htmlLength: pageData.htmlLength },
      })
    );
  }

  // H9: Help users recognize, diagnose, recover from errors
  const emptyLinks = (pageData.links || []).filter((l) => !l.href || l.href === '#' || l.href === 'javascript:void(0)');
  for (const link of emptyLinks.slice(0, 5)) {
    issues.push(
      createIssue({
        id: `ux-broken-link-${link.selector}`,
        rule: 'dead-link',
        title: 'Potentially non-functional link',
        description: `Link "${link.text}" points to "${link.href}" which may not navigate anywhere.`,
        heuristic: 'Help users recognize, diagnose, and recover from errors',
        element: 'a',
        selector: link.selector,
        originalCode: `<a href="${link.href}">${link.text}</a>`,
        fixedCode: `<a href="/valid-destination">${link.text || 'Meaningful destination'}</a>`,
        severity: 'serious',
      })
    );
  }

  // H10: Help and documentation
  if (!pageData.metaDescription && !pageData.title) {
    issues.push(
      createIssue({
        id: 'ux-page-context',
        rule: 'page-context',
        title: 'Page lacks contextual metadata',
        description: 'Missing title and description make it harder for users to understand page purpose at a glance.',
        heuristic: 'Help and documentation',
        element: 'head',
        selector: 'head',
        severity: 'moderate',
      })
    );
  }

  // Loading / performance heuristic
  if (pageData.stylesheetCount > 15) {
    issues.push(
      createIssue({
        id: 'ux-loading-stylesheets',
        rule: 'loading-performance',
        title: 'Many stylesheets may slow perceived loading',
        description: `${pageData.stylesheetCount} stylesheets can delay first paint and hurt perceived performance.`,
        heuristic: 'Visibility of system status',
        element: 'link',
        selector: 'link[rel="stylesheet"]',
        severity: 'minor',
        metadata: { count: pageData.stylesheetCount },
      })
    );
  }

  // Disabled buttons without explanation
  const disabledButtons = (pageData.buttons || []).filter((b) => b.disabled);
  for (const btn of disabledButtons.slice(0, 3)) {
    issues.push(
      createIssue({
        id: `ux-disabled-button-${btn.selector}`,
        rule: 'disabled-feedback',
        title: 'Disabled control without explanation',
        description: 'Disabled buttons should explain why they are unavailable or what is needed to enable them.',
        heuristic: 'Visibility of system status',
        element: btn.type,
        selector: btn.selector,
        originalCode: `<${btn.type} disabled>${btn.text}</${btn.type}>`,
        fixedCode: `<${btn.type} disabled aria-describedby="why-disabled">Submit</${btn.type}>\n<span id="why-disabled">Complete all required fields to enable submit.</span>`,
        severity: 'moderate',
      })
    );
  }

  return issues;
}

export default { runHeuristicChecks };
