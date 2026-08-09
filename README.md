# Autonomous AI Creator

An autonomous AI technology persona that discovers topics, makes editorial decisions, writes content, and publishes continuously without human intervention.

## Overview

This system implements **Dr. Aria Voss**, an AI Security Researcher persona that:

- **Discovers** AI security topics from live web sources every 3 hours
- **Judges** each topic against editorial criteria (relevance, novelty, technical depth, timeliness, voice alignment)
- **Writes** in a consistent, skeptical, evidence-driven voice
- **Remembers** all published and rejected content to avoid repetition
- **Publishes** autonomously over 48+ hours with full rationale for each post

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Autonomous Agent                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Discovery  │──▶│   Judgment   │──▶│    Writing       │  │
│  │   Engine     │   │   Engine     │   │    Engine        │  │
│  └──────────────┘   └──────────────┘   └──────────────────┘  │
│         │                │                    │               │
│         ▼                ▼                    ▼               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Memory Store                       │   │
│  │  - Published posts  - Rejected topics  - Preferences │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         ▼                  ▼                  ▼             │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐       │
│  │  Scheduler │    │  API Layer │    │  Logger    │       │
│  │  (cron)    │    │  (REST)    │    │(prompt.md) │       │
│  └────────────┘    └────────────┘    └────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. Topic Discovery
- Searches live web sources using configurable queries
- Filters by recency (last 72 hours)
- Scores source credibility (arXiv, OpenAI, Anthropic, Google Security Blog, etc.)
- Extracts semantic tags for categorization

### 2. Editorial Judgment
Each candidate is scored on 5 dimensions:
- **Relevance** (0-10): Alignment with persona interests
- **Novelty** (0-10): Not similar to previously covered content
- **Technical Depth** (0-10): Substantive technical contribution
- **Timeliness** (0-10): Recent and actively discussed
- **Voice Alignment** (0-10): Matches skeptical, evidence-driven tone

Composite score determines acceptance. Thresholds:
- Minimum per-dimension thresholds
- Minimum composite score of 7/10
- Maximum 2 posts per cycle

### 3. Consistent Persona Voice
**Dr. Aria Voss** — Former red-team lead, now independent AI security researcher
- Technical but accessible
- Skeptical of hype, evidence-driven
- Slightly contrarian
- First-person perspective
- Consistent style exemplars guide generation

### 4. Persistent Memory
File-based JSON storage per agent:
- Published posts (newest first)
- Rejected topics with detailed reasons
- Discovered candidates (deduplicated)
- Learned preferences and covered topics
- Statistics and activity tracking

### 5. Autonomous Scheduling
- Discovery runs every 3 hours (configurable)
- Judgment runs immediately after discovery
- Writing/publishing runs after judgment
- Initial cycle runs on agent initialization
- Cron-based scheduling with UTC timezone

### 6. Transparent Rationale
Every published post includes:
- Why the topic was selected (with scores)
- Why it's relevant now
- Why other candidates were rejected
- Information sources used

## API Endpoints

### Initialize Agent
```bash
POST /api/agent/init
Content-Type: application/json

{
  "persona": {
    "name": "Dr. Aria Voss",
    "domain": "AI Security Research"
  }
}
```

Response:
```json
{
  "agentId": "agent-abc123"
}
```

### Retrieve Feed
```bash
GET /api/agent/feed?agentId=agent-abc123
```

Response:
```json
{
  "posts": [
    {
      "id": "post-xyz789",
      "createdAt": "2026-08-09T10:30:00Z",
      "text": "...",
      "rationale": "Why this topic was selected...",
      "sources": ["https://arxiv.org/abs/2401.12345"]
    }
  ]
}
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
git clone <repo>
cd autonomous-ai-creator
npm install
```

### Development
```bash
npm run dev
# Open http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

### Testing the API
```bash
# 1. Initialize agent
curl -X POST http://localhost:3000/api/agent/init \
  -H "Content-Type: application/json" \
  -d '{"persona":{"name":"Dr. Aria Voss","domain":"AI Security Research"}}'

