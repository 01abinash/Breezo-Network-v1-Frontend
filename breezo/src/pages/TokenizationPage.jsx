import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { dashboard as fetchDashboard } from "../api/dashboard.api";
import { readTokenSession, TOKEN_SESSION_EVENT } from "../lib/tokenization";
import { getNodeRewardBalance, claimReward } from "../solana/program/breezo.method";
import { useProgram } from "../hooks/useProgram";
import styles from "./TokenizationPage.module.css";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const formatTimeAgo = (date) => {
  if (!date) return "just now";
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

const aqiColor = (level) => {
  if (level === "GOOD") return "#2dd4bf";
  if (level === "MODERATE") return "#fbbf24";
  return "#f87171";
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function TokenizationPage() {
  const [session, setSession]         = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [nodes, setNodes]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [claiming, setClaiming]       = useState(null); // nodeId currently claiming
  const [toast, setToast]             = useState(null);

  const intervalRef = useRef(null);

  const { publicKey, connected, disconnect } = useWallet();
  const walletConnected = connected && !!publicKey;
  const walletAddress   = useMemo(() => publicKey?.toBase58(), [publicKey]);

  // ── Anchor program via hook ──────────────────────────────────────────────────
  const program = useProgram();

  // ── Session ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = readTokenSession();
    setSession(s);
    setSessionReady(true);

    const onChange = (e) => setSession(e.detail);
    window.addEventListener(TOKEN_SESSION_EVENT, onChange);
    return () => window.removeEventListener(TOKEN_SESSION_EVENT, onChange);
  }, []);

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Load dashboard + enrich with on-chain balances ───────────────────────────
  const loadDashboard = async (walletAddr) => {
    if (!walletAddr || !program) {
      console.warn("[dashboard] skipping load — no wallet or program");
      return;
    }

    try {
      setLoading(true);
      const res  = await fetchDashboard(walletAddr);
      const data = Array.isArray(res) ? res : res?.data ?? [];

      console.log("[dashboard] fetched nodes:", data.length);

      const enriched = await Promise.all(
        data.map(async (node) => {
          if (!node.nodeAccount) {
            console.warn("[dashboard] node has no nodeAccount:", node.nodeId);
            return { ...node, onChainReward: 0 };
          }

          try {
            // ✅ getNodeRewardBalance already returns human-readable BREEZO
            const onChainReward = await getNodeRewardBalance(program, node.nodeAccount);
            console.log(`[dashboard] node ${node.nodeId} → onChainReward: ${onChainReward}`);
            return { ...node, onChainReward };
          } catch (err) {
            console.error("[dashboard] failed to read chain for node:", node.nodeId, err);
            return { ...node, onChainReward: 0 };
          }
        })
      );

      setNodes(enriched);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[dashboard] fetchDashboard failed:", err);
      showToast("error", "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-refresh every 2 min ─────────────────────────────────────────────────
  useEffect(() => {
    if (!walletConnected || !program) return;

    loadDashboard(walletAddress);

    intervalRef.current = setInterval(() => loadDashboard(walletAddress), 120_000);
    return () => clearInterval(intervalRef.current);
  }, [walletConnected, walletAddress, program]);

  // ── Claim ────────────────────────────────────────────────────────────────────
  const handleClaim = async (node) => {
    if (!program || !publicKey) return;

    try {
      setClaiming(node.nodeId);
      console.log("[claim] claiming for node:", node.nodeId, "account:", node.nodeAccount);

      const sig = await claimReward(program, node.nodeAccount, publicKey);
      console.log("[claim] tx signature:", sig);

      showToast("success", "Claim successful 🚀");
      await loadDashboard(walletAddress);
    } catch (err) {
      console.error("[claim] error:", err);
      showToast("error", err?.message || "Claim failed");
    } finally {
      setClaiming(null);
    }
  };

  // ── Derived totals ────────────────────────────────────────────────────────────
  const totalOnChain   = nodes.reduce((a, n) => a + (n.onChainReward || 0), 0);
  const totalWeb2      = nodes.reduce((a, n) => a + (n.reward || 0), 0);
  const claimableCount = nodes.filter((n) => (n.onChainReward || 0) > 0).length;

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (sessionReady && !session) return <Navigate to="/login" replace />;

  // ── Wallet not connected ──────────────────────────────────────────────────────
  if (!walletConnected) {
    return (
      <div className={styles.page}>
        <div className={styles.identityPanel}
          style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
          <p className={styles.kicker}>Breezo DePIN</p>
          <h1 className={styles.title}>Connect<br />Wallet</h1>
          <p className={styles.subtitle}>
            Connect your Phantom wallet to view your air quality nodes and claim BREEZO token rewards.
          </p>
          <div
            className={`${styles.metaRow} ${styles.walletBtnWrap}`}
            style={{ justifyContent: "center", marginTop: 28 }}
          >
            <WalletMultiButton />
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading && nodes.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingCard}>
          <p className={styles.kicker}>Dashboard</p>
          <p className={styles.subtitle} style={{ marginTop: 10 }}>
            Loading nodes + reading on-chain balances…
          </p>
        </div>
      </div>
    );
  }

  // ── No nodes ──────────────────────────────────────────────────────────────────
  if (!loading && nodes.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.identityPanel}>
          <p className={styles.kicker}>No Nodes Found</p>
          <h2 className={styles.panelTitle} style={{ marginTop: 10 }}>No registered nodes</h2>
          <p className={styles.subtitle}>This wallet has no air quality nodes on record.</p>
          <div className={styles.metaRow} style={{ marginTop: 20 }}>
            <button className={styles.secondaryBtn}
              onClick={() => loadDashboard(walletAddress)}>Retry</button>
            <button className={styles.secondaryBtn} onClick={disconnect}>Disconnect</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Dashboard ────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 14,
          background: toast.type === "success"
            ? "rgba(45,212,191,0.12)" : "rgba(248,113,113,0.12)",
          border: `1px solid ${toast.type === "success"
            ? "rgba(45,212,191,0.35)" : "rgba(248,113,113,0.35)"}`,
          color: toast.type === "success" ? "#2dd4bf" : "#f87171",
          fontSize: 14, fontWeight: 600,
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          maxWidth: 340,
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── COMMAND DECK ── */}
      <div className={styles.commandDeck}>

        {/* LEFT — Identity */}
        <div className={styles.identityPanel}>
          <div className={styles.panelTopline}>
            <p className={styles.kicker}>DePIN Reward Dashboard</p>
            <span className={styles.metaPill}>
              {walletAddress?.slice(0, 6)}…{walletAddress?.slice(-4)}
            </span>
          </div>

          <h1 className={styles.title}>Reward<br />Earnings</h1>
          <p className={styles.subtitle}>
            Sensor data streams to Web2. When your node earns ≥ 10 BREEZO the backend
            syncs it on-chain via{" "}
            <code style={{ color: "#a78bfa", fontSize: 12 }}>add_reward</code>.
            Once synced, claim directly to your wallet.
          </p>

          <div className={styles.snapshotGrid}>
            <div className={styles.snapshotCard}>
              <span>Total Nodes</span>
              <strong>{nodes.length}</strong>
            </div>
            <div className={styles.snapshotCard}>
              <span>Claimable On-Chain</span>
              <strong style={{ color: "#38bdf8" }}>{totalOnChain.toFixed(4)}</strong>
              <p>BREEZO ready now</p>
            </div>
            <div className={styles.snapshotCard}>
              <span>Earned Web2</span>
              <strong style={{ color: "#a78bfa" }}>{totalWeb2.toFixed(2)}</strong>
              <p>BREEZO pending sync</p>
            </div>
            <div className={styles.snapshotCard}>
              <span>Last Refresh</span>
              <strong style={{ fontSize: 16, letterSpacing: "-0.02em" }}>
                {formatTimeAgo(lastUpdated)}
              </strong>
              <p>auto every 2 min</p>
            </div>
          </div>

          <div className={styles.metaRow}>
            <button
              className={styles.secondaryBtn}
              onClick={() => loadDashboard(walletAddress)}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
            <button className={styles.secondaryBtn} onClick={disconnect}>
              Disconnect
            </button>
          </div>
        </div>

        {/* RIGHT — Claim summary */}
        <div className={styles.actionPanel}>
          <div className={styles.panelTopline}>
            <p className={styles.kicker}>Claim Summary</p>
          </div>

          <h2 className={styles.panelTitle}>
            {totalOnChain > 0
              ? `${totalOnChain.toFixed(4)} BREEZO`
              : "Nothing to claim"}
          </h2>

          <div className={styles.actionStack}>
            <div className={styles.actionStat}>
              <span>On-chain balance</span>
              <strong style={{ color: "#38bdf8" }}>{totalOnChain.toFixed(4)} BREEZO</strong>
            </div>
            <div className={styles.actionStat}>
              <span>Web2 accumulated</span>
              <strong style={{ color: "#a78bfa" }}>{totalWeb2.toFixed(2)} BREEZO</strong>
            </div>
            <div className={styles.actionStat}>
              <span>Nodes with rewards</span>
              <strong>{claimableCount} / {nodes.length}</strong>
            </div>
            <div className={styles.actionStat}>
              <span>Sync threshold</span>
              <strong>≥ 10 BREEZO</strong>
            </div>
          </div>

          {totalOnChain > 0 && (
            <div className={styles.successBox}>
              ✓ {claimableCount} node{claimableCount > 1 ? "s are" : " is"} ready to claim below ↓
            </div>
          )}

          <div className={styles.contextCard} style={{ marginTop: 4 }}>
            <span>Account Type</span>
            <strong style={{ fontSize: 12, fontFamily: "monospace" }}>PDA (seeds: node + owner + device)</strong>
            <p style={{ marginTop: 6, fontSize: 13 }}>
              Treasury is a PDA with seed{" "}
              <code style={{ color: "#a78bfa", fontSize: 11 }}>"treasury"</code>.
              Rewards are SPL token transfers from treasury ATA → your ATA.
            </p>
          </div>
        </div>
      </div>

      {/* ── NODE GRID ── */}
      <div className={styles.contentGrid}>
        <div className={styles.telemetryPanel}>
          <div className={styles.panelHeader}>
            <p className={styles.sectionLabel}>Your Nodes</p>
            <span className={styles.metaPill}>{nodes.length} registered</span>
          </div>

          <div className={styles.fieldGrid}>
            {nodes.map((node, i) => {
              const onChainReward = node.onChainReward ?? 0;
              const web2Reward    = node.reward ?? 0;
              const claimable     = onChainReward > 0;
              const pendingSync   = web2Reward > 0 && onChainReward === 0 && !node.syncing;
              const syncing       = node.syncing;
              const isClaiming    = claiming === node.nodeId;
              const color         = aqiColor(node.aqiLevel);

              return (
                <div key={node.nodeId || i} className={styles.fieldCard}>

                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Node #{String(i + 1).padStart(2, "0")}</span>
                    <span className={styles.levelBadge}
                      style={{ color, fontSize: 10, padding: "2px 10px", minHeight: 22 }}>
                      {node.aqiLevel ?? "—"}
                    </span>
                  </div>

                  {/* Node ID */}
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#475569" }}>
                    {node.nodeId
                      ? `${node.nodeId.slice(0, 8)}…${node.nodeId.slice(-5)}`
                      : "—"}
                  </span>

                  {/* AQI */}
                  <strong style={{ color, fontSize: 28, letterSpacing: "-0.05em", lineHeight: 1 }}>
                    {node.aqi ?? "—"}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "#647086", marginLeft: 5 }}>AQI</span>
                  </strong>

                  {/* Sensor pills */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {node.pm25 != null && (
                      <span className={styles.metaPill} style={{ minHeight: 26, fontSize: 11 }}>
                        PM2.5 · {node.pm25}
                      </span>
                    )}
                    {node.pm10 != null && (
                      <span className={styles.metaPill} style={{ minHeight: 26, fontSize: 11 }}>
                        PM10 · {node.pm10}
                      </span>
                    )}
                    {node.temperature != null && (
                      <span className={styles.metaPill} style={{ minHeight: 26, fontSize: 11 }}>
                        {node.temperature}°C
                      </span>
                    )}
                  </div>

                  {/* Live / syncing indicator */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: syncing ? "#fbbf24" : "#2dd4bf",
                    }} />
                    <span className={styles.kicker} style={{ letterSpacing: "0.1em" }}>
                      {syncing ? "Syncing to chain" : "Live"} · {formatTimeAgo(node.lastSeen)}
                    </span>
                  </div>

                  {/* ── STATE 1: CLAIMABLE ── */}
                  {claimable && (
                    <>
                      <div className={styles.actionStat} style={{ padding: "8px 12px" }}>
                        <span>On-chain balance</span>
                        <strong style={{ color: "#38bdf8" }}>{onChainReward.toFixed(4)} BREEZO</strong>
                      </div>
                      {web2Reward > 0 && (
                        <div className={styles.actionStat} style={{ padding: "8px 12px" }}>
                          <span>Web2 earned</span>
                          <strong style={{ color: "#a78bfa" }}>{web2Reward.toFixed(2)} BREEZO</strong>
                        </div>
                      )}
                      <button
                        className={styles.primaryBtn}
                        onClick={() => handleClaim(node)}
                        disabled={claiming !== null}
                        style={{ width: "100%", marginTop: 8 }}
                      >
                        {isClaiming ? "Claiming…" : `Claim ${onChainReward.toFixed(4)} BREEZO`}
                      </button>
                    </>
                  )}

                  {/* ── STATE 2: PENDING SYNC ── */}
                  {pendingSync && (
                    <>
                      <div className={styles.actionStat} style={{ padding: "8px 12px" }}>
                        <span>Web2 earned</span>
                        <strong style={{ color: "#a78bfa" }}>{web2Reward.toFixed(2)} BREEZO</strong>
                      </div>
                      <div className={styles.successBox} style={{
                        borderColor: "rgba(251,191,36,0.3)",
                        background: "rgba(251,191,36,0.07)",
                        color: "#fbbf24", fontSize: 12, marginTop: 0,
                      }}>
                        {web2Reward >= 10
                          ? "⏳ Threshold met — awaiting backend sync to chain."
                          : `⏳ ${(10 - web2Reward).toFixed(2)} BREEZO until sync threshold.`}
                      </div>
                    </>
                  )}

                  {/* ── STATE 3: MID-SYNC ── */}
                  {syncing && !claimable && (
                    <div className={styles.successBox} style={{
                      borderColor: "rgba(56,189,248,0.3)",
                      background: "rgba(56,189,248,0.07)",
                      color: "#38bdf8", fontSize: 12, marginTop: 0,
                    }}>
                      🔄 On-chain write in progress — balance updating…
                    </div>
                  )}

                  {/* ── STATE 4: IDLE ── */}
                  {!claimable && !pendingSync && !syncing && (
                    <span className={styles.kicker} style={{ color: "#374151" }}>
                      No rewards yet
                    </span>
                  )}

                  {/* Account address */}
                  {node.nodeAccount && (
                    <span title={node.nodeAccount}
                      style={{ fontSize: 10, fontFamily: "monospace", color: "#374151", cursor: "default" }}>
                      Acct: {node.nodeAccount.slice(0, 8)}…{node.nodeAccount.slice(-5)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Pipeline explanation */}
        <div className={styles.contextPanel}>
          <p className={styles.sectionLabel}>Reward Pipeline</p>
          <h3 className={styles.panelTitle} style={{ fontSize: 20, marginTop: 8 }}>How it works</h3>
          <div className={styles.contextStack} style={{ marginTop: 16 }}>
            <div className={styles.contextCard}>
              <span>Step 1 — Stream</span>
              <strong>Sensor ingests data</strong>
              <p>Your IoT device sends signed payloads to the server. Each reading
                calculates a reward based on PM2.5 and accumulates in{" "}
                <code style={{ color: "#a78bfa", fontSize: 11 }}>NodeLatest.reward</code>.</p>
            </div>
            <div className={styles.contextCard}>
              <span>Step 2 — Threshold</span>
              <strong>≥ 10 BREEZO triggers sync</strong>
              <p>When accumulated reward hits the threshold, the backend calls{" "}
                <code style={{ color: "#a78bfa", fontSize: 11 }}>add_reward</code> on-chain.</p>
            </div>
            <div className={styles.contextCard}>
              <span>Step 3 — On-chain</span>
              <strong>Account balance updated</strong>
              <p>The node's PDA <code style={{ color: "#a78bfa", fontSize: 11 }}>rewardBalance</code>{" "}
                field is incremented. Dashboard reads this directly via Anchor.</p>
            </div>
            <div className={styles.contextCard}>
              <span>Step 4 — Claim</span>
              <strong>SPL transfer to your wallet</strong>
              <p>Clicking Claim calls <code style={{ color: "#a78bfa", fontSize: 11 }}>claim_reward</code>.
                BREEZO tokens move from Treasury ATA → your ATA.{" "}
                <code style={{ color: "#a78bfa", fontSize: 11 }}>rewardBalance</code> resets to 0.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
