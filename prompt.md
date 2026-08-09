# Autonomous AI Creator - Project Specification

## Original Request
Build an autonomous AI and technology persona that no longer waits for instructions. The system must discover topics, make editorial judgments, write in a consistent voice, remember published content, and continue publishing over 48+ hours without human intervention.

**Hackathon:** ABTalks Vibe Code Hackathon  
**Source:** https://www.abtalks.in/hackathon/submission  
**Deadline:** 2026-08-09 (4 hours remaining)

---

## Problem Statement

Every day, thousands of AI-generated posts appear on LinkedIn and X — almost all exist because a human wrote the first prompt. Build an **autonomous AI technology persona** that, once initialized, can:

1. Discover topics from live information sources
2. Decide whether a topic is worth publishing (reject low-quality topics)
3. Write in a consistent editorial voice
4. Remember previously published content
5. Continue publishing over time without additional human input

The persona must represent an original identity within the AI and technology ecosystem (e.g., AI Security Researcher, ML Engineer, AI Product Analyst, etc.).

---

## Minimum Requirements

### 1. Topic Discovery
The agent must independently discover AI and technology topics using the web or another live information source.

### 2. Editorial Judgment
The agent should intentionally reject topics that do not meet its publishing standards instead of publishing everything.

### 3. Consistent Persona
The agent must maintain:
- A consistent writing style
- Stable interests
- Distinct editorial opinions
- A coherent voice focused on AI and technology

### 4. Memory
The agent must remember previously published content to maintain continuity and avoid repetition.

### 5. Autonomous Publishing
Publishing must occur over time rather than generating all content immediately. The submission will be observed for approximately **48 hours** after initialization. New posts must appear without additional prompts or API calls. Simulated publishing is acceptable; real social-media integration is not required.

### 6. Publishing Rationale
Every published post must include:
- Why the topic was selected
- Why it is relevant now
- The information sources used

---

## Required API Endpoints

### Initialize Agent
```http
POST /api/agent/init
```
Request:
```json
{
  "persona": {
    "name": "Ada",
    "domain": "AI Security"
  }
}
```
Response:
```json
{
  "agentId": "abc-123"
}
```

### Retrieve Feed
```http
GET /api/agent/feed?agentId=abc-123
```
Response:
```json
{
  "posts": [
    {
      "id": "p7",
      "createdAt": "2026-08-08T10:30:00Z",
      "text": "...",
      "rationale": "Why this topic was selected, why it is relevant now, and why it was chosen over other candidates.",
      "sources": ["https://example.com"]
    }
  ]
}
```

### Feed Requirements
- Return posts in reverse chronological order, newest first
- Every post must have a unique `id`
- `createdAt` must be an ISO 8601 UTC timestamp
- Previously returned posts must remain available
- If no posts, return `{ "posts": [] }`

---

## Evaluation Criteria
Judges will primarily assess:
- Autonomous operation after initialization
- Quality of editorial decision-making
- Consistency of the AI persona
- Effective use of memory
- Transparency of publishing rationale
- Overall quality and coherence of the generated feed

---

## What Was Built

### Persona: Dr. Aria Voss — AI Security Researcher
- **Background:** Former red-team lead at a major AI lab, now independent researcher
- **Voice:** Technical but accessible, skeptical of hype, evidence-driven, slightly contrarian
- **Skepticism:** 8/10 | **Contrarian:** 7/10
- **Interests:** Adversarial attacks on LLMs, AI safety evals, model extraction, prompt injection defenses, AI governance, interpretability, red-teaming, supply chain attacks on ML, watermarking, frontier model risk assessment

### Architecture
```
Discovery → Judgment → Writing → Publishing
    ↓           ↓           ↓          ↓
Web search  5-dimension  Persona-    Feed API
(10 queries) scoring      driven      + Rationale
```

### Tech Stack
- **Framework:** Next.js 14.2.35, TypeScript 5.4+
- **Runtime:** Node.js (Vercel serverless)
- **Database:** Upstash Redis (REST URL + token)
- **Scheduling:** GitHub Actions (every 3 hours) + Vercel Cron (daily)
- **Memory:** Redis persistence with file-based fallback for local dev
- **Search:** Mock data (with Brave/Firecrawl API integration stubs)

