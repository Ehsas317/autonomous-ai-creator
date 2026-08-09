import { TopicCandidate, AgentMemory } from "@/types";
import { searchMultipleQueries, searchWeb } from "@/lib/search/web-search";
import { AGENT_CONFIG, SEARCH_SOURCES } from "./persona";
import { generateTopicId } from "@/lib/utils/id-generator";
import { logDiscovery } from "@/lib/utils/logger";

function calculateRecencyScore(publishedAt: string | undefined): number {
  if (!publishedAt) return 5;
  const hoursAgo = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 6) return 10;
  if (hoursAgo <= 24) return 8;
  if (hoursAgo <= 48) return 6;
  if (hoursAgo <= 72) return 4;
  return 2;
}

function calculateSourceCredibility(source: string): number {
  const credibilityMap: Record<string, number> = {
    "arxiv.org": 10,
    "openai.com": 9,
    "anthropic.com": 9,
    "deepmind.google": 9,
    "blog.security.google": 9,
    "security.googleblog.com": 9,
    "microsoft.com": 8,
    "meta.ai": 8,
    "huggingface.co": 7,
    "distill.pub": 8,
    "paperswithcode.com": 7,
    "jailbreakbench.org": 8,
  };

  for (const [domain, score] of Object.entries(credibilityMap)) {
    if (source.includes(domain)) return score;
  }
  return 5;
}

function extractTags(title: string, snippet: string): string[] {
  const text = `${title} ${snippet}`.toLowerCase();
  const tagPatterns: Record<string, string[]> = {
    "prompt-injection": ["prompt injection", "prompt hijack", "instruction injection"],
    "jailbreak": ["jailbreak", "jail break", "bypass safety", "safety bypass"],
    "adversarial": ["adversarial", "adversarial attack", "adversarial example"],
    "model-extraction": ["model extraction", "model stealing", "weight extraction"],
    "membership-inference": ["membership inference", "privacy attack", "data extraction"],
    "watermarking": ["watermark", "watermarking", "provenance", "detection"],
    "interpretability": ["interpretability", "mechanistic", "sparse autoencoder", "activation steering"],
    "red-teaming": ["red team", "red-teaming", "redteaming"],
    "governance": ["governance", "regulation", "liability", "policy", "ai act"],
    "supply-chain": ["supply chain", "dataset poisoning", "data poisoning", "backdoor"],
    "multimodal": ["multimodal", "cross-modal", "vision-language", "image attack"],
    "alignment": ["alignment", "deceptive alignment", "sycophancy", "reward hacking"],
    "differential-privacy": ["differential privacy", "dp-sgd", "privacy preserving"],
    "benchmark": ["benchmark", "evaluation", "eval", "leaderboard"],
  };

  const tags: string[] = [];
  for (const [tag, patterns] of Object.entries(tagPatterns)) {
    if (patterns.some((p) => text.includes(p))) {
      tags.push(tag);
    }
  }
  return tags;
}

export async function runDiscovery(agentId: string, memory: AgentMemory): Promise<TopicCandidate[]> {
  const startTime = Date.now();
  const config = memory.config;

  logDiscovery(agentId, { queries: config.searchQueries.length }, null, "Starting discovery cycle", 0);

  // Search using configured queries
  const searchResults = await searchMultipleQueries(config.searchQueries, 5);

  // Convert to candidates with scoring
  const candidates: TopicCandidate[] = searchResults.map((result) => {
    const recencyScore = calculateRecencyScore(result.publishedAt);
    const sourceCredibility = calculateSourceCredibility(result.source);
    const tags = extractTags(result.title, result.snippet);

    return {
      id: generateTopicId(),
      title: result.title,
      summary: result.snippet,
      url: result.url,
      source: result.source,
      publishedAt: result.publishedAt ?? new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      tags,
      // Initial scores - will be refined by judgment engine
      relevanceScore: 0,
      noveltyScore: 0,
      technicalDepthScore: 0,
      timelinessScore: recencyScore,
      voiceAlignmentScore: sourceCredibility,
    };
  });

  // Filter out already covered topics
  const coveredTopics = new Set(memory.preferences.coveredTopics.map((t) => t.toLowerCase()));
  const filtered = candidates.filter((c) => {
    const titleWords = c.title.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    return !titleWords.some((w) => coveredTopics.has(w));
  });

  // Filter out already discovered URLs
  const discoveredUrls = new Set(memory.discoveredCandidates.map((c) => c.url));
  const newCandidates = filtered.filter((c) => !discoveredUrls.has(c.url));

  logDiscovery(agentId, { totalFound: candidates.length, newCandidates: newCandidates.length }, newCandidates, `Discovered ${newCandidates.length} new candidates`, Date.now() - startTime);

  return newCandidates;
}

