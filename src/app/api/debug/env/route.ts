import { NextRequest, NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? "SET" : "MISSING",
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? "SET" : "MISSING",
    CRON_SECRET: process.env.CRON_SECRET ? "SET" : "MISSING",
    VERCEL: process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV,
  });
}