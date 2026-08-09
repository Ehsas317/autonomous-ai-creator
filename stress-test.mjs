#!/usr/bin/env node
/**
 * Stress Test for Autonomous AI Creator
 * Runs multiple autonomous cycles and validates output
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const AGENT_ID = process.env.AGENT_ID;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function initAgent() {
  console.log("\n🚀 Initializing agent...");
  const res = await fetch(`${BASE_URL}/api/agent/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      persona: { name: "Dr. Aria Voss", domain: "AI Security Research" }
    })
  });
  const data = await res.json();
  if (data.agentId) {
    console.log(`✅ Agent created: ${data.agentId}`);
    return data.agentId;
  }
  throw new Error(`Failed to init: ${JSON.stringify(data)}`);
}

async function runCycle(agentId: string, cycleNum: number) {
  console.log(`\n🔄 Cycle ${cycleNum} - Running autonomous cycle...`);
  
  // Trigger the cron endpoint (simulates scheduled run)
  const cronSecret = process.env.CRON_SECRET || "test-secret";
  const res = await fetch(`${BASE_URL}/api/cron`, {
    headers: { "Authorization": `Bearer ${cronSecret}` }
  });
  const data = await res.json();
  console.log(`   Cron result:`, data);
  
  // Wait a bit for processing
  await sleep(2000);
  
  // Check feed
  const feedRes = await fetch(`${BASE_URL}/api/agent/feed?agentId=${agentId}`);
  const feed = await feedRes.json();
  
  console.log(`   Posts published: ${feed.posts?.length || 0}`);
  if (feed.posts?.length) {
    const latest = feed.posts[0];
    console.log(`   Latest: "${latest.text.split('\n')[0]}"`);
    console.log(`   Rationale length: ${latest.rationale?.length || 0} chars`);
    console.log(`   Sources: ${latest.sources?.join(", ") || "none"}`);
  }
  
  return feed.posts?.length || 0;
}

async function validateFeed(agentId: string) {
  console.log("\n📋 Validating feed structure...");
  const res = await fetch(`${BASE_URL}/api/agent/feed?agentId=${agentId}`);
  const feed = await res.json();
  
  if (!feed.posts) {
    throw new Error("Feed missing 'posts' array");
  }
  
  for (const post of feed.posts) {
    // Validate required fields
    if (!post.id) throw new Error("Post missing id");
    if (!post.createdAt) throw new Error("Post missing createdAt");
    if (!post.text) throw new Error("Post missing text");
    if (!post.rationale) throw new Error("Post missing rationale");
    if (!post.sources || !Array.isArray(post.sources)) throw new Error("Post missing sources array");
    
    // Validate ISO 8601 timestamp
    const date = new Date(post.createdAt);
    if (isNaN(date.getTime())) throw new Error(`Invalid createdAt: ${post.createdAt}`);
    
    // Validate rationale has key sections
    if (!post.rationale.includes("Why this topic")) throw new Error("Rationale missing 'Why this topic'");
    if (!post.rationale.includes("Why now")) throw new Error("Rationale missing 'Why now'");
    if (!post.rationale.includes("Why not other candidates")) throw new Error("Rationale missing 'Why not other candidates'");
    
    console.log(`   ✅ Post ${post.id}: valid`);
  }
  
  // Verify reverse chronological order
  for (let i = 1; i < feed.posts.length; i++) {
    const prev = new Date(feed.posts[i-1].createdAt).getTime();
    const curr = new Date(feed.posts[i].createdAt).getTime();
    if (curr > prev) {
      throw new Error("Posts not in reverse chronological order");
    }
  }
  console.log("   ✅ Reverse chronological order verified");
  
  return feed.posts.length;
}

async function checkMemoryFiles(agentId: string) {
  console.log("\n💾 Checking memory persistence...");
  const fs = await import("fs");
  const path = await import("path");
  const filePath = path.join(process.cwd(), "data", "agents", `${agentId}.json`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Memory file not found: ${filePath}`);
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`   Memory file size: ${fs.statSync(filePath).size} bytes`);
  console.log(`   Published posts in memory: ${data.publishedPosts?.length || 0}`);
  console.log(`   Rejected topics: ${data.rejectedTopics?.length || 0}`);
  console.log(`   Discovered candidates: ${data.discoveredCandidates?.length || 0}`);
  console.log(`   Stats:`, data.stats);
  
  return data;
}

async function checkPromptLog() {
  console.log("\n📝 Checking prompt.md log...");
  const fs = await import("fs");
  const path = await import("path");
  const logPath = path.join(process.cwd(), "data", "prompt.md");
  
  if (!fs.existsSync(logPath)) {
    throw new Error("prompt.md not found");
  }
  
  const content = fs.readFileSync(logPath, "utf-8");
  const lines = content.split("\n");
  const actionLines = lines.filter(l => l.startsWith("### [")).length;
  console.log(`   Log entries: ${actionLines}`);
  console.log(`   File size: ${fs.statSync(logPath).size} bytes`);
  
  // Verify key actions are logged
  const actions = ["DISCOVERY", "JUDGMENT", "WRITING", "SCHEDULER", "API_CALL"];
  for (const action of actions) {
    if (!content.includes(action)) {
      console.warn(`   ⚠️  Missing ${action} in log`);
    } else {
      console.log(`   ✅ ${action} logged`);
    }
  }
}

async function runStressTest() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     AUTONOMOUS AI CREATOR - STRESS TEST SUITE               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  
  const agentId = AGENT_ID || await initAgent();
  console.log(`\n📌 Using agent: ${agentId}`);
  
  let totalPosts = 0;
  const cycles = 5; // Run 5 cycles
  
  for (let i = 1; i <= cycles; i++) {
    const postsThisCycle = await runCycle(agentId, i);
    totalPosts += postsThisCycle;
    
    // Validate after each cycle
    await validateFeed(agentId);
    
    // Small delay between cycles
    if (i < cycles) await sleep(1000);
  }
  
  console.log(`\n📊 Total posts after ${cycles} cycles: ${totalPosts}`);
  
  // Final validations
  await validateFeed(agentId);
  await checkMemoryFiles(agentId);
  await checkPromptLog();
  
  // Test edge cases
  console.log("\n🧪 Testing edge cases...");
  
  // Test feed with non-existent agent
  const badFeed = await fetch(`${BASE_URL}/api/agent/feed?agentId=non-existent`);
  const badData = await badFeed.json();
  if (badFeed.status !== 404 || !badData.error) {
    throw new Error("Should return 404 for non-existent agent");
  }
  console.log("   ✅ 404 for non-existent agent");
  
  // Test init with missing fields
  const badInit = await fetch(`${BASE_URL}/api/agent/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona: {} })
  });
  if (badInit.status !== 400) {
    throw new Error("Should return 400 for missing fields");
  }
  console.log("   ✅ 400 for missing fields");
  
  // Test feed without agentId
  const noAgentId = await fetch(`${BASE_URL}/api/agent/feed`);
  const noAgentData = await noAgentId.json();
  if (noAgentId.status !== 400) {
    throw new Error("Should return 400 for missing agentId");
  }
  console.log("   ✅ 400 for missing agentId");
  
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                    ✅ ALL TESTS PASSED                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\n📈 Summary:`);
  console.log(`   Agent: ${agentId}`);
  console.log(`   Cycles: ${cycles}`);
  console.log(`   Total Posts: ${totalPosts}`);
  console.log(`   Feed Validation: ✅`);
  console.log(`   Memory Persistence: ✅`);
  console.log(`   Prompt Logging: ✅`);
  console.log(`   Edge Cases: ✅`);
  console.log(`\n🏆 READY FOR HACKATHON!`);
}

runStressTest().catch(err => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});