### File Structure
```
/autonomous-ai-creator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agent/
│   │   │   │   ├── init/route.ts      # POST /api/agent/init
│   │   │   │   └── feed/route.ts      # GET /api/agent/feed
│   │   │   ├── cron/route.ts          # GET /api/cron (trigger cycle)
│   │   │   └── debug/
│   │   │       ├── env/route.ts       # Env var check
│   │   │       └── redis/route.ts     # Redis connection test
│   │   ├── page.tsx                    # Dashboard UI
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── persona.ts             # Dr. Aria Voss config
│   │   │   ├── memory.ts              # Redis + file-based memory
│   │   │   ├── discovery.ts           # Topic discovery engine
│   │   │   ├── judgment.ts            # 5-dimension scoring
│   │   │   ├── writing.ts             # Post generation templates
│   │   │   └── scheduler.ts           # Cron cycle runner
│   │   ├── search/
│   │   │   └── web-search.ts          # Mock + real API search
│   │   └── utils/
│   │       ├── id-generator.ts        # Unique ID generation
│   │       └── logger.ts              # prompt.md session logging
│   └── types/index.ts                 # TypeScript interfaces
├── .github/workflows/cron.yml         # 3-hour GitHub Action
├── vercel.json                        # Vercel config
├── PLAN.md                            # Architecture documentation
├── README.md                          # Setup instructions
└── stress-test.js                     # Validation suite
```

### Core Components

#### 1. Discovery Engine (`discovery.ts`)
- Searches 10 AI security queries per cycle
- Scores results on recency, source credibility, tag extraction
- Deduplicates by URL
- Supports Brave API, Firecrawl API, or mock fallback

#### 2. Judgment Engine (`judgment.ts`)
- 5-dimension scoring: relevance (0.25), novelty (0.20), technical depth (0.20), timeliness (0.15), voice alignment (0.20)
- Minimum thresholds per dimension + composite score of 7.0
- Detailed rejection reasons for transparency

#### 3. Writing Engine (`writing.ts`)
- Template-based generation with opening, technical summary, critique, implication, closing
- Style exemplars ensure consistent voice
- Each post includes full rationale with scores

#### 4. Memory System (`memory.ts`)
- Upstash Redis for production persistence
- File-based fallback for local development
- Tracks: published posts, rejected topics, discovered candidates, preferences, stats

#### 5. Scheduler (`scheduler.ts`)
- Cron-based autonomous cycles (every 3 hours)
- GitHub Actions trigger (Vercel Hobby limits crons to daily)
- Runs initial cycle immediately on agent init

---

## Live Deployment
- **Production:** https://autonomous-ai-creator-ebon.vercel.app
- **GitHub:** https://github.com/Ehsas317/autonomous-ai-creator
- **Redis:** Upstash (connected and verified working)
- **Cron:** GitHub Actions every 3 hours

### Verified Working Endpoints
```bash
# Initialize agent → 201 Created
curl -X POST https://autonomous-ai-creator-ebon.vercel.app/api/agent/init \
  -H "Content-Type: application/json" \
  -d '{"persona":{"name":"Dr. Aria Voss","domain":"AI Security Research"}}'

# Get feed → posts with rationale + sources
curl "https://autonomous-ai-creator-ebon.vercel.app/api/agent/feed?agentId=AGENT_ID"

# Trigger cycle → autonomous publishing
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://autonomous-ai-creator-ebon.vercel.app/api/cron
```

---

## Hackathon Checklist
- [x] Build passes (`npm run build`)
- [x] TypeScript compiles cleanly (`tsc --noEmit`)
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

---

## Environment Variables Required
| Platform | Key | Purpose |
|----------|-----|---------|
| Vercel | `UPSTASH_REDIS_REST_URL` | Redis connection URL |
| Vercel | `UPSTASH_REDIS_REST_TOKEN` | Redis auth token |
| Vercel | `CRON_SECRET` | Cron endpoint auth |
| GitHub | `VERCEL_URL` | Action target URL |
| GitHub | `CRON_SECRET` | Action auth (same as above) |

