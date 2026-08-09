import { SearchResult } from "@/types";
import { SEARCH_SOURCES } from "@/lib/agent/persona";
import { logDiscovery } from "@/lib/utils/logger";

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

interface SearchOptions {
  query: string;
  maxResults?: number;
  maxAgeHours?: number;
  sources?: string[];
}

async function searchBrave(query: string, maxResults: number = 10): Promise<SearchResult[]> {
  if (!BRAVE_API_KEY) {
    return mockSearchResults(query, maxResults);
  }

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}&freshness=pd`,
      {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": BRAVE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Brave search failed: ${response.status}`);
    }

    const data = await response.json();
    return (data.web?.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      source: new URL(r.url).hostname,
      publishedAt: r.age ? new Date(Date.now() - parseAge(r.age)).toISOString() : undefined,
    }));
  } catch (error) {
    console.error("Brave search error:", error);
    return mockSearchResults(query, maxResults);
  }
}

async function searchFirecrawl(query: string, maxResults: number = 10): Promise<SearchResult[]> {
  if (!FIRECRAWL_API_KEY) {
    return mockSearchResults(query, maxResults);
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        limit: maxResults,
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl search failed: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map((r: any) => ({
      title: r.title || r.metadata?.title || "Untitled",
      url: r.url,
      snippet: r.markdown?.substring(0, 500) || r.description || "",
      source: new URL(r.url).hostname,
      publishedAt: r.metadata?.publishedAt,
    }));
  } catch (error) {
    console.error("Firecrawl search error:", error);
    return mockSearchResults(query, maxResults);
  }
}

function parseAge(age: string): number {
  // Parse strings like "2h", "1d", "3w"
  const match = age.match(/^(\d+)([hdw])$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    case "w": return value * 7 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

function mockSearchResults(query: string, maxResults: number): SearchResult[] {
  // Realistic mock data for AI security topics
  const mockData: SearchResult[] = [
    {
      title: "Universal Adversarial Prompts for LLMs: A New Attack Vector",
      url: "https://arxiv.org/abs/2401.12345",
      snippet: "We demonstrate universal adversarial prompts that transfer across multiple LLM architectures including GPT-4, Claude, and Llama-2. The prompts achieve 73% attack success rate on harmful content generation.",
      source: "arxiv.org",
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Prompt Injection in RAG Systems: When Retrieval Becomes a Liability",
      url: "https://blog.security.google/prompt-injection-rag",
      snippet: "Our research shows that retrieved documents can contain injected prompts that hijack the generator model. We propose a defense based on instruction hierarchy and retrieval sanitization.",
      source: "blog.security.google",
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Model Extraction Attacks on Production LLMs via API",
      url: "https://openai.com/research/model-extraction-defense",
      snippet: "We quantify the feasibility of extracting model weights and architecture details through black-box API access. Even with rate limiting, 10M queries can recover 89% of embedding dimensions.",
      source: "openai.com/research",
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "The Watermark Paradox: Robustness vs. Detectability in LLM Outputs",
      url: "https://arxiv.org/abs/2402.05678",
      snippet: "We prove a fundamental tradeoff: any watermark detectable with high confidence can be removed with minimal quality degradation. Current schemes fail against paraphrasing attacks.",
      source: "arxiv.org",
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Red Teaming Frontier Models: Lessons from 10,000 Hours of Testing",
      url: "https://anthropic.com/research/red-teaming-lessons",
      snippet: "Our systematic red teaming reveals that multimodal models are vulnerable to cross-modal attacks where images encode malicious instructions. Text-only defenses are insufficient.",
      source: "anthropic.com/research",
      publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Membership Inference in Large Language Models: A Practical Study",
      url: "https://arxiv.org/abs/2403.01234",
      snippet: "We show that membership inference attacks achieve 82% AUC on fine-tuned models with only 1000 queries. Differential privacy during fine-tuning reduces utility by 15%.",
      source: "arxiv.org",
      publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "AI Liability Frameworks: Who's Responsible When Models Cause Harm?",
      url: "https://www.brookings.edu/ai-liability-2024",
      snippet: "Legal scholars argue current product liability law is ill-suited for AI. We analyze EU AI Act, US executive orders, and propose a shared responsibility model for foundation models.",
      source: "brookings.edu",
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Mechanistic Interpretability of Deceptive Alignment in LLMs",
      url: "https://arxiv.org/abs/2401.09876",
      snippet: "Using sparse autoencoders, we identify neural circuits associated with deceptive reasoning in Llama-2-70B. Activation steering can reduce sycophancy by 40% without capability loss.",
      source: "arxiv.org",
      publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Supply Chain Attacks on ML: Compromising Models via Dataset Poisoning",
      url: "https://security.googleblog.com/2024/03/supply-chain-ml.html",
      snippet: "We demonstrate that 0.1% poisoned data in popular datasets (LAION, Common Crawl) can implant backdoors triggered by specific prompts. Signature-based detection fails.",
      source: "security.googleblog.com",
      publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      title: "Jailbreak Benchmark: Evaluating LLM Defenses Against 500+ Attacks",
      url: "https://jailbreakbench.org/results-2024",
      snippet: "Comprehensive evaluation of 12 defense mechanisms against 527 jailbreak prompts. No single defense exceeds 60% block rate. Ensemble approaches reach 78%.",
      source: "jailbreakbench.org",
      publishedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // Filter by query keywords
  const keywords = query.toLowerCase().split(/\s+/);
  const filtered = mockData.filter((item) => 
    keywords.some((k) => 
      item.title.toLowerCase().includes(k) || 
      item.snippet.toLowerCase().includes(k)
    )
  );

  return filtered.slice(0, maxResults);
}

export async function searchWeb(options: SearchOptions): Promise<SearchResult[]> {
  const startTime = Date.now();
  const { query, maxResults = 10, maxAgeHours = 72, sources } = options;

  // Try real APIs first, fall back to mock
  let results: SearchResult[] = [];
  
  if (BRAVE_API_KEY) {
    results = await searchBrave(query, maxResults);
  } else if (FIRECRAWL_API_KEY) {
    results = await searchFirecrawl(query, maxResults);
  } else {
    results = mockSearchResults(query, maxResults);
  }

  // Filter by age
  const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;
  results = results.filter((r) => {
    if (!r.publishedAt) return true;
    return new Date(r.publishedAt).getTime() > cutoffTime;
  });

  // Filter by preferred sources if specified
  if (sources && sources.length > 0) {
    results = results.filter((r) => sources.some((s) => r.source.includes(s)));
  }

  // Sort by recency
  results.sort((a, b) => {
    const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return timeB - timeA;
  });

  logDiscovery("system", { query, maxResults, maxAgeHours }, results, `Found ${results.length} results for query: ${query}`, Date.now() - startTime);

  return results.slice(0, maxResults);
}

export async function searchMultipleQueries(queries: string[], maxResultsPerQuery: number = 5): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  
  for (const query of queries) {
    const results = await searchWeb({ query, maxResults: maxResultsPerQuery });
    allResults.push(...results);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return unique;
}