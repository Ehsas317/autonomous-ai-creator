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
import { generateAgentId } from "@/lib/utils/id-generator";

const DATA_DIR = path.join(process.cwd(), "data", "agents");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getAgentDir(agentId: string): string {
  return path.join(DATA_DIR, agentId);
}

function getMemoryPath(agentId: string): string {
  return path.join(getAgentDir(agentId), "memory.json");
}

function getPostsPath(agentId: string): string {
  return path.join(getAgentDir(agentId), "posts.json");
}

function getConfigPath(agentId: string): string {
  return path.join(getAgentDir(agentId), "config.json");
}

function atomicWrite(filePath: string, data: unknown): void {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tempPath, filePath);
}

export function createAgentMemory(personaOverrides?: Partial<PersonaConfig>): AgentMemory {
  const agentId = generateAgentId();
  const agentDir = getAgentDir(agentId);
  
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }

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

  atomicWrite(getMemoryPath(agentId), memory);
  atomicWrite(getPostsPath(agentId), []);
  atomicWrite(getConfigPath(agentId), { persona, config });

  return memory;
}

export function loadAgentMemory(agentId: string): AgentMemory | null {
  const memoryPath = getMemoryPath(agentId);
  if (!fs.existsSync(memoryPath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(memoryPath, "utf-8");
    return JSON.parse(data) as AgentMemory;
  } catch {
    return null;
  }
}

export function saveAgentMemory(memory: AgentMemory): void {
  ensureDataDir();
  const agentDir = getAgentDir(memory.agentId);
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }
  atomicWrite(getMemoryPath(memory.agentId), memory);
}

export function addPublishedPost(agentId: string, post: PublishedPost): void {
  const memory = loadAgentMemory(agentId);
  if (!memory) throw new Error(`Agent ${agentId} not found`);

  memory.publishedPosts.unshift(post); // Newest first
  memory.stats.totalPublished++;
  memory.stats.lastActiveAt = new Date().toISOString();
  
  // Update covered topics
  const topicWords = post.candidate.title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  memory.preferences.coveredTopics.push(...topicWords);
  memory.preferences.coveredTopics = [...new Set(memory.preferences.coveredTopics)].slice(-100);

  saveAgentMemory(memory);
}

export function addRejectedTopic(agentId: string, rejected: RejectedTopic): void {
  const memory = loadAgentMemory(agentId);
  if (!memory) throw new Error(`Agent ${agentId} not found`);

  memory.rejectedTopics.unshift(rejected);
  memory.stats.totalRejected++;
  memory.stats.lastActiveAt = new Date().toISOString();

  saveAgentMemory(memory);
}

export function addDiscoveredCandidates(agentId: string, candidates: TopicCandidate[]): void {
  const memory = loadAgentMemory(agentId);
  if (!memory) throw new Error(`Agent ${agentId} not found`);

  // Deduplicate by URL
  const existingUrls = new Set(memory.discoveredCandidates.map((c) => c.url));
  const newCandidates = candidates.filter((c) => !existingUrls.has(c.url));

  memory.discoveredCandidates.unshift(...newCandidates);
  // Keep only last 500 candidates
  memory.discoveredCandidates = memory.discoveredCandidates.slice(0, 500);
  memory.stats.totalDiscovered += newCandidates.length;
  memory.lastDiscoveryRun = new Date().toISOString();
  memory.stats.lastActiveAt = new Date().toISOString();

  saveAgentMemory(memory);
}

export function updateLastJudgmentRun(agentId: string): void {
  const memory = loadAgentMemory(agentId);
  if (!memory) return;
  memory.lastJudgmentRun = new Date().toISOString();
  memory.stats.lastActiveAt = new Date().toISOString();
  saveAgentMemory(memory);
}

export function updateLastPublishRun(agentId: string): void {
  const memory = loadAgentMemory(agentId);
  if (!memory) return;
  memory.lastPublishRun = new Date().toISOString();
  memory.stats.lastActiveAt = new Date().toISOString();
  saveAgentMemory(memory);
}

export function getPublishedPosts(agentId: string): PublishedPost[] {
  const memory = loadAgentMemory(agentId);
  return memory?.publishedPosts ?? [];
}

export function getRejectedTopics(agentId: string): RejectedTopic[] {
  const memory = loadAgentMemory(agentId);
  return memory?.rejectedTopics ?? [];
}

export function getDiscoveredCandidates(agentId: string): TopicCandidate[] {
  const memory = loadAgentMemory(agentId);
  return memory?.discoveredCandidates ?? [];
}

export function getAgentConfig(agentId: string): { persona: PersonaConfig; config: AgentConfig } | null {
  const configPath = getConfigPath(agentId);
  if (!fs.existsSync(configPath)) return null;
  try {
    const data = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function listAgentIds(): string[] {
  ensureDataDir();
  return fs.readdirSync(DATA_DIR).filter((name) => {
    const fullPath = path.join(DATA_DIR, name);
    return fs.statSync(fullPath).isDirectory();
  });
}