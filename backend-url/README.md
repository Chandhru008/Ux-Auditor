# Cicaada — Live AI Website UX & Accessibility Auditor

A production-ready full-stack auditor that uses **Playwright** to capture websites, runs **WCAG** and **Nielsen UX heuristic** checks, enriches every issue with **Groq AI** (llama-3.3-70b-versatile) fixes, and streams live progress via **Socket.IO**.

## Features

- **Playwright automation** — Desktop & mobile screenshots, section captures, session video recording, full HTML/DOM extraction
- **WCAG checks** — Alt text, color contrast, form labels, heading structure, link purpose, keyboard/tabindex, touch targets, page language, titles
- **UX heuristics** — Navigation clarity, CTAs, error prevention, visual hierarchy, cognitive load, loading performance
- **AI recommendations** — Exact HTML/CSS fixes, explanations, severity, priority, estimated fix time
- **Live dashboard** — Scores, screenshots, video, issue filters, Git-style diffs, before/after, downloadable reports
- **MongoDB persistence** — Audit reports stored for later review

## Architecture

```
server/src/
├── config/           # Environment configuration
├── models/           # MongoDB schemas
├── routes/           # Express API routes
├── services/
│   ├── playwright/   # Browser automation & capture
│   ├── checks/
│   │   ├── wcag/     # WCAG accessibility rules
│   │   └── heuristics/ # Nielsen UX heuristics
│   ├── ai/           # Groq API recommendations
│   ├── scoring/      # Score & grade calculation
│   ├── reporting/    # HTML/JSON report generation
│   └── audit/        # Pipeline orchestrator
└── index.js          # Express + Socket.IO entry

client/src/
├── components/       # UI components (diff, scores, issues, gallery)
├── hooks/            # Socket.IO hook
├── pages/            # Home & Dashboard
└── utils/            # Diff utility
```

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- [Groq API key](https://console.groq.com)

## Setup

1. **Clone and install**

```bash
npm run install:all
```

2. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your GROQ_API_KEY and MONGODB_URI
```

3. **Install Playwright browsers**

```bash
cd server && npx playwright install chromium
```

4. **Start MongoDB** (if running locally)

```bash
mongod
```

5. **Run the app**

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/audits/start` | Start audit `{ "url": "https://example.com" }` |
| GET | `/api/audits` | List recent audits |
| GET | `/api/audits/:id` | Get full audit report |
| DELETE | `/api/audits/:id` | Delete audit |
| GET | `/api/health` | Health check |

### Socket.IO events

- Client emits: `join:audit` (auditId)
- Server emits: `audit:progress`, `audit:complete`, `audit:error`

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `MONGODB_URI` | mongodb://localhost:27017/cicaada-auditor | MongoDB connection |
| `GROQ_API_KEY` | — | Groq API key for AI fixes |
| `CLIENT_URL` | http://localhost:5173 | CORS origin |
| `MAX_AI_ISSUES` | 50 | Max issues sent to Groq per audit |

## Production

```bash
npm run build          # Build React client
npm start              # Start Express server
```

Serve the built client from Express or deploy separately with `VITE_API_URL` and `VITE_SOCKET_URL` pointing to your API.

## Extending

- **Add WCAG rules** — `server/src/services/checks/wcag/index.js`
- **Add UX heuristics** — `server/src/services/checks/heuristics/index.js`
- **Customize scoring** — `server/src/services/scoring/index.js`
- **Change AI model** — `server/src/config/index.js` → `groqModel`

## License

MIT