export function scoreCandidateRelevance(candidate: TopicCandidate, personaInterests: string[]): number {
  const text = `${candidate.title} ${candidate.summary}`.toLowerCase();
  let score = 5; // Base score

  // Check alignment with persona interests
  for (const interest of personaInterests) {
    const keywords = interest.toLowerCase().split(/\s+/);
    const matches = keywords.filter((k) => text.includes(k)).length;
    if (matches > 0) {
      score += matches * 1.5;
    }
  }

  // Bonus for technical depth indicators
  const technicalTerms = [
    "attack", "vulnerability", "exploit", "defense", "mitigation",
    "benchmark", "evaluation", "metric", "accuracy", "robustness",
    "theorem", "proof", "bound", "guarantee", "formal",
    "empirical", "experiment", "ablation", "baseline", "sota",
  ];
  const technicalMatches = technicalTerms.filter((t) => text.includes(t)).length;
  score += Math.min(technicalMatches * 0.5, 3);

  return Math.min(score, 10);
}

export function scoreCandidateNovelty(candidate: TopicCandidate, memory: AgentMemory): number {
  // Check against published posts
  const publishedTitles = memory.publishedPosts.map((p) => p.candidate.title.toLowerCase());
  const publishedSummaries = memory.publishedPosts.map((p) => p.candidate.summary.toLowerCase());
  
  // Check against rejected topics
  const rejectedTitles = memory.rejectedTopics.map((r) => r.candidate.title.toLowerCase());

  const candidateTitle = candidate.title.toLowerCase();
  const candidateSummary = candidate.summary.toLowerCase();

  // Simple similarity check - in production would use embeddings
  let maxSimilarity = 0;
  
  for (const pubTitle of publishedTitles) {
    const similarity = calculateTextSimilarity(candidateTitle, pubTitle);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }
  
  for (const rejTitle of rejectedTitles) {
    const similarity = calculateTextSimilarity(candidateTitle, rejTitle);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  // Novelty is inverse of similarity
  return Math.max(10 - maxSimilarity * 10, 1);
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/).filter((w) => w.length > 3));
  const words2 = new Set(text2.split(/\s+/).filter((w) => w.length > 3));
  
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export function scoreTechnicalDepth(candidate: TopicCandidate): number {
  const text = `${candidate.title} ${candidate.summary}`.toLowerCase();
  let score = 4; // Base

  // Strong indicators of technical depth
  const strongIndicators = [
    "theorem", "proof", "bound", "guarantee", "convergence",
    "ablation", "controlled experiment", "statistical significance",
    "p-value", "confidence interval", "effect size",
    "architecture", "gradient", "backpropagation", "fine-tuning",
    "embedding", "attention", "transformer", "layer", "head",
  ];
  
  const moderateIndicators = [
    "benchmark", "evaluation", "metric", "accuracy", "f1",
    "precision", "recall", "auc", "roc", "baseline",
    "comparison", "outperform", "sota", "state-of-the-art",
    "methodology", "framework", "pipeline", "algorithm",
  ];

  for (const indicator of strongIndicators) {
    if (text.includes(indicator)) score += 1;
  }
  for (const indicator of moderateIndicators) {
    if (text.includes(indicator)) score += 0.5;
  }

  return Math.min(score, 10);
}

export function scoreVoiceAlignment(candidate: TopicCandidate, memory: AgentMemory): number {
  // Check if candidate matches the skeptical, contrarian voice
  const text = `${candidate.title} ${candidate.summary}`.toLowerCase();
  let score = 5;

  // Positive signals for Aria's voice
  const positiveSignals = [
    "however", "but", "despite", "although", "nevertheless",
    "claim", "claims", "argue", "argues", "suggest",
    "we show", "we demonstrate", "we prove", "we find",
    "fails", "failure", "limitation", "weakness", "gap",
    "tradeoff", "trade-off", "fundamental", "paradox",
  ];

  // Negative signals (hype, marketing)
  const negativeSignals = [
    "revolutionary", "breakthrough", "game-changing", "unprecedented",
    "amazing", "incredible", "stunning", "mind-blowing",
    "will change everything", "solves", "eliminates", "perfect",
    "announcing", "launch", "release", "introducing",
  ];

  for (const signal of positiveSignals) {
    if (text.includes(signal)) score += 0.3;
  }
  for (const signal of negativeSignals) {
    if (text.includes(signal)) score -= 0.5;
  }

  // Check source credibility
  const sourceCred = SEARCH_SOURCES.find((s) => candidate.source.includes(s.replace("www.", ""))) ? 2 : 0;
  score += sourceCred;

  return Math.max(Math.min(score, 10), 1);
}