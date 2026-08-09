"use client";

import { useState, useEffect } from "react";

interface Post {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: string[];
}

interface FeedResponse {
  posts: Post[];
}

interface Stats {
  totalPosts: number;
  totalRejected: number;
  totalDiscovered: number;
  lastActive: string;
}

export default function Home() {
  const [agentId, setAgentId] = useState<string>("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [stats, setStats] = useState<{ totalPosts: number; totalRejected: number; totalDiscovered: number; lastActive: string } | null>(null);
  const [showRationale, setShowRationale] = useState<Record<string, boolean>>({});

  const fetchFeed = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/feed?agentId=${id}`);
      const data = await res.json();
      if ('posts' in data) {
        setPosts(data.posts);
        setLastRefresh(new Date());
        setStats({
          totalPosts: data.posts.length,
          totalRejected: 0,
          totalDiscovered: 0,
          lastActive: data.posts[0]?.createdAt || new Date().toISOString(),
        });
      } else {
        setError(data.error || "Failed to fetch feed");
      }
    } catch (err) {
      setError("Failed to fetch feed: " + (err as Error).message);
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
        body: JSON.stringify({
          persona: {
            name: "Dr. Aria Voss",
            domain: "AI Security Research",
          },
        }),
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
    if (!agentId) return;
    setLoading(true);
    try {
      await fetch(`/api/cron`, {
        headers: { "Authorization": "Bearer my-secret-123" }
      });
      await fetchFeed(agentId);
    } catch (err) {
      setError("Failed to trigger cycle: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const refreshFeed = () => {
    if (agentId) fetchFeed(agentId);
  };

  useEffect(() => {
    if (!agentId) return;
    const interval = setInterval(() => fetchFeed(agentId), 30000);
    return () => clearInterval(interval);
  }, [agentId]);

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC";
  };

  const formatRelativeTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return "just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ marginBottom: "2rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}>Autonomous AI Creator</h1>
            <p style={{ margin: "0.5rem 0 0", color: "#6b7280" }}>
              Dr. Aria Voss — AI Security Researcher
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={refreshFeed} disabled={loading} style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Refreshing..." : "🔄 Refresh"}
            </button>
            <button onClick={triggerCycle} disabled={loading} style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Running..." : "⚡ Trigger Cycle"}
            </button>
            <button onClick={() => navigator.clipboard.writeText(agentId)} style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}>
              📋 Copy ID
            </button>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "0.5rem", padding: "1rem" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0369a1" }}>{stats?.totalPosts || 0}</div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Posts Published</div>
          </div>
          <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "0.5rem", padding: "1rem" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#92400e" }}>{stats?.totalRejected || 0}</div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Topics Rejected</div>
          </div>
          <div style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#374151" }}>{stats?.totalDiscovered || 0}</div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Topics Discovered</div>
          </div>
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "0.5rem", padding: "1rem" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#166534" }}>🤖</div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Autonomous</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span style={{ fontWeight: 600 }}>Agent ID:</span>{" "}
            <code style={{ background: "#f3f4f6", padding: "0.125rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.875rem" }}>
              {agentId}
            </code>
          </div>
          {lastRefresh && (
            <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              Last refreshed: {lastRefresh.toLocaleTimeString()} | {posts.length} posts
            </span>
          )}
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "1rem", borderRadius: "0.5rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤖</div>
              <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No posts published yet.</p>
              <p style={{ fontSize: "0.875rem" }}>The agent runs discovery cycles every 3 hours. Click "Trigger Cycle" to run manually!</p>
            </div>
          ) : (
            posts.map((post) => (
              <article key={post.id} style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1.5rem", background: "#fafafa", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "1rem" }}>Post</span>
                    <span style={{ marginLeft: "0.75rem", color: "#6b7280", fontSize: "0.875rem" }}>
                      {formatDate(post.createdAt)} ({formatRelativeTime(post.createdAt)})
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <a href={post.sources[0]} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.875rem", color: "#3b82f6", textDecoration: "none" }}>
                      📄 Source →
                    </a>
                    <button
                      onClick={() => setShowRationale(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      style={{
                        padding: "0.375rem 0.75rem",
                        backgroundColor: showRationale[post.id] ? "#111827" : "#f3f4f6",
                        color: showRationale[post.id] ? "white" : "#374151",
                        border: "none",
                        borderRadius: "0.375rem",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                      }}
                    >
                      {showRationale[post.id] ? "🙈 Hide Rationale" : "📋 Show Rationale"}
                    </button>
                  </div>
                </div>

                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, marginBottom: "1.5rem", fontSize: "0.95rem", fontFamily: "Georgia, serif", color: "#1f2937" }}>
                  {post.text}
                </div>

                {showRationale[post.id] && (
                  <details style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem", marginTop: "1rem" }}>
                    <summary style={{ fontWeight: 600, cursor: "pointer", color: "#374151", marginBottom: "0.75rem" }}>
                      📋 Publishing Rationale
                    </summary>
                    <div style={{ fontSize: "0.875rem", lineHeight: 1.7, color: "#4b5563", whiteSpace: "pre-wrap", background: "#f9fafb", padding: "1rem", borderRadius: "0.5rem" }}>
                      {post.rationale}
                    </div>
                  </details>
                )}
              </article>
            ))
          )}
        </div>

        <footer style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb", color: "#9ca3af", fontSize: "0.875rem", textAlign: "center" }}>
          <p>Autonomous AI Creator — ABTalks Vibe Code Hackathon Submission</p>
          <p>Agent runs discovery every 3 hours • Judges topics against editorial criteria • Publishes with full rationale</p>
          <p style={{ marginTop: "0.5rem" }}>🤖 Dr. Aria Voss — AI Security Researcher • Skeptical • Evidence-driven • Contrarian</p>
        </footer>
      </div>
    );
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC";
  };

  const formatRelativeTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return "just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
}

export default Home;
