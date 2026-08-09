# Autonomous AI Creator — Complete Project Transcript

**Hackathon:** ABTalks Vibe Code Hackathon  
**Date:** 2026-08-09  
**Source:** https://www.abtalks.in/hackathon/submission  
**Live Demo:** https://autonomous-ai-creator-ebon.vercel.app  
**GitHub:** https://github.com/Ehsas317/autonomous-ai-creator  

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Planning Phase](#2-planning-phase)
3. [Implementation](#3-implementation)
4. [Build & Debug](#4-build--debug)
5. [Deployment](#5-deployment)
6. [Testing & Validation](#6-testing--validation)
7. [Final State](#7-final-state)

---

## 1. Problem Statement

Build an **autonomous AI and technology persona** that, once initialized, can:

- Discover topics from live information sources
- Decide whether a topic is worth publishing (reject low-quality topics)
- Write in a consistent editorial voice
- Remember previously published content
- Continue publishing over 48+ hours without human intervention

The persona must represent an original identity within the AI and technology ecosystem.

### Minimum Requirements
1. **Topic Discovery** — independently discover AI/tech topics from web/live sources
2. **Editorial Judgment** — reject topics that don't meet publishing standards
3. **Consistent Persona** — stable writing style, interests, opinions, voice
4. **Memory** — remember published content to avoid repetition
5. **Autonomous Publishing** — publish over time, not all at once; observed for 48 hours
6. **Publishing Rationale** — every post includes why selected, why relevant now, sources used

### Required API Endpoints

**Initialize Agent:**
```http
POST /api/agent/init
```
```json
{ "persona": { "name": "Ada", "domain": "AI Security" } }
```
Response: `{ "agentId": "abc-123" }`

**Retrieve Feed:**
```http
GET /api/agent/feed?agentId=abc-123
```
Response: Posts in reverse-chronological order, each with unique `id`, ISO 8601 `timestamp`, `text`, `rationale`, and `sources`.

### Evaluation Criteria
- Autonomous operation after initialization
- Quality of editorial decision-making
- Consistency of the AI persona
- Effective use of memory
- Transparency of publishing rationale
- Overall quality and coherence of the generated feed

---

## 2. Planning Phase

### Persona Definition
**Name:** Dr. Aria Voss  
**Domain:** AI Security Research  
**Background:** Former red-team lead at a major AI lab, now independent researcher focusing on AI safety, alignment, and adversarial robustness. Known for breaking things before they break you.  
**Voice:** Technical but accessible, skeptical of hype, evidence-driven, slightly contrarian  
**Skepticism:** 8/10 | **Contrarian:** 7/10  

**Interests:**
- Adversarial attacks on LLMs and multimodal models
- AI safety evaluations and benchmarks
- Model extraction, inversion, and membership inference
- Prompt injection defenses and jailbreak taxonomy
- AI governance, regulation, and liability frameworks
- Interpretability and mechanistic understanding
- Red-teaming methodologies and automation
- Supply chain attacks on ML pipelines
- Watermarking and provenance for AI outputs
- Frontier model risk assessment

**Style Exemplars:**
- "I've seen this pattern before. The paper claims 'robustness' but only evaluates on static benchmarks. Real adversaries adapt."
- "The vulnerability isn't in the model weights — it's in the prompt template that concatenates user input without sanitization. Again."
- "Everyone's benchmarking on MMLU. Nobody's testing what happens when the model gets a 100k token context stuffed with adversarial examples."
- "The 'alignment' conversation keeps missing the threat model. It's not about the model 'wanting' things. It's about the attack surface."
- "I'll believe the watermark is robust when I see it survive paraphrasing, translation, and code-to-natural-language conversion."

### Architecture
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Discovery  │───▶│  Judgment   │───▶│   Writing   │───▶│  Publishing │
│  Engine     │    │  Engine     │    │  Engine     │    │  (Feed API) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Memory Store                                 │
│  - Published posts  - Rejected topics  - Preferences  - Stats       │
└─────────────────────────────────────────────────────────────────────┘
```

### Tech Stack
- Next.js 14+, React 18+, TypeScript 5.4+
- Node.js (Vercel serverless functions)
- Upstash Redis for persistence
- node-cron for scheduling
- Brave/Firecrawl API (with mock fallback)

---

## 3. Implementation

### Project Setup
```bash
mkdir -p autonomous-ai-creator/src/{app/api/agent/{init,feed},lib/{agent,search,utils},types,data/agents}
cd autonomous-ai-creator
```

### Core Files Created

#### `package.json`
```json
{
  "name": "autonomous-ai-creator",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "node-cron": "^3.0.3",
    "zod": "^3.23.8",
    "@upstash/redis": "^1.34.0"
  }
}
```

#### `src/types/index.ts` — Core type definitions
```typescript
export interface PersonaConfig {
  name: string;
  domain: string;
  description: string;
  voice: VoiceConfig;
  interests: string[];
  expertise: string[];
  styleExemplars: string[];
}

export interface VoiceConfig {
  tone: string;
  formality: "casual" | "professional" | "academic";
  perspective: "first-person" | "third-person";
  verbosity: "concise" | "moderate" | "detailed";
  skepticism: number;
  contrarian: number;
}

export interface TopicCandidate {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  discoveredAt: string;
  relevanceScore?: number;
  noveltyScore?: number;
  technicalDepthScore?: number;
  timelinessScore?: number;
  voiceAlignmentScore?: number;
  tags: string[];
}

export interface PublishedPost {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: string[];
  topicId: string;
  candidate: TopicCandidate;
}

export interface AgentMemory {
  agentId: string;
  persona: PersonaConfig;
  config: AgentConfig;
  publishedPosts: PublishedPost[];
  rejectedTopics: RejectedTopic[];
  discoveredCandidates: TopicCandidate[];
  preferences: AgentPreferences;
  stats: AgentStats;
}
```

#### `src/lib/agent/persona.ts` — Dr. Aria Voss configuration + search config
```typescript
export const ARIA_VOSS_PERSONA: PersonaConfig = {
  name: "Dr. Aria Voss",
  domain: "AI Security Research",
  description: "Former red-team lead at a major AI lab, now independent researcher...",
  voice: {
    tone: "technical but accessible, skeptical of hype, evidence-driven, slightly contrarian",
    formality: "professional",
    perspective: "first-person",
    verbosity: "moderate",
    skepticism: 8,
    contrarian: 7,
  },
  interests: [
    "Adversarial attacks on LLMs and multimodal models",
    "AI safety evaluations and benchmarks",
    "Model extraction, inversion, and membership inference",
    // ... 7 more interests
  ],
  styleExemplars: [
    "I've seen this pattern before...",
    "The vulnerability isn't in the model weights...",
    // ... 3 more exemplars
  ],
};

export const AGENT_CONFIG: AgentConfig = {
  discoveryIntervalHours: 3,
  maxPostsPerCycle: 2,
  minRelevanceThreshold: 6.5,
  maxCandidateAgeHours: 72,
  searchQueries: [
    "adversarial attack LLM prompt injection 2024",
    "AI safety evaluation benchmark red teaming",
    "model extraction attack machine learning",
    "LLM jailbreak defense mechanism",
    "AI governance regulation liability 2024",
    "mechanistic interpretability neural network",
    "AI watermarking provenance detection",
    "frontier model risk assessment framework",
    "supply chain attack ML pipeline",
    "membership inference attack language model",
  ],
};
```

#### `src/lib/search/web-search.ts` — Discovery engine with mock data
- 10 realistic AI security mock topics with titles, URLs, snippets, sources, dates
- Supports Brave API, Firecrawl API, or mock fallback
- Filters by age, source credibility, deduplicates by URL
- Source credibility scoring: arxiv.org (10), openai.com (9), anthropic.com (9), etc.

#### `src/lib/agent/discovery.ts` — Topic discovery
- Runs 10 search queries per cycle
- Calculates recency score (0-10 based on hours old)
- Calculates source credibility (lookup map)
- Extracts tags via keyword matching (prompt-injection, jailbreak, adversarial, etc.)
- Deduplicates and returns scored candidates

#### `src/lib/agent/judgment.ts` — Editorial judgment engine
- 5-dimension scoring with weights:
  - Relevance: 0.25 (threshold: 6.5)
  - Novelty: 0.20 (threshold: 6.0)
  - Technical Depth: 0.20 (threshold: 6.0)
  - Timeliness: 0.15 (threshold: 5.0)
  - Voice Alignment: 0.20 (threshold: 6.5)
- Composite score threshold: 7.0
- Generates detailed rejection reasons per failed dimension

#### `src/lib/agent/writing.ts` — Post generation
- Template-based: opening → technical summary → critique → implication → closing
- Style exemplars ensure consistent voice
- Generates full rationale with per-dimension scores

#### `src/lib/agent/memory.ts` — Persistence layer
- Upstash Redis for production (primary)
- File-based JSON fallback for local development
- Atomic writes (write temp → rename)
- Tracks: published posts, rejected topics, candidates, preferences, stats

#### `src/lib/agent/scheduler.ts` — Autonomous cycle runner
- Cron-based scheduling (every N hours)
- Runs initial cycle immediately on init
- Discovers → Judges → Writes → Publishes
- Logs every action to prompt.md

#### `src/app/api/agent/init/route.ts` — Initialize endpoint
- Validates persona.name and persona.domain
- Creates agent memory in Redis
- Starts autonomous scheduler
- Returns agentId

#### `src/app/api/agent/feed/route.ts` — Feed endpoint
- Returns posts in reverse chronological order
- Each post: id, createdAt, text, rationale, sources
- 404 if agent not found

#### `src/app/api/cron/route.ts` — Cron trigger
- Auth via Bearer token (CRON_SECRET)
- Runs autonomous cycle for all agents
- Returns success status

#### `src/app/page.tsx` — Dashboard UI
- Initialize agent button
- Feed display with posts
- Show/hide rationale toggle
- Trigger cycle button
- Auto-refresh every 30 seconds
- Stats display

#### `.github/workflows/cron.yml` — GitHub Actions cron
```yaml
name: Autonomous Agent Cron
on:
  schedule:
    - cron: '0 */3 * * *'
  workflow_dispatch:
jobs:
  run-autonomous-cycle:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger autonomous cycle
        run: |
          curl -X GET "${{ secrets.VERCEL_URL }}/api/cron" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

#### `vercel.json` — Vercel configuration
```json
{
  "crons": [{ "path": "/api/cron", "schedule": "0 0 * * *" }],
  "functions": { "src/app/api/**/*.ts": { "maxDuration": 60 } }
}
```

---

## 4. Build & Debug

### Issue 1: Next.js version conflict
```
npm error ERESOLVE unable to resolve dependency tree
react@19.0.0 → next@15.0.0 requires react@^18.2.0 || 19.0.0-rc-65a56d0e-20241020
```
**Fix:** Downgraded to Next.js 14.2.35 + React 18.3.0

### Issue 2: next.config.ts not supported
```
Error: Configuring Next.js via 'next.config.ts' is not supported.
```
**Fix:** Renamed to `next.config.js`

### Issue 3: TypeScript return type error
```
Type 'NextResponse<{ error: string; }>' is not assignable to type 'NextResponse<FeedResponse>'
```
**Fix:** Changed return type to `NextResponse<FeedResponse | { error: string }>`

### Issue 4: Redis env vars missing on Vercel
```
[Upstash Redis] The 'url' property is missing or undefined in your Redis config.
```
**Fix:** Added Upstash Redis environment variables to Vercel dashboard

### Issue 5: CRON_SECRET whitespace
```
Error: The CRON_SECRET environment variable contains leading or trailing whitespace
```
**Fix:** Removed whitespace from env var value in Vercel dashboard

### Issue 6: Serverless statelessness
In-memory Map doesn't persist between Vercel function invocations.  
**Fix:** Required Redis for production; file-based fallback only for local dev.

### Issue 7: Duplicate export in page.tsx
```
Error: the name 'default' is exported multiple times
```
**Fix:** Removed duplicate `export default Home;` at end of file

---

## 5. Deployment

### GitHub
```bash
git init
git add .
git commit -m "Initial commit: Autonomous AI Creator"
git remote add origin https://github.com/Ehsas317/autonomous-ai-creator.git
git push -u origin main
```

### Vercel
```bash
npx vercel --prod --yes
# → https://autonomous-ai-creator-ebon.vercel.app
```

### Environment Variables (Vercel Dashboard)
| Key | Value |
|-----|-------|
| `UPSTASH_REDIS_REST_URL` | `[REDACTED]` |
| `UPSTASH_REDIS_REST_TOKEN` | `[REDACTED]` |
| `CRON_SECRET` | `[REDACTED]` |

### GitHub Secrets
| Secret | Value |
|--------|-------|
| `VERCEL_URL` | `https://autonomous-ai-creator-ebon.vercel.app` |
| `CRON_SECRET` | Same as Vercel |

---

## 6. Testing & Validation

### Local Dev Server
```bash
npm run dev
# → http://localhost:3000
```

### API Test: Initialize Agent
```bash
curl -X POST http://localhost:3000/api/agent/init \
  -H "Content-Type: application/json" \
  -d '{"persona":{"name":"Dr. Aria Voss","domain":"AI Security Research"}}'
```
**Result:** `{"agentId":"agent-mslir43c-bgodgl3k"}` ✅

### API Test: Get Feed
```bash
curl "http://localhost:3000/api/agent/feed?agentId=agent-mslir43c-bgodgl3k"
```
**Result:** Returns post with full rationale, sources, timestamps ✅

### API Test: Trigger Cron
```bash
curl -H "Authorization: Bearer test-secret" http://localhost:3000/api/cron
```
**Result:** `{"success":true,"message":"Autonomous cycle completed for all agents"}` ✅

### Stress Test (5 consecutive cycles)
```
╔══════════════════════════════════════════════════════════════╗
║     AUTONOMOUS AI CREATOR - STRESS TEST SUITE               ║
╚══════════════════════════════════════════════════════════════╝

🚀 Initializing agent...
✅ Agent created: agent-msliw3zj-x9sj0sv5

🔄 Cycle 1 → Posts published: 1 ✅
🔄 Cycle 2 → Posts published: 1 ✅ (no duplicates — memory working)
🔄 Cycle 3 → Posts published: 1 ✅
🔄 Cycle 4 → Posts published: 1 ✅
🔄 Cycle 5 → Posts published: 1 ✅

📋 Feed Validation: ✅ Reverse chronological order
💾 Memory Persistence: ✅ 8874 bytes stored
📝 Prompt Logging: ✅ 261 log entries, 165KB
🧪 Edge Cases: ✅ 404 for missing agent, 400 for missing fields

╔══════════════════════════════════════════════════════════════╗
║                    ✅ ALL TESTS PASSED                       ║
╚══════════════════════════════════════════════════════════════╝
```

### Vercel Production Test
```bash
curl -X POST https://autonomous-ai-creator-ebon.vercel.app/api/agent/init \
  -H "Content-Type: application/json" \
  -d '{"persona":{"name":"Dr. Aria Voss","domain":"AI Security Research"}}'
```
**Result:** `{"agentId":"agent-mslnd1ax-0526k8kp"}` (HTTP 201) ✅

```bash
curl "https://autonomous-ai-creator-ebon.vercel.app/api/agent/feed?agentId=agent-mslnd1ax-0526k8kp"
```
**Result:** Returns post with full rationale ✅

```bash
curl -H "Authorization: Bearer my-secret-123" https://autonomous-ai-creator-ebon.vercel.app/api/cron
```
**Result:** `{"success":true,"message":"Autonomous cycle completed for all agents"}` ✅

### Redis Connection Test
```bash
curl https://autonomous-ai-creator-ebon.vercel.app/api/debug/redis
```
**Result:** `{"status":"ok","pingMs":56,"value":"test-value"}` ✅

---

## 7. Final State

### Live Endpoints
| Endpoint | Status |
|----------|--------|
| `POST /api/agent/init` | ✅ 201 Created |
| `GET /api/agent/feed?agentId=...` | ✅ Returns posts with rationale |
| `GET /api/cron` | ✅ Triggers autonomous cycle |
| `GET /api/debug/env` | ✅ Shows env var status |
| `GET /api/debug/redis` | ✅ Tests Redis connection |
| `/` (Dashboard) | ✅ Interactive UI |

### Example Published Post
> Another week, another attack vector. This one's different.
>
> The core finding: The research demonstrates 89% findings in model-extraction
>
> Where I'm skeptical: Limited to white-box or gray-box threat models
>
> This shifts the baseline for LLM security.
>
> Stay paranoid.
>
> Source: https://openai.com/research/model-extraction-defense

### Hackathon Checklist
- [x] Build passes (`npm run build`)
- [x] TypeScript compiles cleanly
- [x] No hardcoded secrets
- [x] README.md comprehensive
- [x] Demo UI at `/`
- [x] Team credited (ABTalks hackathon)
- [x] Autonomous operation after init
- [x] Editorial judgment with rejection rationale
- [x] Consistent persona (Dr. Aria Voss)
- [x] Memory persistence (Redis + file fallback)
- [x] 48-hour publishing via cron
- [x] Transparent publishing rationale per post
- [x] API endpoints: `POST /api/agent/init`, `GET /api/agent/feed`

### Known Limitations
1. **Selective publishing** — Agent is strict; with mock data only ~1 topic/cycle passes thresholds
2. **Mock data repetition** — Same candidates each cycle; agent correctly avoids re-publishing
3. **No real web search** — Brave/Firecrawl API keys not configured (mock fallback active)
4. **Vercel Hobby cron limit** — Only daily cron; GitHub Actions handles 3-hour intervals
5. **Post quality** — Template-based writing; real LLM integration would improve variety

### What Would Improve This (Future Work)
- Integrate real LLM (Claude/GPT) for higher-quality post writing
- Add Brave/Firecrawl API keys for real-time topic discovery
- Multi-agent architecture with specialized roles
- Real social media posting (Twitter/X/LinkedIn APIs)
- Image generation for posts
- Analytics dashboard with engagement metrics

---

## Project File Structure (Final)
```
autonomous-ai-creator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agent/
│   │   │   │   ├── init/route.ts      # POST /api/agent/init
│   │   │   │   └── feed/route.ts      # GET /api/agent/feed
│   │   │   ├── cron/route.ts          # GET /api/cron
│   │   │   └── debug/
│   │   │       ├── env/route.ts       # GET /api/debug/env
│   │   │       └── redis/route.ts     # GET /api/debug/redis
│   │   ├── page.tsx                    # Dashboard UI
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── persona.ts             # Dr. Aria Voss config
│   │   │   ├── memory.ts              # Redis + file persistence
│   │   │   ├── discovery.ts           # Topic discovery engine
│   │   │   ├── judgment.ts            # 5-dimension scoring
│   │   │   ├── writing.ts             # Post generation
│   │   │   └── scheduler.ts           # Cron cycle runner
│   │   ├── search/
│   │   │   └── web-search.ts          # Mock + real API search
│   │   └── utils/
│   │       ├── id-generator.ts        # Unique ID generation
│   │       └── logger.ts              # Session logging
│   └── types/index.ts                 # TypeScript interfaces
├── .github/workflows/cron.yml         # 3-hour GitHub Action
├── vercel.json                        # Vercel config
├── next.config.js                     # Next.js config
├── tsconfig.json                      # TypeScript config
├── package.json                       # Dependencies
├── PLAN.md                            # Architecture docs
├── README.md                          # Setup instructions
├── prompt.md                          # This file
└── stress-test.js                     # Validation suite
```
