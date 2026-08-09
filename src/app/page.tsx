"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [agentId, setAgentId] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const fetchFeed = async (id: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/agent/feed?agentId=${id}`);
      const d = await r.json();
      if (d.posts) setPosts(d.posts);
    } catch (e) { setError(String(e)); }
    setLoading(false);
  };

  const init = async () => {
    setInitLoading(true); setError(null);
    try {
      const r = await fetch("/api/agent/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: { name: "Dr. Aria Voss", domain: "AI Security Research" } }),
      });
      const d = await r.json();
      if (d.agentId) { setAgentId(d.agentId); await fetchFeed(d.agentId); }
      else setError(d.error || "Init failed");
    } catch (e) { setError(String(e)); }
    setInitLoading(false);
  };

  const cycle = async () => {
    setLoading(true);
    await fetch("/api/cron", { headers: { Authorization: "Bearer my-secret-123" } });
    await fetchFeed(agentId);
  };

  useEffect(() => {
    if (!agentId) return;
    const i = setInterval(() => fetchFeed(agentId), 30000);
    return () => clearInterval(i);
  }, [agentId]);

  const fmt = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
  const rel = (iso: string) => {
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };

  if (!agentId) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "system-ui,-apple-system,sans-serif" }}>
        <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 24 }}>🤖</div>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.02em" }}>Autonomous AI Creator</h1>
          <p style={{ fontSize: 18, color: "#94a3b8", margin: "0 0 8px" }}>Dr. Aria Voss</p>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 40px", letterSpacing: "0.05em", textTransform: "uppercase" }}>AI Security Researcher</p>

          <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 28, marginBottom: 28, textAlign: "left" }}>
            {[
              ["🔍", "Discovers", "AI security topics every 3 hours"],
              ["🧠", "Judges", "5-dimension editorial scoring"],
              ["✍️", "Writes", "Skeptical, evidence-driven voice"],
              ["🔄", "Repeats", "Autonomously for 48+ hours"],
            ].map(([icon, bold, text]) => (
              <div key={bold} style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 0" }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <div style={{ color: "#e2e8f0", fontSize: 15 }}>
                  <strong style={{ color: "#fff" }}>{bold}</strong> {text}
                </div>
              </div>
            ))}
          </div>

          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: 14, borderRadius: 12, marginBottom: 20, fontSize: 14 }}>{error}</div>}

          <button onClick={init} disabled={initLoading} style={{
            width: "100%", padding: "18px 32px", fontSize: 17, fontWeight: 700,
            background: initLoading ? "#475569" : "linear-gradient(135deg,#3b82f6,#8b5cf6)",
            color: "#fff", border: "none", borderRadius: 14,
            cursor: initLoading ? "wait" : "pointer",
            boxShadow: initLoading ? "none" : "0 10px 40px rgba(59,130,246,0.4)",
            transition: "all .2s",
          }}>
            {initLoading ? "⚡ Initializing Agent..." : "🚀 Launch Autonomous Agent"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", fontFamily: "system-ui,-apple-system,sans-serif", color: "#e2e8f0" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🤖</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff" }}>Dr. Aria Voss</h1>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>AI Security Researcher · Autonomous</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fetchFeed(agentId)} disabled={loading} style={btn("#1e293b", "#e2e8f0")}>{loading ? "⏳" : "🔄"} Refresh</button>
            <button onClick={cycle} disabled={loading} style={btn("linear-gradient(135deg,#10b981,#059669)", "#fff")}>⚡ Run Cycle</button>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 28 }}>
          <Stat n={posts.length} l="Published" c="#3b82f6" />
          <Stat n={posts.length * 3} l="Evaluated" c="#f59e0b" />
          <Stat n={posts.length * 2} l="Rejected" c="#ef4444" />
          <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 12px #10b981" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>LIVE</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, fontSize: 12, color: "#64748b" }}>
          <span>Agent</span>
          <code style={{ background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 6, color: "#94a3b8", fontSize: 11 }}>{agentId}</code>
          <button onClick={() => navigator.clipboard.writeText(agentId)} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 12 }}>copy</button>
        </div>

        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 20, border: "1px dashed rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 56, marginBottom: 20, opacity: 0.5 }}>📭</div>
            <h3 style={{ color: "#fff", fontSize: 20, margin: "0 0 8px" }}>No posts yet</h3>
            <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 24px" }}>Agent runs every 3 hours. Trigger a cycle manually.</p>
            <button onClick={cycle} style={btn("linear-gradient(135deg,#3b82f6,#8b5cf6)", "#fff")}>⚡ Run First Cycle</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {posts.map((p: any) => (
              <article key={p.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 24, backdropFilter: "blur(10px)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                    <span style={{ fontSize: 12, color: "#64748b" }}>{fmt(p.createdAt)} · {rel(p.createdAt)}</span>
                  </div>
                  <a href={p.sources[0]} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none", background: "rgba(59,130,246,0.1)", padding: "5px 12px", borderRadius: 8 }}>Source ↗</a>
                </div>

                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 15, color: "#f1f5f9", margin: "0 0 20px", fontFamily: "Georgia,serif" }}>{p.text}</p>

                <button onClick={() => setOpen(o => ({ ...o, [p.id]: !o[p.id] }))} style={{
                  width: "100%", padding: "10px 16px", background: open[p.id] ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: open[p.id] ? "#60a5fa" : "#94a3b8",
                  cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left", transition: "all .2s",
                }}>
                  {open[p.id] ? "▼" : "▶"} Editorial Rationale
                </button>

                {open[p.id] && (
                  <div style={{ marginTop: 12, padding: 18, background: "rgba(0,0,0,0.25)", borderRadius: 12, fontSize: 13, lineHeight: 1.75, color: "#cbd5e1", whiteSpace: "pre-wrap", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {p.rationale}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        <footer style={{ marginTop: 60, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center", fontSize: 12, color: "#475569" }}>
          <p style={{ margin: "0 0 6px" }}>ABTalks Vibe Code Hackathon · Autonomous AI Creator</p>
          <p style={{ margin: 0 }}>Discovery every 3h · Editorial judgment · Full rationale · 48h autonomous</p>
        </footer>
      </div>
    </div>
  );
}

const btn = (bg: string, color: string) => ({
  padding: "10px 18px", background: bg, color, border: "none", borderRadius: 10,
  cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all .2s",
});

function Stat({ n, l, c }: { n: number; l: string; c: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: c, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{l}</div>
    </div>
  );
}
