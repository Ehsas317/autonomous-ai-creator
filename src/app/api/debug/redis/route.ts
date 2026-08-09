import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function GET(): Promise<NextResponse> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!redisUrl || !redisToken) {
    return NextResponse.json({ error: "Env vars missing" }, { status: 500 });
  }

  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    
    // Test connection
    const start = Date.now();
    await redis.ping();
    const pingMs = Date.now() - start;
    
    // Test set/get
    await redis.set("test:key", "test-value");
    const value = await redis.get("test:key");
    await redis.del("test:key");
    
    return NextResponse.json({
      status: "ok",
      pingMs,
      value,
      url: process.env.UPSTASH_REDIS_REST_URL,
    });
  } catch (error) {
    return NextResponse.json({
      error: "Redis connection failed",
      message: (error as Error).message,
      stack: (error as Error).stack,
    }, { status: 500 });
  }
}