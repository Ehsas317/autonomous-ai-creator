import { LogEntry } from "@/types";
import * as fs from "fs";
import * as path from "path";

const PROMPT_LOG_PATH = path.join(process.cwd(), "data", "prompt.md");

function ensureLogFile(): void {
  const dir = path.dirname(PROMPT_LOG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(PROMPT_LOG_PATH)) {
    const header = `# Autonomous AI Creator - Session Log

## Session Started: ${new Date().toISOString()}

### User Request
Build an autonomous AI and technology persona that:
- Discovers topics from live information sources
- Makes editorial judgments on what to publish
- Writes in a consistent editorial voice
- Remembers previously published content
- Continues publishing over 48 hours without human input
- Includes publishing rationale for every post

API Endpoints required:
- POST /api/agent/init
- GET /api/agent/feed?agentId=...

Persona: AI Security Researcher (original identity)

### Plan Created
Comprehensive architecture documented in PLAN.md with:
- Persona: "Dr. Aria Voss" - AI Security Researcher
- Technical stack: Next.js 15, TypeScript, Bun
- Memory: File-based JSON persistence
- Search: Web search integration
- Scheduling: Cron-based autonomous cycles
- Logging: prompt.md for full session trace

---

## Implementation Log
`;
    fs.writeFileSync(PROMPT_LOG_PATH, header, "utf-8");
  }
}

function formatLogEntry(entry: LogEntry): string {
  const lines = [
    `### [${entry.timestamp}] ${entry.action.toUpperCase()}`,
    `**Agent:** ${entry.agentId}`,
    `**Duration:** ${entry.durationMs ?? "N/A"}ms`,
  ];

  if (entry.reasoning) {
    lines.push(`**Reasoning:** ${entry.reasoning}`);
  }

  if (entry.input) {
    lines.push(`**Input:**`);
    lines.push("```json");
    lines.push(JSON.stringify(entry.input, null, 2));
    lines.push("```");
  }

  if (entry.output) {
    lines.push(`**Output:**`);
    lines.push("```json");
    lines.push(JSON.stringify(entry.output, null, 2));
    lines.push("```");
  }

  lines.push("---");
  return lines.join("\n");
}

export function logAction(entry: Omit<LogEntry, "timestamp">): void {
  ensureLogFile();

  const fullEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  const formatted = formatLogEntry(fullEntry);
  fs.appendFileSync(PROMPT_LOG_PATH, formatted + "\n", "utf-8");
}

export function logDiscovery(agentId: string, input: unknown, output: unknown, reasoning: string, durationMs: number): void {
  logAction({ agentId, action: "discovery", input, output, reasoning, durationMs });
}

export function logJudgment(agentId: string, input: unknown, output: unknown, reasoning: string, durationMs: number): void {
  logAction({ agentId, action: "judgment", input, output, reasoning, durationMs });
}

export function logWriting(agentId: string, input: unknown, output: unknown, reasoning: string, durationMs: number): void {
  logAction({ agentId, action: "writing", input, output, reasoning, durationMs });
}

export function logPublish(agentId: string, input: unknown, output: unknown, reasoning: string, durationMs: number): void {
  logAction({ agentId, action: "publish", input, output, reasoning, durationMs });
}

export function logApiCall(agentId: string, input: unknown, output: unknown, reasoning: string, durationMs: number): void {
  logAction({ agentId, action: "api_call", input, output, reasoning, durationMs });
}

export function logScheduler(agentId: string, input: unknown, output: unknown, reasoning: string, durationMs: number): void {
  logAction({ agentId, action: "scheduler", input, output, reasoning, durationMs });
}

export function logError(agentId: string, input: unknown, error: Error, durationMs: number): void {
  logAction({
    agentId,
    action: "error",
    input,
    output: { message: error.message, stack: error.stack },
    reasoning: "Error occurred during operation",
    durationMs,
  });
}