import cron from "node-cron";
import { runDiscovery } from "./discovery";
import { runJudgment } from "./judgment";
import { generatePost } from "./writing";
import { loadAgentMemory, saveAgentMemory, addPublishedPost, addRejectedTopic, addDiscoveredCandidates, updateLastJudgmentRun, updateLastPublishRun, listAgentIds } from "./memory";
import { logScheduler, logError } from "@/lib/utils/logger";

interface ScheduledJob {
  agentId: string;
  task: cron.ScheduledTask;
}

const activeJobs = new Map<string, ScheduledJob>();

export function startAgentScheduler(agentId: string): void {
  if (activeJobs.has(agentId)) {
    console.log(`Scheduler already running for agent ${agentId}`);
    return;
  }

  const memory = loadAgentMemory(agentId);
  if (!memory) {
    throw new Error(`Agent ${agentId} not found`);
  }

  const intervalHours = memory.config.discoveryIntervalHours;
  const cronExpression = `0 */${intervalHours} * * *`; // Every N hours at minute 0

  console.log(`Starting scheduler for agent ${agentId} with interval ${intervalHours}h (cron: ${cronExpression})`);

  const task = cron.schedule(cronExpression, async () => {
    await runAutonomousCycle(agentId);
  }, {
    scheduled: true,
    timezone: "UTC",
  });

  activeJobs.set(agentId, { agentId, task });

  // Run initial cycle immediately
  runAutonomousCycle(agentId).catch((err) => {
    logError(agentId, { phase: "initial_cycle" }, err, 0);
  });
}

export function stopAgentScheduler(agentId: string): void {
  const job = activeJobs.get(agentId);
  if (job) {
    job.task.stop();
    activeJobs.delete(agentId);
    console.log(`Stopped scheduler for agent ${agentId}`);
  }
}

export function stopAllSchedulers(): void {
  for (const [agentId, job] of activeJobs) {
    job.task.stop();
  }
  activeJobs.clear();
  console.log("Stopped all schedulers");
}

export async function runAutonomousCycle(agentId: string): Promise<void> {
  const cycleStart = Date.now();
  logScheduler(agentId, { cycleStart: new Date().toISOString() }, null, "Starting autonomous cycle", 0);

  try {
    const memory = loadAgentMemory(agentId);
    if (!memory) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Phase 1: Discovery
    logScheduler(agentId, { phase: "discovery" }, null, "Running discovery phase", 0);
    const candidates = await runDiscovery(agentId, memory);
    
    if (candidates.length > 0) {
      addDiscoveredCandidates(agentId, candidates);
    }

    // Phase 2: Judgment
    logScheduler(agentId, { phase: "judgment", candidateCount: candidates.length }, null, "Running judgment phase", 0);
    const { selected, rejected } = runJudgment(agentId, memory, candidates);

    // Save rejected topics
    for (const r of rejected) {
      addRejectedTopic(agentId, r);
    }
    updateLastJudgmentRun(agentId);

    // Phase 3: Writing & Publishing
    if (selected.length > 0) {
      logScheduler(agentId, { phase: "writing", selectedCount: selected.length }, null, "Running writing phase", 0);
      
      for (const candidate of selected) {
        const post = generatePost(candidate, memory);
        addPublishedPost(agentId, post);
      }
      updateLastPublishRun(agentId);
    }

    const duration = Date.now() - cycleStart;
    logScheduler(agentId, { duration, postsPublished: selected.length, topicsRejected: rejected.length }, null, `Cycle completed in ${duration}ms`, duration);

  } catch (error) {
    logError(agentId, { cycleStart }, error as Error, Date.now() - cycleStart);
    console.error(`Autonomous cycle failed for agent ${agentId}:`, error);
  }
}

export async function runInitialCycle(agentId: string): Promise<void> {
  console.log(`Running initial cycle for agent ${agentId}`);
  await runAutonomousCycle(agentId);
}

export function getActiveAgents(): string[] {
  return Array.from(activeJobs.keys());
}

export function isAgentRunning(agentId: string): boolean {
  return activeJobs.has(agentId);
}

// Restart schedulers for all existing agents (call on server startup)
export async function restartAllSchedulers(): Promise<void> {
  const agentIds = listAgentIds();
  console.log(`Restarting schedulers for ${agentIds.length} agents`);
  
  for (const agentId of agentIds) {
    try {
      startAgentScheduler(agentId);
    } catch (error) {
      console.error(`Failed to restart scheduler for ${agentId}:`, error);
    }
  }
}