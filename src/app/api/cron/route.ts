import { NextRequest, NextResponse } from "next/server";
import { runAllAgentsCycle } from "@/lib/agent/scheduler";
import { logApiCall } from "@/lib/utils/logger";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Verify cron secret for security
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runAllAgentsCycle();
    
    logApiCall("system", { cron: true }, { success: true }, "Cron job executed", Date.now() - startTime);
    
    return NextResponse.json({ success: true, message: "Autonomous cycle completed for all agents" });
  } catch (error) {
    logApiCall("system", { cron: true }, { error: (error as Error).message }, "Cron job failed", Date.now() - startTime);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}