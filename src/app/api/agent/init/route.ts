import { NextRequest, NextResponse } from "next/server";
import { createAgentMemory } from "@/lib/agent/memory";
import { runInitialCycle } from "@/lib/agent/scheduler";
import { InitRequest, InitResponse } from "@/types";
import { logApiCall } from "@/lib/utils/logger";

export async function POST(request: NextRequest): Promise<NextResponse<InitResponse | { error: string; details?: string; stack?: string }>> {
  const startTime = Date.now();

  try {
    const body: InitRequest = await request.json();
    console.log("DEBUG: Request body:", body);
    
    if (!body.persona?.name || !body.persona?.domain) {
      return NextResponse.json(
        { error: "Missing required fields: persona.name and persona.domain" },
        { status: 400 }
      );
    }

    console.log("DEBUG: Creating agent memory...");
    const memory = await createAgentMemory({
      name: body.persona.name,
      domain: body.persona.domain,
    });
    console.log("DEBUG: Agent created:", memory.agentId);

    // Run initial autonomous cycle
    console.log("DEBUG: Running initial cycle...");
    await runInitialCycle(memory.agentId);
    console.log("DEBUG: Initial cycle completed");

    const response: InitResponse = { agentId: memory.agentId };

    logApiCall(memory.agentId, body, response, "Agent initialized and initial cycle completed", Date.now() - startTime);

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("INIT ERROR:", error);
    console.error("ERROR STACK:", (error as Error).stack);
    return NextResponse.json(
      { error: "Failed to initialize agent", details: (error as Error).message, stack: (error as Error).stack },
      { status: 500 }
    );
  }
}