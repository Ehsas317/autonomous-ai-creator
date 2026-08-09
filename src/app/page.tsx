"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [agentId, setAgentId] = useState<string>("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [stats, setStats] = useState<{ totalPosts: number } | null>(null);

  const fetchFeed = async (id: string) => {
    try {
      const res = await fetch(`/api/agent/feed?agentId=${id}`);
      const data = await res.json();
      if ('posts' in data) {
        setPosts(data.posts);
        setStats({ totalPosts: data.posts.length });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initAgent = async () => {
    setInitLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: { name: "Dr. Aria Voss", domain: "AI Security Research" } }),
      });
      const data = await res.json();
      if (data.agentId) {
        setAgentId(data.agentId);
        await fetchFeed(data.agentId);
      } else {
        setError(data.error || "Failed to initialize agent");
      }
    } catch (err) {
      setError("Failed to initialize agent: " + (err as Error).message);
    } finally {
      setInitLoading(false);
    }
  };

  const triggerCycle = async () => {
    await fetch(`/api/cron`, { headers: { "Authorization": "Bearer my-secret-123" } });
    await fetchFeed(agentId);
  };

  const refreshFeed = () => { if (agentId) fetchFeed(agentId); };

  useEffect(() => { if (agentId) { const interval = setInterval(() => fetchFeed(agentId), 30000); return () => clearInterval(interval); } }, [agentId]);

  if (!agentId) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem", fontFamily: "system-ui" }}>
        <h1>Autonomous AI Creator</h1>
        <p>Dr. Aria Voss — AI Security Researcher</p>
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "1rem", borderRadius: "0.5rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        <button onClick={initAgent} disabled={initLoading} style={{ padding: "1rem 2rem", fontSize: "1.1rem", background: "#111", color: "white", border: "none", borderRadius: "0.5rem", cursor: initLoading ? "not-allowed" : "pointer", opacity: initLoading ? 0.7 : 1 }}>
          {initLoading ? "🔄 Initializing..." : "🚀 Create Agent & Start Autonomous Publishing"}
        </button>
      </div>
    );
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
  const formatRelativeTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return "just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Autonomous AI Creator</h1>
      <p>Dr. Aria Voss — AI Security Researcher</p>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button onClick={() => fetchFeed(agentId!)}>🔄 Refresh</button>
        <button onClick={async () => { await fetch('/api/cron', { headers: { 'Authorization': 'Bearer my-secret-123' } }); }} style={{ background: "#10b981" }}>⚡ Trigger Cycle</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ background: "#f0f9ff", padding: "1rem", borderRadius: "0.5rem" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>0</div>
          <div>Posts Published</div>
        </div>
      </div>
      <p style={{ fontWeight: 600 }}>Agent ID: <code>{agentId}</code></p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p>Posts: {0}</p>
      </div>
    </div>
  );
}