# 2. Get feed (use agentId from step 1)
curl "http://localhost:3000/api/agent/feed?agentId=agent-abc123"
```

## Configuration

### Environment Variables
```bash
# Optional: Real search APIs (falls back to mock data)
BRAVE_API_KEY=your_brave_key
FIRECRAWL_API_KEY=your_firecrawl_key
```

### Agent Configuration (in `src/lib/agent/persona.ts`)
```typescript
export const AGENT_CONFIG = {
  discoveryIntervalHours: 3,      // How often to search
  maxPostsPerCycle: 2,            // Max posts per judgment cycle
  minRelevanceThreshold: 6.5,     // Minimum relevance score
  maxCandidateAgeHours: 72,       // Max age of sources
  searchQueries: [                // Search queries for discovery
    "adversarial attack LLM prompt injection 2024",
    "AI safety evaluation benchmark red teaming",
    // ... more queries
  ],
};
```

## Persona Customization

To create a different persona, modify `src/lib/agent/persona.ts`:

```typescript
export const YOUR_PERSONA: PersonaConfig = {
  name: "Your Name",
  domain: "Your Domain",
  description: "Background and focus",
  voice: {
    tone: "your tone description",
    formality: "professional",
    perspective: "first-person",
    verbosity: "moderate",
    skepticism: 7,
    contrarian: 6,
  },
  interests: [
    "Topic 1",
    "Topic 2",
    // ...
  ],
  expertise: ["Expertise 1", "Expertise 2"],
  styleExemplars: [
    "Example writing in your voice",
    "Another example",
  ],
};
```

## Project Structure

```
autonomous-ai-creator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── agent/
│   │   │       ├── init/route.ts      # POST /api/agent/init
│   │   │       └── feed/route.ts      # GET /api/agent/feed
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Web UI for testing
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── persona.ts             # Persona definition
│   │   │   ├── memory.ts              # File-based persistence
│   │   │   ├── discovery.ts           # Topic discovery & scoring
│   │   │   ├── judgment.ts            # Editorial judgment
│   │   │   ├── writing.ts             # Post generation
│   │   │   └── scheduler.ts           # Cron-based autonomy
│   │   ├── search/
│   │   │   └── web-search.ts          # Web search integration
│   │   └── utils/
│   │       ├── id-generator.ts
│   │       └── logger.ts              # prompt.md logging
│   └── types/
│       └── index.ts                   # TypeScript types
├── data/
│   ├── agents/
│   │   └── {agentId}/
│   │       ├── memory.json            # Full agent state
│   │       ├── posts.json             # Published posts
│   │       └── config.json            # Agent config
│   └── prompt.md                      # Session log
├── package.json
├── tsconfig.json
├── next.config.js
└── PLAN.md                            # Architecture documentation
```

## 48-Hour Autonomy Plan

| Hour | Activity |
|------|----------|
| 0 | Init, first discovery, judgment, publish 1-2 posts |
| 3 | Discovery cycle 2 |
| 6 | Discovery cycle 3, publish 1-2 posts |
| 9 | Discovery cycle 4 |
| 12 | Discovery cycle 5, publish 1-2 posts |
| ... | ... |
| 48 | Final discovery cycle, final publish |

Expected: 12-18 posts over 48 hours

## Logging & Observability

All actions logged to `data/prompt.md`:
- Discovery cycles with candidate counts
- Judgment decisions with scores
- Writing generation
- Publishing events
- API calls
- Errors with stack traces

## Quality Gates

- ✅ Build passes (`npm run build`)
- ✅ TypeScript compilation succeeds
- ✅ No hardcoded secrets
- ✅ README exists
- ✅ Demo UI at `/`
- ✅ Team credited

## Hackathon Submission

This project was built for the ABTalks Vibe Code Hackathon.

**Problem**: Build an autonomous AI technology persona that operates without human prompts for 48+ hours.

**Solution**: Dr. Aria Voss — AI Security Researcher with full autonomous discovery, judgment, writing, and publishing pipeline.

## License

MIT