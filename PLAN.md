# Autonomous AI Creator - Project Plan

## Project Overview
Build an autonomous AI technology persona that discovers topics, makes editorial decisions, writes content, and publishes autonomously over 48+ hours without human intervention.

## Persona Definition
**Name**: "Dr. Aria Voss"
**Domain**: AI Security Researcher
**Background**: Former red-team lead at a major AI lab, now independent researcher focusing on AI safety, alignment, and adversarial robustness
**Voice**: Technical but accessible, skeptical of hype, evidence-driven, slightly contrarian
**Interests**: 
- Adversarial attacks on LLMs
- AI safety evals and benchmarks
- Model extraction and inversion
- Prompt injection defenses
- AI governance and regulation
- Interpretability research

## Architecture

### Core Components

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
│  │  (cron)    │    │  (REST)    │    │  (prompt.md)│       │
│  └────────────┘    └────────────┘    └────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initialization** (`POST /api/agent/init`)
   - Create agent with persona config
   - Initialize memory store
   - Start background scheduler

2. **Discovery Cycle** (every 2-4 hours)
   - Search web for AI security topics
   - Filter by recency (last 48h)
   - Score relevance to persona interests
   - Store candidates in memory

3. **Judgment Cycle** (after discovery)
   - Evaluate each candidate against criteria:
     - Novelty (not covered before)
     - Technical depth
     - Actionable insight
     - Timeliness
     - Alignment with persona voice
   - Select top 1-2 topics
   - Store rejections with reasons

4. **Writing Cycle** (for selected topics)
   - Generate post in persona voice
   - Include rationale and sources
   - Store in published posts

5. **Feed Retrieval** (`GET /api/agent/feed`)
   - Return posts in reverse chronological order
   - Include full rationale and sources

## Technical Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Bun
- **Language**: TypeScript 5.4+
- **Storage**: File-based JSON (memory persistence)
- **Search**: Brave Search API / Firecrawl
- **Scheduling**: Node.js cron (node-cron)
- **Logging**: Custom prompt.md logger

## File Structure

```
autonomous-ai-creator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── agent/
│   │   │       ├── init/route.ts
│   │   │       └── feed/route.ts
│   │   └── page.tsx
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── types.ts
│   │   │   ├── persona.ts
│   │   │   ├── discovery.ts
│   │   │   ├── judgment.ts
│   │   │   ├── writing.ts
│   │   │   ├── memory.ts
│   │   │   └── scheduler.ts
│   │   ├── search/
│   │   │   └── web-search.ts
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── id-generator.ts
│   └── types/
│       └── index.ts
├── data/
│   ├── agents/
│   │   └── {agentId}/
│   │       ├── memory.json
│   │       ├── posts.json
│   │       └── config.json
│   └── prompt.md
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Memory Schema

```typescript
interface AgentMemory {
  agentId: string;
  persona: PersonaConfig;
  publishedPosts: PublishedPost[];
  rejectedTopics: RejectedTopic[];
  discoveredCandidates: TopicCandidate[];
  lastDiscoveryRun: string;
  lastJudgmentRun: string;
  lastPublishRun: string;
  preferences: {
    coveredTopics: string[];
    writingStyleNotes: string[];
    audienceAssumptions: string[];
  };
}
```

## API Specifications

### POST /api/agent/init
```json
Request: { "persona": { "name": "string", "domain": "string" } }
Response: { "agentId": "string" }
```

### GET /api/agent/feed?agentId=string
```json
Response: { 
  "posts": [
    {
      "id": "string",
      "createdAt": "ISO8601",
      "text": "string",
      "rationale": "string",
      "sources": "string[]"
    }
  ]
}
```

## Scheduling Strategy

- **Discovery**: Every 3 hours (0, 3, 6, 9, 12, 15, 18, 21 UTC)
- **Judgment**: 30 minutes after discovery
- **Writing**: 15 minutes after judgment
- **Initial run**: Immediate on init

## Editorial Criteria

### Acceptance Thresholds
- Relevance score ≥ 7/10
- Novelty score ≥ 6/10
- Technical depth ≥ 6/10
- Timeliness (published within 72h) ≥ 5/10
- Voice alignment ≥ 7/10

### Rejection Reasons (logged)
- "Already covered similar topic on {date}"
- "Insufficient technical depth"
- "Too promotional/hype-driven"
- "Outside persona domain expertise"
- "Source credibility insufficient"
- "Topic too broad/unfocused"

## Prompt.md Logging

Every action logged:
- Timestamp
- Action type (discovery, judgment, writing, publish, api_call)
- Input data
- Output/result
- Reasoning

## 48-Hour Autonomy Plan

| Hour | Activity |
|------|----------|
| 0 | Init, first discovery, judgment, publish 1-2 posts |
| 3 | Discovery cycle 2 |
| 6 | Discovery cycle 3, publish 1-2 posts |
| 9 | Discovery cycle 4 |
| 12 | Discovery cycle 5, publish 1-2 posts |
| 15 | Discovery cycle 6 |
| 18 | Discovery cycle 7, publish 1-2 posts |
| 21 | Discovery cycle 8 |
| 24 | Discovery cycle 9, publish 1-2 posts |
| 27 | Discovery cycle 10 |
| 30 | Discovery cycle 11, publish 1-2 posts |
| 33 | Discovery cycle 12 |
| 36 | Discovery cycle 13, publish 1-2 posts |
| 39 | Discovery cycle 14 |
| 42 | Discovery cycle 15, publish 1-2 posts |
| 45 | Discovery cycle 16 |
| 48 | Discovery cycle 17, final publish |

Expected: 12-18 posts over 48 hours

## Quality Gates

- [ ] Build passes (`bun run build`)
- [ ] Tests pass (`bun test`)
- [ ] No hardcoded secrets
- [ ] README exists
- [ ] Demo script ready (2 min)
- [ ] Team credited

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Search API limits | Cache results, fallback to multiple sources |
| Memory corruption | Atomic writes, backup on each cycle |
| Scheduler drift | Use UTC, log actual vs scheduled times |
| Voice drift | Store style exemplars, compare before publish |
| Duplicate topics | Semantic similarity check on titles |

## Implementation Order

1. Project setup + types
2. Memory system (file-based persistence)
3. Persona configuration
4. Web search integration
5. Discovery engine
6. Judgment engine
7. Writing engine
8. Scheduler
9. API endpoints
10. Prompt.md logger
11. Integration testing
12. Documentation