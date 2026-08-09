import { Redis } from "@upstash/redis";
import * as fs from "fs";
import * as path from "path";
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

const isDev = process.env.NODE_ENV === "development";
const hasRedis = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasRedis ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
}) : null;

const DATA_DIR = path.join(process.cwd(), "data", "agents");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getAgentFilePath(agentId: string): string {
  return path.join(DATA_DIR, `${agentId}.json`);
}

async function getAgentMemory(agentId: string): Promise<AgentMemory | null> {
  if (hasRedis && redis) {
    const data = await redis.get(`agent:${agentId}`);
    return data as AgentMemory | null;
  }
  
  // File-based fallback for local dev
  ensureDataDir();
  const filePath = getAgentFilePath(agentId);
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as AgentMemory;
  } catch {
    return null;
  }
}

async function setAgentMemory(memory: AgentMemory): Promise<void> {
  if (hasRedis && redis) {
    await redis.set(`agent:${memory.agentId}`, JSON.stringify(memory));
    await redis.sadd("agents:index", memory.agentId);
    return;
  }
  
  // File-based fallback for local dev
  ensureDataDir();
  const filePath = getAgentFilePath(memory.agentId);
  fs.writeFileSync(filePath, JSON.stringify(memory, null, 2), "utf-8");
}

async function listAgentIds(): Promise<string[]> {
  if (hasRedis && redis) {
    const agents = await redis.smembers("agents:index");
    return (agents as string[]) || [];
  }
  
  // File-based fallback for local dev
  ensureDataDir();
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(".json", ""));
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

export { listAgentIds };