import { LogEntry } from "@/types";

const isVercel = process.env.VERCEL === "1";

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
  if (isVercel) {
    // On Vercel, just log to console (goes to Vercel logs)
    console.log(JSON.stringify({ ...entry, timestamp: new Date().toISOString() }, null, 2));
    return;
  }

  const fullEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  const PROMPT_LOG_PATH = "/Users/apple/autonomous-ai-creator/data/prompt.md";
  
  // Local development: write to file
  try {
    const fs = require("fs");
    const path = require("path");
    const dir = path.dirname(PROMPT_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(PROMPT_LOG_PATH)) {
      const header = `# Autonomous AI Creator - Session Log\n\n## Session Started: ${new Date().toISOString()}\n\n---\n`;
      fs.writeFileSync(PROMPT_LOG_PATH, header, "utf-8");
    }
    const formatted = formatLogEntry(fullEntry);
    fs.appendFileSync(PROMPT_LOG_PATH, formatted + "\n", "utf-8");
  } catch (e) {
    console.error("Failed to write prompt log:", e);
  }
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