### Scoring Thresholds (Judgment Engine)
| Dimension | Weight | Min Threshold |
|-----------|--------|---------------|
| Relevance | 0.25 | 6.5 |
| Novelty | 0.20 | 6.0 |
| Technical Depth | 0.20 | 6.0 |
| Timeliness | 0.15 | 5.0 |
| Voice Alignment | 0.20 | 6.5 |
| **Composite** | — | **7.0** |

### Source Credibility Map
| Domain | Score |
|--------|-------|
| arxiv.org | 10 |
| openai.com, anthropic.com, deepmind.google | 9 |
| blog.security.google, security.googleblog.com | 9 |
| microsoft.com, meta.ai | 8 |
| distill.pub, jailbreakbench.org | 8 |
| huggingface.co, paperswithcode.com | 7 |
| Unknown sources | 5 |

### Search Queries (Per Cycle)
1. adversarial attack LLM prompt injection 2024
2. AI safety evaluation benchmark red teaming
3. model extraction attack machine learning
4. LLM jailbreak defense mechanism
5. AI governance regulation liability 2024
6. mechanistic interpretability neural network
7. AI watermarking provenance detection
8. frontier model risk assessment framework
9. supply chain attack ML pipeline
10. membership inference attack language model

### Mock Data Topics (10 topics in simulator)
1. Universal Adversarial Prompts for LLMs
2. Prompt Injection in RAG Systems
3. Model Extraction Attacks on Production LLMs via API
4. The Watermark Paradox: Robustness vs. Detectability
5. Red Teaming Frontier Models: 10,000 Hours of Testing
6. Membership Inference in LLMs: A Practical Study
7. AI Liability Frameworks: Who's Responsible?
8. Mechanistic Interpretability of Deceptive Alignment
9. Supply Chain Attacks on ML: Dataset Poisoning
10. Jailbreak Benchmark: 500+ Attacks Evaluated

---

## Example Output

### Sample Post (Dr. Aria Voss)
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

### Sample Rationale
```
**Why this topic:**
- Directly aligns with my focus on model-extraction (relevance: 10.0/10)
- Novel contribution not covered in my previous 0 posts (novelty: 10.0/10)
- Substantial technical depth with 6.0/10 score
- Published 1d ago — highly timely (timeliness: 6.0/10)
- Source (openai.com/research) matches my skeptical, evidence-driven voice (voice alignment: 7.0/10)

**Why now:**
- Published 1d ago and actively being discussed
- Immediate implications for production LLM deployments

**Why not other candidates:**
- This candidate had the highest composite score across all evaluation dimensions
```

---

## Stress Test Results
- **5 autonomous cycles** run consecutively
- All cycles returned `{"success":true,"message":"Autonomous cycle completed for all agents"}`
- Feed validation: reverse chronological order ✓, unique IDs ✓
- Memory persistence: 8874 bytes stored, 1 published, 1 rejected, 2 discovered
- Prompt logging: 261 log entries, 165KB total
- Edge cases: 404 for non-existent agent ✓, 400 for missing fields ✓

---

## Known Limitations & Issues
1. **Selective publishing:** The agent is strict — with mock data only ~1 topic per cycle passes all thresholds. Real-world use with live search APIs would yield more diverse content.
2. **Mock data repetition:** The mock search returns the same candidates each cycle, so the agent correctly avoids re-publishing (memory working as designed).
3. **Vercel Hobby cron limit:** Only daily cron allowed. GitHub Actions handles the 3-hour intervals.
4. **No real web search:** Brave/Firecrawl API keys not configured, so the system uses mock data. Add API keys for real topic discovery.
5. **Post quality:** Template-based writing produces somewhat repetitive structure. Real LLM integration would improve variety.

---

## Debug Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /api/debug/env` | Shows which env vars are set (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, CRON_SECRET) |
| `GET /api/debug/redis` | Tests Redis connection (ping, set, get, del) |

---

## Not Required (Per Hackathon Spec)
- Real social-media posting
- Multi-platform publishing
- Images or videos
- Engagement analytics
- Multi-agent architectures
- Human intervention after initialization
