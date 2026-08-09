import { NextRequest, NextResponse } from "next/server";
import { loadAgentMemory } from "@/lib/agent/memory";
import { FeedResponse } from "@/types";
import { logApiCall } from "@/lib/utils/logger";

export async function GET(request: NextRequest): Promise<NextResponse<FeedResponse | { error: string }>> {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json(
        { error: "Missing required parameter: agentId" },
        { status: 400 }
      );
    }

    const memory = loadAgentMemory(agentId);

    if (!memory) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Posts are already stored newest-first
    const posts = memory.publishedPosts.map((post) => ({
      id: post.id,
      createdAt: post.createdAt,
      text: post.text,
      rationale: post.rationale,
      sources: post.sources,
    }));

    const response: FeedResponse = { posts };

    logApiCall(agentId, { agentId }, { postCount: posts.length }, "Feed retrieved", Date.now() - startTime);

    return NextResponse.json(response);
  } catch (error) {
    logApiCall("unknown", { agentId: request.nextUrl.searchParams.get("agentId") }, { error: (error as Error).message }, "Feed retrieval failed", Date.now() - startTime);
    return NextResponse.json(
      { error: "Failed to retrieve feed" },
      { status: 500 }
    );
  }
}