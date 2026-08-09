import { runDiscovery } from "./discovery";
import { runJudgment } from "./judgment";
import { generatePost } from "./writing";
import { loadAgentMemory, saveAgentMemory, addPublishedPost, addRejectedTopic, addDiscoveredCandidates, updateLastJudgmentRun, updateLastPublishRun, listAgentIds } from "./memory";
import { logScheduler, logError } from "@/lib/utils/logger";

export async function runAutonomousCycle(agentId: string): Promise<{ success: boolean; postsPublished: number; topicsRejected: number; error?: string }> {
  const cycleStart = Date.now();
  logScheduler(agentId, { cycleStart: new Date().toISOString() }, null, "Starting autonomous cycle", 0);

  try {
    const memory = await loadAgentMemory(agentId);
    if (!memory) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Phase 1: Discovery
    logScheduler(agentId, { phase: "discovery" }, null, "Running discovery phase", 0);
    const candidates = await runDiscovery(agentId, memory);
    
    if (candidates.length > 0) {
      await addDiscoveredCandidates(agentId, candidates);
    }

    // Phase 2: Judgment
    logScheduler(agentId, { phase: "judgment", candidateCount: candidates.length }, null, "Running judgment phase", 0);
    const { selected, rejected } = runJudgment(agentId, memory, candidates);

    // Save rejected topics
    for (const r of rejected) {
      await addRejectedTopic(agentId, r);
    }
    await updateLastJudgmentRun(agentId);

    // Phase 3: Writing & Publishing
    if (selected.length > 0) {
      logScheduler(agentId, { phase: "writing", selectedCount: selected.length }, null, "Running writing phase", 0);
      
      for (const candidate of selected) {
        const post = generatePost(candidate, memory);
        await addPublishedPost(agentId, post);
      }
      await updateLastPublishRun(agentId);
    }

    const duration = Date.now() - cycleStart;
    logScheduler(agentId, { duration, postsPublished: selected.length, topicsRejected: rejected.length }, null, `Cycle completed in ${duration}ms`, duration);

    return { success: true, postsPublished: selected.length, topicsRejected: rejected.length };
  } catch (error) {
    logError(agentId, { cycleStart }, error as Error, Date.now() - cycleStart);
    console.error(`Autonomous cycle failed for agent ${agentId}:`, error);
    return { success: false, postsPublished: 0, topicsRejected: 0, error: (error as Error).message };
  }
}

export async function runAllAgentsCycle(): Promise<void> {
  const agentIds = await listAgentIds();
  console.log(`Running scheduled cycle for ${agentIds.length} agents`);
  
  for (const agentId of agentIds) {
    try {
      await runAutonomousCycle(agentId);
    } catch (error) {
      console.error(`Failed to run cycle for agent ${agentId}:`, error);
    }
  }
}

export async function runInitialCycle(agentId: string): Promise<void> {
  console.log(`Running initial cycle for agent ${agentId}`);
  await runAutonomousCycle(agentId);
}