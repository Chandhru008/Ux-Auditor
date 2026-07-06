import { config } from '../../config/index.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Enriches audit issues with AI-generated fixes via Groq (llama-3.3-70b-versatile).
 */
export class AiRecommendationService {
  constructor(onProgress) {
    this.onProgress = onProgress || (() => {});
  }

  async enrichIssues(issues, pageContext) {
    if (!config.groqApiKey) {
      return issues.map((issue) => this.fallbackEnrichment(issue));
    }

    const limit = Math.min(issues.length, config.maxAiIssues);
    const toEnrich = issues.slice(0, limit);
    const remaining = issues.slice(limit);

    const enriched = await Promise.all(
      toEnrich.map(async (issue, i) => {
        this.onProgress({
          stage: 'ai',
          percent: 55 + Math.round((i / limit) * 35),
          message: `Generating AI fix ${i + 1} of ${limit}: ${issue.title}`,
        });
        try {
          const aiResult = await this.generateFix(issue, pageContext);
          return { ...issue, ...aiResult, screenshot: issue.screenshot };
        } catch (error) {
          return this.fallbackEnrichment(issue);
        }
      })
    );

    const fallbackEnriched = remaining.map(issue => this.fallbackEnrichment(issue));
    return [...enriched, ...fallbackEnriched];
  }

  async generateFix(issue, pageContext) {
    const prompt = `You are a senior accessibility and UX engineer. Analyze this website audit issue and provide a precise fix.

URL: ${pageContext.url}
Page title: ${pageContext.title || 'Unknown'}

Issue:
- Category: ${issue.category}
- Rule: ${issue.rule}
- Title: ${issue.title}
- Description: ${issue.description}
- Element: ${issue.element}
- Selector: ${issue.selector}
- Original code: ${issue.originalCode || 'N/A'}

Respond with ONLY valid JSON (no markdown):
{
  "fixedCode": "exact HTML/CSS fix code",
  "explanation": "short 1-2 sentence explanation",
  "severity": "critical|serious|moderate|minor",
  "priority": "high|medium|low",
  "estimatedFixTime": "e.g. 5 minutes, 30 minutes, 2 hours"
}`;

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.groqModel,
        messages: [
          { role: 'system', content: 'You output only valid JSON. No markdown fences.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = this.parseJson(content);

    return {
      fixedCode: parsed.fixedCode || issue.fixedCode || '',
      explanation: parsed.explanation || issue.description,
      severity: parsed.severity || issue.severity || 'moderate',
      priority: parsed.priority || this.inferPriority(issue),
      estimatedFixTime: parsed.estimatedFixTime || this.inferFixTime(issue),
    };
  }

  parseJson(text) {
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return {};
        }
      }
      return {};
    }
  }

  fallbackEnrichment(issue) {
    return {
      ...issue,
      fixedCode: issue.fixedCode || '<!-- Apply fix based on issue description -->',
      explanation: issue.description,
      severity: issue.severity || 'moderate',
      priority: issue.priority || this.inferPriority(issue),
      estimatedFixTime: issue.estimatedFixTime || this.inferFixTime(issue),
    };
  }

  inferPriority(issue) {
    const sev = issue.severity || 'moderate';
    if (sev === 'critical') return 'high';
    if (sev === 'serious') return 'high';
    if (sev === 'moderate') return 'medium';
    return 'low';
  }

  inferFixTime(issue) {
    const map = {
      critical: '30–60 minutes',
      serious: '20–45 minutes',
      moderate: '10–30 minutes',
      minor: '5–15 minutes',
    };
    return map[issue.severity] || '15 minutes';
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default AiRecommendationService;
