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

const REPO_OWNER = "Ehsas317";
const REPO_NAME = "autonomous-ai-creator";
const BRANCH = "main";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const DATA_DIR = path.join(process.cwd(), "data", "agents");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getAgentFilePath(agentId: string): string {
  return path.join(DATA_DIR, `${agentId}.json`);
}

const GITHUB_API = "https://api.github.com";
const RAW_GITHUB = "https://raw.githubusercontent.com";

async function githubRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN not configured");
  }
  const res = await fetch(`${GITHUB_API}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${text}`);
  }
  return res.json();
}

async function readAgentFromGitHub(agentId: string): Promise<AgentMemory | null> {
  try {
    const url = `${RAW_GITHUB}/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/data/agents/${agentId}.json`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function writeAgentToGitHub(memory: AgentMemory): Promise<void> {
  const filePath = `data/agents/${memory.agentId}.json`;
  const content = Buffer.from(JSON.stringify(memory, null, 2)).toString("base64");

  // Get current file SHA if exists
  let sha: string | undefined;
  try {
    const existing = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${BRANCH}`);
    sha = existing.sha;
  } catch {
    // File doesn't exist
  }

  await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `chore: update agent ${memory.agentId} state`,
      content,
      branch: BRANCH,
      ...(sha && { sha }),
    }),
  });
}

// Local file fallback for development
async function readAgentLocal(agentId: string): Promise<AgentMemory | null> {
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

async function writeAgentLocal(memory: AgentMemory): Promise<void> {
  ensureDataDir();
  const filePath = getAgentFilePath(memory.agentId);
  fs.writeFileSync(filePath, JSON.stringify(memory, null, 2), "utf-8");
}

async function listAgentIds(): Promise<string[]> {
  // Try GitHub first
  if (GITHUB_TOKEN) {
    try {
      const contents = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/agents?ref=${BRANCH}`);
      return (contents as any[])
        .filter(f => f.name.endsWith(".json"))
        .map(f => f.name.replace(".json", ""));
    } catch {
      // Fall through to local
    }
  }
  // Local fallback
  ensureDataDir();
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(".json", ""));
}

// Determine if we're in a GitHub Action (has GITHUB_TOKEN and GITHUB_ACTIONS)
const isGitHubAction = !!process.env.GITHUB_ACTIONS && !!GITHUB_TOKEN;
const isVercel = process.env.VERCEL === "1";

async function getAgentMemory(agentId: string): Promise<AgentMemory | null> {
  // Priority: GitHub Action > Vercel (read from GitHub) > Local
  if (isGitHubAction || isVercel) {
    return readAgentFromGitHub(agentId);
  }
  return readAgentLocal(agentId);
}

async function setAgentMemory(memory: AgentMemory): Promise<void> {
  if (isGitHubAction || isVercel) {
    await writeAgentToGitHub(memory);
  } else {
    await writeAgentLocal(memory);
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
  console.log(`✅ Agent ${agentId} created (storage: ${isGitHubAction || isVercel ? "GitHub" : "local"})`);
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