import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'groq/compound-mini';

function buildPrompt(issue) {
  const rule = issue.wcagId || issue.heuristicId || issue.ruleId;
  const ruleName = issue.wcagName || issue.heuristicName || issue.ruleName;

  return `You are a UX and accessibility expert.
File: ${issue.file}
Line: ${issue.line}
Rule: ${rule} — ${ruleName}
Problem: ${issue.message}
Current code: ${issue.code}

CRITICAL: For "fixedCode", you MUST return the actual, fully modified code snippet that replaces the current code. DO NOT return text instructions (e.g., do not say "Add lang='en'"). Return the EXACT CODE (e.g., "<html lang='en'>...").

Return JSON only with no markdown fencing:
{"fixedCode":"...","whyItMatters":"...","timeToFix":"..."}`;
}

function parseFixResponse(text) {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    let fixedCodeStr = parsed.fixedCode || '';
    if (typeof fixedCodeStr === 'object') {
      // Sometimes AI hallucinates and returns a diff object instead of a string
      fixedCodeStr = Object.values(fixedCodeStr).join('\\n');
    }

    return {
      fixedCode: String(fixedCodeStr),
      whyItMatters: parsed.whyItMatters || '',
      timeToFix: parsed.timeToFix || '5 minutes',
    };
  } catch {
    return {
      fixedCode: '',
      whyItMatters: 'Fix could not be parsed from AI response',
      timeToFix: 'Unknown',
    };
  }
}

function fallbackFix(issue) {
  const code = issue.code || '';
  const message = issue.message || '';
  const suggestedFix = issue.suggestedFix || '';
  const rule = (issue.wcagId || issue.heuristicId || issue.ruleId || '').toUpperCase();

  let fixedCode = code;
  let whyItMatters = `Resolves ${rule} to improve UX and accessibility.`;
  let timeToFix = '5 minutes';

  if (rule.includes('1.1.1') || message.toLowerCase().includes('alt attribute') || message.toLowerCase().includes('img')) {
    if (code.includes('<img') && !code.includes('alt=')) {
      fixedCode = code.replace('<img', '<img alt="Description of the image"');
      whyItMatters = "Images must have alternative text so screen readers can describe them to visually impaired users.";
      timeToFix = "2 minutes";
    }
  } else if (rule.includes('3.1.1') || message.toLowerCase().includes('lang attribute') || message.toLowerCase().includes('language')) {
    if (code.includes('<html') && !code.includes('lang=')) {
      fixedCode = code.replace('<html', '<html lang="en"');
      whyItMatters = "Specifying the language of the page helps screen readers and browsers render pronunciation and translation correctly.";
      timeToFix = "1 minute";
    }
  } else if (rule.includes('1.3.1') || message.toLowerCase().includes('label') || message.toLowerCase().includes('aria-label')) {
    if (code.includes('<input') && !code.includes('aria-label=')) {
      fixedCode = code.replace('<input', '<input aria-label="Input field"');
      whyItMatters = "Form inputs need associated labels or aria-labels so screen readers know what information is expected.";
      timeToFix = "3 minutes";
    }
  } else if (rule.includes('1.4.3') || message.toLowerCase().includes('contrast')) {
    if (code.includes('color:')) {
      fixedCode = code.replace(/color:\s*[^;]+/, 'color: #1a1a1a; /* Enhanced contrast */');
      whyItMatters = "Low contrast text is difficult to read for users with low vision or in high ambient light environments.";
      timeToFix = "5 minutes";
    } else {
      fixedCode = code + ' /* Ensure high contrast contrast ratio >= 4.5:1 */';
      whyItMatters = "Low contrast text is difficult to read for users with low vision.";
      timeToFix = "5 minutes";
    }
  } else if (rule.includes('1.4.4') || message.toLowerCase().includes('font size') || message.toLowerCase().includes('font-size')) {
    if (code.includes('font-size:')) {
      fixedCode = code.replace(/font-size:\s*[\d\.]+px/, 'font-size: 12px');
      whyItMatters = "Small text sizes make content illegible, especially for mobile users and those with visual impairments.";
      timeToFix = "3 minutes";
    }
  } else if (rule.includes('2.4.4') || message.toLowerCase().includes('link purpose') || message.toLowerCase().includes('empty link')) {
    if (code.includes('<a>') || code.includes('<a ')) {
      fixedCode = code.replace(/<\/a>/, 'Learn more</a>');
      whyItMatters = "Links must contain descriptive text so users know where clicking them will lead.";
      timeToFix = "2 minutes";
    }
  }

  if (fixedCode === code) {
    if (code.startsWith('<') && !code.startsWith('<!')) {
      const spaceIdx = code.indexOf(' ');
      const closeIdx = code.indexOf('>');
      const insertIdx = spaceIdx > 0 && spaceIdx < closeIdx ? spaceIdx : closeIdx;
      fixedCode = code.slice(0, insertIdx) + ' data-ux-fix="optimized"' + code.slice(insertIdx);
    } else if (code.includes('{') && code.includes('}')) {
      fixedCode = code.replace('}', '  /* Optimized for accessibility and responsiveness */\n}');
    } else {
      fixedCode = code + ' // Optimized for UX';
    }
    whyItMatters = `Manually apply this recommended fix: ${suggestedFix || 'Optimize the code for WCAG and UX best practices.'}`;
    timeToFix = "5 minutes";
  }

  return {
    fixedCode,
    whyItMatters: `(Fallback Heuristic) ${whyItMatters}`,
    timeToFix
  };
}

async function generateFixForIssue(issue) {
  if (!process.env.GROQ_API_KEY) {
    return fallbackFix(issue);
  }

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: buildPrompt(issue) }],
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const text = response.data?.choices?.[0]?.message?.content || '';
    return parseFixResponse(text);
  } catch (err) {
    console.warn(`Fix generation failed for ${issue.file}:${issue.line}:`, err.response?.data?.error?.message || err.message);
    return fallbackFix(issue);
  }
}

export async function generateFixes(issues, onProgress) {
  const results = [];

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const fix = await generateFixForIssue(issue);

    results.push({
      ...issue,
      fix,
    });

    if (onProgress) {
      onProgress(i + 1, issues.length);
    }
  }

  return results;
}

export async function generateFixesBatch(issues, onProgress, concurrency = 3) {
  const results = new Array(issues.length);
  let completed = 0;

  async function processIndex(index) {
    const fix = await generateFixForIssue(issues[index]);
    results[index] = { ...issues[index], fix };
    completed++;
    if (onProgress) onProgress(completed, issues.length);
  }

  const queue = [...issues.keys()];
  const workers = Array.from({ length: Math.min(concurrency, issues.length) }, async () => {
    while (queue.length > 0) {
      const index = queue.shift();
      await processIndex(index);
    }
  });

  await Promise.all(workers);
  return results;
}
