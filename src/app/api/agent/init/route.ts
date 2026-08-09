import { NextRequest, NextResponse } from "next/server";
import { createAgentMemory } from "@/lib/agent/memory";
import { startAgentScheduler } from "@/lib/agent/scheduler";
import { InitRequest, InitResponse } from "@/types";
import { logApiCall } from "@/lib/utils/logger";

export async function POST(request: NextRequest): Promise<NextResponse<InitResponse | { error: string }>> {
  const startTime = Date.now();

  try {
    const body: InitRequest = await request.json();
    
    if (!body.persona?.name || !body.persona?.domain) {
      return NextResponse.json(
        { error: "Missing required fields: persona.name and persona.domain" },
        { status: 400 }
      );
    }

    const memory = createAgentMemory({
      name: body.persona.name,
      domain: body.persona.domain,
    });

    // Start the autonomous scheduler
    startAgentScheduler(memory.agentId);

    const response: InitResponse = { agentId: memory.agentId };

    logApiCall(memory.agentId, body, response, "Agent initialized and scheduler started", Date.now() - startTime);

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logApiCall("unknown", await request.json().catch(() => ({})), { error: (error as Error).message }, "Init failed", Date.now() - startTime);
    return NextResponse.json(
      { error: "Failed to initialize agent" },
      { status: 500 }
    );
  }
}