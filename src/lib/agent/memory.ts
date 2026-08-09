import { Redis } from "@upstash/redis";
import {
  AgentMemory,
  PersonaConfig,
  PublishedPost,
  RejectedTopic,
  TopicCandidate,
  AgentConfig,
  AgentPreferences,
  AgentStats,
} from "@/types";
import { ARIA_VOSS_PERSONA, AGENT_CONFIG } from "./persona";
import { generateAgentId, generatePostId, generateTopicId } from "@/lib/utils/id-generator";

// In-memory fallback for testing without Redis
const memoryStore = new Map<string, AgentMemory>();
const agentsIndex = new Set<string>();

const hasRedis = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedis ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
}) : null;

const AGENT_KEY = (agentId: string) => `agent:${agentId}`;
const AGENTS_INDEX_KEY = "agents:index";

async function getAgentMemory(agentId: string): Promise<AgentMemory | null> {
  if (hasRedis && redis) {
    const data = await redis.get(AGENT_KEY(agentId));
    return data as AgentMemory | null;
  }
  return memoryStore.get(agentId) || null;
}

async function setAgentMemory(memory: AgentMemory): Promise<void> {
  if (hasRedis && redis) {
    await redis.set(AGENT_KEY(memory.agentId), JSON.stringify(memory));
    await redis.sadd(AGENTS_INDEX_KEY, memory.agentId);
  } else {
    memoryStore.set(memory.agentId, memory);
    agentsIndex.add(memory.agentId);
  }
}

export async function createAgentMemory(personaOverrides?: Partial<PersonaConfig>): Promise<AgentMemory> {
  const agentId = generateAgentId();
  
  const persona: PersonaConfig = {
    ...ARIA_VOSS_PERSONA,
    ...personaOverrides,
  };

  const config: AgentConfig = { ...AGENT_CONFIG };

  const preferences: AgentPreferences = {
    coveredTopics: [],
    writingStyleNotes: [],
    audienceAssumptions: [
      "Technical audience familiar with ML concepts",
      "Security practitioners and researchers",
      "Policy makers interested in AI risk",
    ],
    preferredSources: [
      "arxiv.org",
      "openai.com/research",
      "anthropic.com/research",
      "deepmind.google",
      "security.googleblog.com",
    ],
    avoidedTopics: [
      "General AI hype/news without technical depth",
      "Product announcements without security angle",
      "Philosophy of AI without concrete threat models",
    ],
  };

  const stats: AgentStats = {
    totalDiscovered: 0,
    totalPublished: 0,
    totalRejected: 0,
    avgRelevanceScore: 0,
    lastActiveAt: new Date().toISOString(),
  };

  const memory: AgentMemory = {
    agentId,
    persona,
    config,
    publishedPosts: [],
    rejectedTopics: [],
    discoveredCandidates: [],
    lastDiscoveryRun: null,
    lastJudgmentRun: null,
    lastPublishRun: null,
    preferences,
    stats,
  };

  await setAgentMemory(memory);
  return memory;
}

export async function loadAgentMemory(agentId: string): Promise<AgentMemory | null> {
  return getAgentMemory(agentId);
}

export async function saveAgentMemory(memory: AgentMemory): Promise<void> {
  await setAgentMemory(memory);
}

export async function addPublishedPost(agentId: string, post: PublishedPost): Promise<void> {
  const memory = await loadAgentMemory(agentId);
  if (!memory) throw new Error(`Agent ${agentId} not found`);

  memory.publishedPosts.unshift(post);
  memory.stats.totalPublished++;
  memory.stats.lastActiveAt = new Date().toISOString();
  
  const topicWords = post.candidate.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  memory.preferences.coveredTopics.push(...topicWords);
  memory.preferences.coveredTopics = [...new Set(memory.preferences.coveredTopics)].slice(-100);

  await saveAgentMemory(memory);
}

export async function addRejectedTopic(agentId: string, rejected: RejectedTopic): Promise<void> {
  const memory = await loadAgentMemory(agentId);
  if (!memory) throw new Error(`Agent ${agentId} not found`);

  memory.rejectedTopics.unshift(rejected);
  memory.stats.totalRejected++;
  memory.stats.lastActiveAt = new Date().toISOString();

  await saveAgentMemory(memory);
}

export async function addDiscoveredCandidates(agentId: string, candidates: TopicCandidate[]): Promise<void> {
  const memory = await loadAgentMemory(agentId);
  if (!memory) throw new Error(`Agent ${agentId} not found`);

  const existingUrls = new Set(memory.discoveredCandidates.map((c) => c.url));
  const newCandidates = candidates.filter((c) => !existingUrls.has(c.url));

  memory.discoveredCandidates.unshift(...newCandidates);
  memory.discoveredCandidates = memory.discoveredCandidates.slice(0, 500);
  memory.stats.totalDiscovered += newCandidates.length;
  memory.lastDiscoveryRun = new Date().toISOString();
  memory.stats.lastActiveAt = new Date().toISOString();

  await saveAgentMemory(memory);
}

export async function updateLastJudgmentRun(agentId: string): Promise<void> {
  const memory = await loadAgentMemory(agentId);
  if (!memory) return;
  memory.lastJudgmentRun = new Date().toISOString();
  memory.stats.lastActiveAt = new Date().toISOString();
  await saveAgentMemory(memory);
}

export async function updateLastPublishRun(agentId: string): Promise<void> {
  const memory = await loadAgentMemory(agentId);
  if (!memory) return;
  memory.lastPublishRun = new Date().toISOString();
  memory.stats.lastActiveAt = new Date().toISOString();
  await saveAgentMemory(memory);
}

export async function getPublishedPosts(agentId: string): Promise<PublishedPost[]> {
  const memory = await loadAgentMemory(agentId);
  return memory?.publishedPosts ?? [];
}

export async function getRejectedTopics(agentId: string): Promise<RejectedTopic[]> {
  const memory = await loadAgentMemory(agentId);
  return memory?.rejectedTopics ?? [];
}

export async function getDiscoveredCandidates(agentId: string): Promise<TopicCandidate[]> {
  const memory = await loadAgentMemory(agentId);
  return memory?.discoveredCandidates ?? [];
}

export async function getAgentConfig(agentId: string): Promise<{ persona: PersonaConfig; config: AgentConfig } | null> {
  const memory = await loadAgentMemory(agentId);
  if (!memory) return null;
  return { persona: memory.persona, config: memory.config };
}

export async function listAgentIds(): Promise<string[]> {
  if (hasRedis && redis) {
    const agents = await redis.smembers(AGENTS_INDEX_KEY);
    return (agents as string[]) || [];
  }
  return Array.from(agentsIndex);
}