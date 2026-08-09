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

export default function Home() {
  const [agentId, setAgentId] = useState<string>("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

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
        // Fetch initial feed
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

  const fetchFeed = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/feed?agentId=${id}`);
      const data: FeedResponse | { error: string } = await res.json();
      if ('posts' in data) {
        setPosts(data.posts);
        setLastRefresh(new Date());
      } else {
        setError(data.error || "Failed to fetch feed");
      }
    } catch (err) {
      setError("Failed to fetch feed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const refreshFeed = () => {
    if (agentId) fetchFeed(agentId);
  };

  // Auto-refresh every 30 seconds
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

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ marginBottom: "2rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem" }}>
        <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}>Autonomous AI Creator</h1>
        <p style={{ margin: "0.5rem 0 0", color: "#6b7280" }}>
          Dr. Aria Voss — AI Security Researcher
        </p>
      </header>

      {!agentId ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>Initialize Autonomous Agent</h2>
          <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
            This will create an autonomous AI security researcher that discovers topics,
            makes editorial decisions, and publishes content over 48+ hours without human intervention.
          </p>
          <button
            onClick={initAgent}
            disabled={initLoading}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              backgroundColor: "#111827",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: initLoading ? "not-allowed" : "pointer",
              opacity: initLoading ? 0.7 : 1,
            }}
          >
            {initLoading ? "Initializing..." : "Create Agent & Start Autonomous Publishing"}
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <span style={{ fontWeight: 600 }}>Agent ID:</span>{" "}
              <code style={{ background: "#f3f4f6", padding: "0.125rem 0.5rem", borderRadius: "0.25rem" }}>
                {agentId}
              </code>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={refreshFeed}
                disabled={loading}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Refreshing..." : "Refresh Feed"}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(agentId)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                }}
              >
                Copy Agent ID
              </button>
            </div>
          </div>

          {lastRefresh && (
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
              Last refreshed: {lastRefresh.toLocaleTimeString()} | {posts.length} posts published
            </p>
          )}

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "1rem", borderRadius: "0.5rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                <p>No posts published yet.</p>
                <p style={{ fontSize: "0.875rem" }}>The agent runs discovery cycles every 3 hours. Check back soon!</p>
              </div>
            ) : (
              posts.map((post) => (
                <article key={post.id} style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1.5rem", background: "#fafafa" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>Post #{post.id.slice(-6)}</span>
                      <span style={{ marginLeft: "1rem", color: "#6b7280", fontSize: "0.875rem" }}>
                        {formatDate(post.createdAt)}
                      </span>
                    </div>
                    <a href={post.sources[0]} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.875rem", color: "#3b82f6" }}>
                      Source →
                    </a>
                  </div>

                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: "1.5rem", fontSize: "0.95rem" }}>
                    {post.text}
                  </div>

                  <details style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
                    <summary style={{ fontWeight: 600, cursor: "pointer", color: "#374151" }}>
                      📋 Publishing Rationale
                    </summary>
                    <div style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: 1.6, color: "#4b5563", whiteSpace: "pre-wrap" }}>
                      {post.rationale}
                    </div>
                  </details>
                </article>
              ))
            )}
          </div>

          <footer style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb", color: "#9ca3af", fontSize: "0.875rem", textAlign: "center" }}>
            <p>Autonomous AI Creator — Hackathon Submission</p>
            <p>Agent runs discovery every 3 hours • Judges topics against editorial criteria • Publishes with full rationale</p>
          </footer>
        </>
      )}
    </div>
  );
}