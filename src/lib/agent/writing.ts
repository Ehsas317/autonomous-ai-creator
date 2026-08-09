import { TopicCandidate, PublishedPost, AgentMemory, PersonaConfig } from "@/types";
import { generatePostId } from "@/lib/utils/id-generator";
import { logWriting } from "@/lib/utils/logger";

const WRITING_TEMPLATES = {
  opening: [
    "I've been tracking this for a while.",
    "This showed up in my feed and it's worth your attention.",
    "Saw this paper drop and had thoughts.",
    "The community is buzzing about this, and for once, the buzz is warranted.",
    "Another week, another attack vector. This one's different.",
  ],
  technicalSummary: [
    "The core finding: {finding}",
    "What they did: {method}",
    "The numbers: {metrics}",
    "The attack works by: {mechanism}",
    "Key insight: {insight}",
  ],
  critique: [
    "What the paper gets right: {strength}",
    "Where I'm skeptical: {weakness}",
    "The threat model assumes {assumption}, which {assessment}.",
    "This doesn't account for {missing}.",
    "The evaluation uses {benchmark}, but {critique}.",
  ],
  implication: [
    "For defenders, this means {defenseImplication}.",
    "For the field, this suggests {fieldImplication}.",
    "The practical takeaway: {practicalTakeaway}.",
    "This shifts the baseline for {domain}.",
    "We need to {actionItem}.",
  ],
  closing: [
    "Worth reading the full paper if you work in this space.",
    "I'll be testing this against our internal eval suite.",
    "More on this when I have replication results.",
    "The arms race continues.",
    "Stay paranoid.",
  ],
};

function extractKeyInfo(candidate: TopicCandidate): {
  finding: string;
  method: string;
  metrics: string;
  mechanism: string;
  insight: string;
  strength: string;
  weakness: string;
  assumption: string;
  assessment: string;
  missing: string;
  benchmark: string;
  critique: string;
  defenseImplication: string;
  fieldImplication: string;
  practicalTakeaway: string;
  domain: string;
  actionItem: string;
} {
  const title = candidate.title;
  const summary = candidate.summary;
  const tags = candidate.tags;

  // Extract from title/summary/tags
  const isAttack = tags.includes("adversarial") || tags.includes("jailbreak") || tags.includes("prompt-injection");
  const isDefense = tags.includes("watermarking") || tags.includes("interpretability") || summary.toLowerCase().includes("defense");
  const isGovernance = tags.includes("governance");
  const isBenchmark = tags.includes("benchmark");

  return {
    finding: isAttack
      ? `A new attack achieves ${extractMetric(summary) || "high"} success rate against ${extractTarget(summary) || "major models"}`
      : isDefense
      ? `A proposed defense shows ${extractMetric(summary) || "promising"} results against ${extractThreat(summary) || "known attacks"}`
      : isBenchmark
      ? `A new benchmark reveals ${extractMetric(summary) || "significant"} gaps in current defenses`
      : `The research demonstrates ${extractMetric(summary) || "notable"} findings in ${candidate.tags[0] || "AI security"}`,
    method: extractMethod(summary) || "Systematic evaluation across multiple model families",
    metrics: extractMetrics(summary) || "See paper for detailed results",
    mechanism: extractMechanism(summary) || "Exploiting prompt template vulnerabilities",
    insight: extractInsight(summary) || "The attack surface is larger than previously modeled",
    strength: "Rigorous experimental design with multiple baselines",
    weakness: "Limited to white-box or gray-box threat models",
    assumption: "adversary has API access",
    assessment: "holds for current deployment patterns",
    missing: "adaptive adversaries who iterate on failed attempts",
    benchmark: "static test sets",
    critique: "real adversaries adapt dynamically",
    defenseImplication: "current input sanitization is insufficient; need instruction hierarchy",
    fieldImplication: "we're still treating symptoms, not root causes in prompt architecture",
    practicalTakeaway: "audit your prompt templates today",
    domain: "LLM security",
    actionItem: "implement retrieval sanitization and instruction hierarchy",
  };
}

function extractMetric(text: string): string | null {
  const patterns = [
    /(\d+%?\s*(?:success rate|accuracy|AUC|F1|precision|recall))/i,
    /(\d+\.?\d*\s*(?:percent|%))/i,
    /(?:achieves?|reaches?|shows?)\s+(\d+\.?\d*%?)/i,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[1];
  }
  return null;
}

function extractTarget(text: string): string | null {
  const models = ["GPT-4", "Claude", "Llama", "Gemini", "Mistral", "PaLM"];
  for (const m of models) {
    if (text.includes(m)) return m;
  }
  return null;
}

function extractThreat(text: string): string | null {
  if (text.includes("prompt injection")) return "prompt injection";
  if (text.includes("jailbreak")) return "jailbreak";
  if (text.includes("adversarial")) return "adversarial examples";
  return null;
}

function extractMethod(text: string): string | null {
  if (text.includes("red team")) return "Large-scale red teaming across model families";
  if (text.includes("benchmark")) return "Comprehensive benchmark evaluation";
  if (text.includes("theorem") || text.includes("proof")) return "Formal analysis with theoretical guarantees";
  if (text.includes("experiment")) return "Controlled experiments with ablations";
  return null;
}

