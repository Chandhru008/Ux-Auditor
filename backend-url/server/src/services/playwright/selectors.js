/**
 * Generates reliable CSS selectors and element match hints for screenshot capture.
 */
export function getUniqueSelector(el) {
  if (!el || el.nodeType !== 1) return '';

  if (el.id) {
    try {
      return `#${CSS.escape(el.id)}`;
    } catch {
      return `#${el.id}`;
    }
  }

  if (el.getAttribute('data-testid')) {
    return `[data-testid="${el.getAttribute('data-testid')}"]`;
  }

  if (el.className && typeof el.className === 'string') {
    const classes = el.className.trim().split(/\s+/).filter(Boolean);
    for (const cls of classes) {
      const sel = `${el.tagName.toLowerCase()}.${cls}`;
      try {
        if (document.querySelectorAll(sel).length === 1) return sel;
      } catch {
        // invalid selector
      }
    }
    if (classes.length) {
      return `${el.tagName.toLowerCase()}.${classes[0]}`;
    }
  }

  if (el.tagName === 'IMG') {
    const src = el.getAttribute('src') || el.src || '';
    const partial = src.split('/').pop()?.split('?')[0];
    if (partial) return `img[src*="${partial.slice(0, 60)}"]`;
  }

  if (el.tagName === 'A') {
    const href = el.getAttribute('href');
    if (href && href !== '#') {
      return `a[href="${href.replace(/"/g, '\\"')}"]`;
    }
  }

  const path = [];
  let current = el;
  while (current && current !== document.documentElement && path.length < 5) {
    let seg = current.tagName.toLowerCase();
    const parent = current.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter((c) => c.tagName === current.tagName);
      if (siblings.length > 1) {
        seg += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }
    path.unshift(seg);
    current = parent;
  }
  return path.join(' > ');
}

export function getElementMatchHints(el) {
  const hints = {};
  if (!el) return hints;

  const text = el.textContent?.trim();
  if (text) hints.matchText = text.slice(0, 80);

  if (el.tagName === 'IMG') {
    const src = el.getAttribute('src') || el.src || '';
    hints.src = src.split('/').pop()?.split('?')[0] || src.slice(0, 80);
  }

  if (el.tagName === 'A') {
    hints.href = el.getAttribute('href') || '';
  }

  return hints;
}
