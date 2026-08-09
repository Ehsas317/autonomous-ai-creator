export interface PersonaConfig {
  name: string;
  domain: string;
  description: string;
  voice: VoiceConfig;
  interests: string[];
  expertise: string[];
  styleExemplars: string[];
}

export interface VoiceConfig {
  tone: string;
  formality: "casual" | "professional" | "academic";
  perspective: "first-person" | "third-person";
  verbosity: "concise" | "moderate" | "detailed";
  skepticism: number; // 0-10
  contrarian: number; // 0-10
}

export interface TopicCandidate {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  discoveredAt: string;
  relevanceScore?: number;
  noveltyScore?: number;
  technicalDepthScore?: number;
  timelinessScore?: number;
  voiceAlignmentScore?: number;
  compositeScore?: number;
  tags: string[];
}

export interface RejectedTopic {
  candidate: TopicCandidate;
  reason: string;
  rejectedAt: string;
  scores: {
    relevance: number;
    novelty: number;
    technicalDepth: number;
    timeliness: number;
    voiceAlignment: number;
  };
}

export interface PublishedPost {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: string[];
  topicId: string;
  candidate: TopicCandidate;
}

export interface AgentMemory {
  agentId: string;
  persona: PersonaConfig;
  config: AgentConfig;
  publishedPosts: PublishedPost[];
  rejectedTopics: RejectedTopic[];
  discoveredCandidates: TopicCandidate[];
  lastDiscoveryRun: string | null;
  lastJudgmentRun: string | null;
  lastPublishRun: string | null;
  preferences: AgentPreferences;
  stats: AgentStats;
}

export interface AgentConfig {
  discoveryIntervalHours: number;
  maxPostsPerCycle: number;
  minRelevanceThreshold: number;
  maxCandidateAgeHours: number;
  searchQueries: string[];
}

export interface AgentPreferences {
  coveredTopics: string[];
  writingStyleNotes: string[];
  audienceAssumptions: string[];
  preferredSources: string[];
  avoidedTopics: string[];
}

export interface AgentStats {
  totalDiscovered: number;
  totalPublished: number;
  totalRejected: number;
  avgRelevanceScore: number;
  lastActiveAt: string;
}

export interface InitRequest {
  persona: {
    name: string;
    domain: string;
  };
}

export interface InitResponse {
  agentId: string;
}

export interface FeedResponse {
  posts: FeedPost[];
}

export interface FeedPost {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: string[];
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: string;
}

export interface LogEntry {
  timestamp: string;
  agentId: string;
  action: "discovery" | "judgment" | "writing" | "publish" | "api_call" | "scheduler" | "error";
  input?: unknown;
  output?: unknown;
  reasoning?: string;
  durationMs?: number;
}