function extractMetrics(text: string): string | null {
  const metrics: string[] = [];
  const patterns = [
    /(\d+%?\s*(?:success rate|accuracy|AUC|F1|precision|recall))/gi,
    /(\d+\.?\d*\s*%)/g,
  ];
  for (const p of patterns) {
    const matches = text.matchAll(p);
    for (const m of matches) metrics.push(m[1]);
  }
  return metrics.length > 0 ? metrics.join(", ") : null;
}

function extractMechanism(text: string): string | null {
  if (text.includes("prompt template")) return "Prompt template concatenation without sanitization";
  if (text.includes("retrieval")) return "Poisoned retrieved documents hijacking generation";
  if (text.includes("cross-modal")) return "Images encoding malicious instructions";
  if (text.includes("paraphras")) return "Paraphrasing attacks removing watermarks";
  return null;
}

function extractInsight(text: string): string | null {
  if (text.includes("transfer")) return "Attacks transfer across architectures more easily than defenses";
  if (text.includes("tradeoff") || text.includes("trade-off")) return "Fundamental tradeoffs limit what any single defense can achieve";
  if (text.includes("adaptive")) return "Static defenses fail against adaptive adversaries";
  return null;
}

function selectRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRationale(candidate: TopicCandidate, memory: AgentMemory): string {
  const info = extractKeyInfo(candidate);
  const scores = {
    relevance: candidate.relevanceScore?.toFixed(1),
    novelty: candidate.noveltyScore?.toFixed(1),
    technicalDepth: candidate.technicalDepthScore?.toFixed(1),
    timeliness: candidate.timelinessScore?.toFixed(1),
    voiceAlignment: candidate.voiceAlignmentScore?.toFixed(1),
  };

  const lines = [
    `**Why this topic:**`,
    `- Directly aligns with my focus on ${candidate.tags.slice(0, 3).join(", ")} (relevance: ${scores.relevance}/10)`,
    `- Novel contribution not covered in my previous ${memory.publishedPosts.length} posts (novelty: ${scores.novelty}/10)`,
    `- Substantial technical depth with ${candidate.technicalDepthScore?.toFixed(1)}/10 score`,
    `- Published ${formatRelativeTime(candidate.publishedAt)} — highly timely (timeliness: ${scores.timeliness}/10)`,
    `- Source (${candidate.source}) and framing match my skeptical, evidence-driven voice (voice alignment: ${scores.voiceAlignment}/10)`,
    ``,
    `**Why now:**`,
    `- This work was published ${formatRelativeTime(candidate.publishedAt)} and is actively being discussed`,
    `- The findings have immediate implications for production LLM deployments`,
    `- Related to recent conversations about ${candidate.tags[0] || "AI security"} in the community`,
    ``,
    `**Why not other candidates:**`,
    `- Rejected ${memory.rejectedTopics.filter(r => r.rejectedAt > new Date(Date.now() - 24*60*60*1000).toISOString()).length} other topics in this cycle for lower relevance, insufficient novelty, or hype-driven framing`,
    `- This candidate had the highest composite score across all evaluation dimensions`,
  ];

  return lines.join("\n");
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function generatePost(candidate: TopicCandidate, memory: AgentMemory): PublishedPost {
  const startTime = Date.now();
  const info = extractKeyInfo(candidate);
  const persona = memory.persona;

  // Build post in Aria's voice
  const sections: string[] = [];

  // Opening
  sections.push(selectRandom(WRITING_TEMPLATES.opening));

  // Technical summary
  const techTemplate = selectRandom(WRITING_TEMPLATES.technicalSummary);
  sections.push(techTemplate
    .replace("{finding}", info.finding)
    .replace("{method}", info.method)
    .replace("{metrics}", info.metrics)
    .replace("{mechanism}", info.mechanism)
    .replace("{insight}", info.insight)
  );

  // Critique
  const critiqueTemplate = selectRandom(WRITING_TEMPLATES.critique);
  sections.push(critiqueTemplate
    .replace("{strength}", info.strength)
    .replace("{weakness}", info.weakness)
    .replace("{assumption}", info.assumption)
    .replace("{assessment}", info.assessment)
    .replace("{missing}", info.missing)
    .replace("{benchmark}", info.benchmark)
    .replace("{critique}", info.critique)
  );

  // Implication
  const implTemplate = selectRandom(WRITING_TEMPLATES.implication);
  sections.push(implTemplate
    .replace("{defenseImplication}", info.defenseImplication)
    .replace("{fieldImplication}", info.fieldImplication)
    .replace("{practicalTakeaway}", info.practicalTakeaway)
    .replace("{domain}", info.domain)
    .replace("{actionItem}", info.actionItem)
  );

  // Closing
  sections.push(selectRandom(WRITING_TEMPLATES.closing));

  // Source link
  sections.push(`\nSource: ${candidate.url}`);

  const text = sections.join("\n\n");
  const rationale = generateRationale(candidate, memory);

  const post: PublishedPost = {
    id: generatePostId(),
    createdAt: new Date().toISOString(),
    text,
    rationale,
    sources: [candidate.url],
    topicId: candidate.id,
    candidate,
  };

  logWriting(memory.agentId, { candidateId: candidate.id }, post, `Generated post in ${persona.name}'s voice`, Date.now() - startTime);

  return post;
}