import { TopicCandidate, RejectedTopic, AgentMemory } from "@/types";
import {
  scoreCandidateRelevance,
  scoreCandidateNovelty,
  scoreTechnicalDepth,
  scoreVoiceAlignment,
} from "./discovery";
import { logJudgment } from "@/lib/utils/logger";

export interface JudgmentResult {
  selected: TopicCandidate[];
  rejected: RejectedTopic[];
}

const JUDGMENT_THRESHOLDS = {
  relevance: 6.5,
  novelty: 6,
  technicalDepth: 6,
  timeliness: 5,
  voiceAlignment: 6.5,
  composite: 7, // Minimum composite score
};

function calculateCompositeScore(candidate: TopicCandidate): number {
  const weights = {
    relevance: 0.25,
    novelty: 0.2,
    technicalDepth: 0.2,
    timeliness: 0.15,
    voiceAlignment: 0.2,
  };

  return (
    (candidate.relevanceScore ?? 0) * weights.relevance +
    (candidate.noveltyScore ?? 0) * weights.novelty +
    (candidate.technicalDepthScore ?? 0) * weights.technicalDepth +
    (candidate.timelinessScore ?? 0) * weights.timeliness +
    (candidate.voiceAlignmentScore ?? 0) * weights.voiceAlignment
  );
}

function getRejectionReason(candidate: TopicCandidate): string {
  const reasons: string[] = [];

  if ((candidate.relevanceScore ?? 0) < JUDGMENT_THRESHOLDS.relevance) {
    reasons.push(`Low relevance to persona interests (${candidate.relevanceScore?.toFixed(1)}/${JUDGMENT_THRESHOLDS.relevance})`);
  }
  if ((candidate.noveltyScore ?? 0) < JUDGMENT_THRESHOLDS.novelty) {
    reasons.push(`Insufficient novelty - similar to previously covered content (${candidate.noveltyScore?.toFixed(1)}/${JUDGMENT_THRESHOLDS.novelty})`);
  }
  if ((candidate.technicalDepthScore ?? 0) < JUDGMENT_THRESHOLDS.technicalDepth) {
    reasons.push(`Insufficient technical depth (${candidate.technicalDepthScore?.toFixed(1)}/${JUDGMENT_THRESHOLDS.technicalDepth})`);
  }
  if ((candidate.timelinessScore ?? 0) < JUDGMENT_THRESHOLDS.timeliness) {
    reasons.push(`Content too old or not timely (${candidate.timelinessScore?.toFixed(1)}/${JUDGMENT_THRESHOLDS.timeliness})`);
  }
  if ((candidate.voiceAlignmentScore ?? 0) < JUDGMENT_THRESHOLDS.voiceAlignment) {
    reasons.push(`Poor alignment with editorial voice (${candidate.voiceAlignmentScore?.toFixed(1)}/${JUDGMENT_THRESHOLDS.voiceAlignment})`);
  }

  if (reasons.length === 0) {
    const composite = calculateCompositeScore(candidate);
    if (composite < JUDGMENT_THRESHOLDS.composite) {
      reasons.push(`Composite score below threshold (${composite.toFixed(1)}/${JUDGMENT_THRESHOLDS.composite})`);
    }
  }

  return reasons.join("; ") || "Did not meet editorial standards";
}

export function runJudgment(agentId: string, memory: AgentMemory, candidates: TopicCandidate[]): JudgmentResult {
  const startTime = Date.now();

  logJudgment(agentId, { candidateCount: candidates.length }, null, "Starting judgment cycle", 0);

  // Score all candidates
  const scoredCandidates = candidates.map((candidate) => ({
    ...candidate,
    relevanceScore: scoreCandidateRelevance(candidate, memory.persona.interests),
    noveltyScore: scoreCandidateNovelty(candidate, memory),
    technicalDepthScore: scoreTechnicalDepth(candidate),
    timelinessScore: candidate.timelinessScore ?? 5,
    voiceAlignmentScore: scoreVoiceAlignment(candidate, memory),
  }));

  // Calculate composite scores
  const withComposite = scoredCandidates.map((c) => ({
    ...c,
    compositeScore: calculateCompositeScore(c),
  }));

  // Sort by composite score descending
  withComposite.sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));

  // Select top candidates that meet thresholds
  const maxPosts = memory.config.maxPostsPerCycle;
  const selected: TopicCandidate[] = [];
  const rejected: RejectedTopic[] = [];

  for (const candidate of withComposite) {
    const composite = candidate.compositeScore ?? 0;
    const meetsThresholds =
      (candidate.relevanceScore ?? 0) >= JUDGMENT_THRESHOLDS.relevance &&
      (candidate.noveltyScore ?? 0) >= JUDGMENT_THRESHOLDS.novelty &&
      (candidate.technicalDepthScore ?? 0) >= JUDGMENT_THRESHOLDS.technicalDepth &&
      (candidate.timelinessScore ?? 0) >= JUDGMENT_THRESHOLDS.timeliness &&
      (candidate.voiceAlignmentScore ?? 0) >= JUDGMENT_THRESHOLDS.voiceAlignment &&
      composite >= JUDGMENT_THRESHOLDS.composite;

    if (meetsThresholds && selected.length < maxPosts) {
      selected.push(candidate);
    } else {
      rejected.push({
        candidate,
        reason: getRejectionReason(candidate),
        rejectedAt: new Date().toISOString(),
        scores: {
          relevance: candidate.relevanceScore ?? 0,
          novelty: candidate.noveltyScore ?? 0,
          technicalDepth: candidate.technicalDepthScore ?? 0,
          timeliness: candidate.timelinessScore ?? 0,
          voiceAlignment: candidate.voiceAlignmentScore ?? 0,
        },
      });
    }
  }

  logJudgment(
    agentId,
    { evaluated: withComposite.length, selected: selected.length, rejected: rejected.length },
    { selected, rejected },
    `Selected ${selected.length} topics, rejected ${rejected.length}`,
    Date.now() - startTime
  );

  return { selected, rejected };
}

export function formatJudgmentSummary(result: JudgmentResult): string {
  const lines = [
    `**Judgment Summary**`,
    `Selected: ${result.selected.length}`,
    `Rejected: ${result.rejected.length}`,
    ``,
  ];

  if (result.selected.length > 0) {
    lines.push(`**Selected Topics:**`);
    for (const c of result.selected) {
      lines.push(`- "${c.title}" (composite: ${c.compositeScore?.toFixed(1)})`);
    }
    lines.push(``);
  }

  if (result.rejected.length > 0) {
    lines.push(`**Rejected Topics:**`);
    for (const r of result.rejected.slice(0, 5)) {
      lines.push(`- "${r.candidate.title}" — ${r.reason}`);
    }
    if (result.rejected.length > 5) {
      lines.push(`- ... and ${result.rejected.length - 5} more`);
    }
  }

  return lines.join("\n");
}