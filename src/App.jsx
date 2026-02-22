import { useState, useEffect, useRef, useCallback } from "react";

// ── Styles injected once ──────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #070a0f;
    --surface: #0d1117;
    --surface2: #131923;
    --border: #1e2d3d;
    --accent: #00d4aa;
    --accent2: #0088ff;
    --warn: #ff6b35;
    --red: #ff3b5c;
    --green: #00d4aa;
    --text: #e8edf2;
    --muted: #5a6a7a;
    --font-display: 'Syne', sans-serif;
    --font-mono: 'Space Mono', monospace;
  }

  body { background: var(--bg); color: var(--text); }

  .app {
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr;
    font-family: var(--font-mono);
    background: var(--bg);
    position: relative;
    overflow: hidden;
  }

  .grid-bg {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  .glow-orb {
    position: fixed; border-radius: 50%; pointer-events: none; z-index: 0;
    filter: blur(80px); opacity: 0.12;
  }
  .glow-orb.a { width: 600px; height: 600px; background: var(--accent2); top: -200px; right: -200px; }
  .glow-orb.b { width: 400px; height: 400px; background: var(--accent); bottom: -150px; left: -100px; }

  /* Header */
  .header {
    position: relative; z-index: 10;
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 28px;
    border-bottom: 1px solid var(--border);
    background: rgba(7,10,15,0.9);
    backdrop-filter: blur(12px);
  }

  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon {
    width: 32px; height: 32px; border-radius: 8px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
  }
  .logo-text { font-family: var(--font-display); font-weight: 800; font-size: 18px; letter-spacing: -0.5px; }
  .logo-sub { font-size: 10px; color: var(--muted); letter-spacing: 2px; }

  .header-status { display: flex; align-items: center; gap: 20px; }
  .status-pill {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: var(--muted); letter-spacing: 1px;
  }
  .status-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }

  .coinbase-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 14px; border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface); cursor: pointer;
    font-family: var(--font-mono); font-size: 11px; color: var(--text);
    transition: all 0.2s;
  }
  .coinbase-btn:hover { border-color: var(--accent); color: var(--accent); }
  .coinbase-btn.connected { border-color: var(--accent); color: var(--accent); background: rgba(0,212,170,0.08); }

  /* Main layout */
  .main {
    position: relative; z-index: 1;
    display: grid;
    grid-template-columns: 340px 1fr 320px;
    gap: 0;
    height: calc(100vh - 65px);
    overflow: hidden;
  }

  /* Panels */
  .panel {
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .panel:last-child { border-right: none; border-left: 1px solid var(--border); }

  .panel-header {
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
  }
  .panel-title {
    font-family: var(--font-display); font-weight: 700; font-size: 12px;
    letter-spacing: 2px; color: var(--muted); text-transform: uppercase;
  }
  .panel-scroll { flex: 1; overflow-y: auto; padding: 12px; }
  .panel-scroll::-webkit-scrollbar { width: 3px; }
  .panel-scroll::-webkit-scrollbar-track { background: transparent; }
  .panel-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* Portfolio Stats */
  .portfolio-value {
    padding: 18px 18px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .pv-label { font-size: 10px; color: var(--muted); letter-spacing: 2px; margin-bottom: 4px; }
  .pv-amount { font-family: var(--font-display); font-size: 28px; font-weight: 800; letter-spacing: -1px; }
  .pv-change { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .pv-pct { font-size: 12px; padding: 2px 8px; border-radius: 4px; font-weight: 700; }
  .pv-pct.pos { background: rgba(0,212,170,0.15); color: var(--green); }
  .pv-pct.neg { background: rgba(255,59,92,0.15); color: var(--red); }
  .pv-period { font-size: 10px; color: var(--muted); }

  /* Holdings */
  .holding-card {
    padding: 10px 12px; border-radius: 8px; margin-bottom: 6px;
    border: 1px solid var(--border); background: var(--surface);
    cursor: pointer; transition: all 0.2s;
    display: grid; grid-template-columns: 36px 1fr auto;
    align-items: center; gap: 10px;
  }
  .holding-card:hover { border-color: var(--accent2); background: rgba(0,136,255,0.05); }
  .holding-card.selected { border-color: var(--accent); background: rgba(0,212,170,0.05); }

  .coin-icon {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; background: var(--surface2);
  }
  .coin-name { font-family: var(--font-display); font-weight: 700; font-size: 13px; }
  .coin-sym { font-size: 10px; color: var(--muted); }
  .coin-val { text-align: right; }
  .coin-usd { font-size: 13px; font-weight: 700; }
  .coin-chg { font-size: 10px; }
  .coin-chg.pos { color: var(--green); }
  .coin-chg.neg { color: var(--red); }

  /* Mini sparkline */
  .sparkline { height: 30px; margin: 2px 0; }

  /* Center – Chat */
  .chat-area {
    display: flex; flex-direction: column;
    background: var(--bg);
  }

  .chat-tabs {
    display: flex; padding: 0 18px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    background: var(--surface);
  }
  .chat-tab {
    padding: 12px 16px; font-size: 11px; letter-spacing: 1px;
    color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent;
    transition: all 0.2s; text-transform: uppercase;
    font-family: var(--font-display); font-weight: 600;
  }
  .chat-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

  .messages {
    flex: 1; overflow-y: auto; padding: 20px 18px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .messages::-webkit-scrollbar { width: 3px; }
  .messages::-webkit-scrollbar-thumb { background: var(--border); }

  .msg {
    display: flex; gap: 10px;
    animation: fadeUp 0.3s ease forwards;
  }
  @keyframes fadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }

  .msg.user { flex-direction: row-reverse; }
  .msg-avatar {
    width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
  }
  .msg-avatar.ai { background: linear-gradient(135deg, var(--accent), var(--accent2)); }
  .msg-avatar.user { background: var(--surface2); border: 1px solid var(--border); }

  .msg-bubble {
    max-width: 75%; padding: 10px 14px; border-radius: 12px;
    font-size: 13px; line-height: 1.6;
  }
  .msg-bubble.ai {
    background: var(--surface); border: 1px solid var(--border);
    border-top-left-radius: 2px;
  }
  .msg-bubble.user {
    background: rgba(0,212,170,0.12); border: 1px solid rgba(0,212,170,0.25);
    border-top-right-radius: 2px;
  }

  .msg-meta { font-size: 10px; color: var(--muted); margin-top: 4px; }

  /* Action chips inside messages */
  .action-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .chip {
    padding: 4px 10px; border-radius: 20px; font-size: 11px; cursor: pointer;
    border: 1px solid var(--border); background: var(--surface2); color: var(--muted);
    transition: all 0.2s; font-family: var(--font-mono);
  }
  .chip:hover { border-color: var(--accent); color: var(--accent); }
  .chip.buy { border-color: rgba(0,212,170,0.4); color: var(--green); }
  .chip.sell { border-color: rgba(255,59,92,0.4); color: var(--red); }
  .chip.warn { border-color: rgba(255,107,53,0.4); color: var(--warn); }

  /* Trade confirmation card */
  .trade-card {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 14px; margin-top: 10px;
  }
  .trade-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .trade-type {
    padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700;
  }
  .trade-type.buy { background: rgba(0,212,170,0.2); color: var(--green); }
  .trade-type.sell { background: rgba(255,59,92,0.2); color: var(--red); }
  .trade-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
  .trade-row .label { color: var(--muted); }
  .trade-btns { display: flex; gap: 8px; margin-top: 12px; }
  .btn {
    flex: 1; padding: 8px; border-radius: 6px; border: none;
    font-family: var(--font-mono); font-size: 12px; cursor: pointer;
    font-weight: 700; letter-spacing: 0.5px; transition: all 0.2s;
  }
  .btn.confirm { background: var(--accent); color: #000; }
  .btn.confirm:hover { background: #00f0c0; }
  .btn.cancel { background: var(--surface); border: 1px solid var(--border); color: var(--muted); }
  .btn.cancel:hover { border-color: var(--red); color: var(--red); }

  /* Input area */
  .input-area {
    padding: 14px 18px; border-top: 1px solid var(--border);
    background: var(--surface); flex-shrink: 0;
  }
  .quick-cmds { display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
  .quick-cmd {
    padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border);
    background: var(--surface2); font-size: 10px; color: var(--muted); cursor: pointer;
    font-family: var(--font-mono); transition: all 0.2s; letter-spacing: 0.5px;
  }
  .quick-cmd:hover { border-color: var(--accent2); color: var(--accent2); }

  .input-row { display: flex; gap: 10px; align-items: flex-end; }
  .chat-input {
    flex: 1; background: var(--surface2); border: 1px solid var(--border);
    border-radius: 10px; padding: 10px 14px;
    font-family: var(--font-mono); font-size: 13px; color: var(--text);
    outline: none; resize: none; line-height: 1.5; min-height: 42px; max-height: 120px;
    transition: border-color 0.2s;
  }
  .chat-input:focus { border-color: var(--accent); }
  .chat-input::placeholder { color: var(--muted); }

  .send-btn {
    width: 42px; height: 42px; border-radius: 10px; border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #000; cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 16px; transition: all 0.2s; flex-shrink: 0;
  }
  .send-btn:hover { transform: scale(1.05); }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  /* Right panel – Market */
  .market-section { margin-bottom: 14px; }
  .market-section-title { font-size: 10px; color: var(--muted); letter-spacing: 2px; margin-bottom: 8px; padding-left: 4px; }

  .market-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 10px; border-radius: 6px; cursor: pointer;
    transition: background 0.15s; font-size: 12px;
  }
  .market-row:hover { background: var(--surface2); }
  .market-row-left { display: flex; align-items: center; gap: 8px; }
  .market-coin-icon { width: 24px; height: 24px; border-radius: 50%; background: var(--surface2); display: flex; align-items: center; justify-content: center; font-size: 12px; }
  .market-name { font-size: 12px; font-weight: 700; }
  .market-price { font-size: 12px; text-align: right; }
  .market-chg { font-size: 10px; text-align: right; }
  .market-chg.pos { color: var(--green); }
  .market-chg.neg { color: var(--red); }

  /* Metrics */
  .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
  .metric-card {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 12px;
  }
  .metric-label { font-size: 9px; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px; }
  .metric-value { font-family: var(--font-display); font-size: 16px; font-weight: 800; }
  .metric-sub { font-size: 10px; color: var(--muted); margin-top: 2px; }

  /* Fear & Greed */
  .fg-meter { text-align: center; padding: 12px; margin-bottom: 14px; }
  .fg-arc { position: relative; width: 120px; height: 60px; margin: 0 auto 8px; }
  .fg-label { font-family: var(--font-display); font-weight: 800; font-size: 22px; }
  .fg-name { font-size: 11px; color: var(--warn); font-weight: 700; }
  .fg-desc { font-size: 10px; color: var(--muted); margin-top: 2px; }

  /* Strategy alert */
  .strategy-alert {
    border: 1px solid rgba(255,107,53,0.3); background: rgba(255,107,53,0.06);
    border-radius: 8px; padding: 12px; margin-bottom: 10px;
  }
  .sa-header { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--warn); margin-bottom: 6px; }
  .sa-body { font-size: 11px; color: var(--muted); line-height: 1.6; }

  /* Typing indicator */
  .typing { display: flex; align-items: center; gap: 4px; padding: 8px 0; }
  .typing-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); opacity: 0.4; animation: typing 1.2s ease-in-out infinite; }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typing { 0%,100% { opacity: 0.4; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-4px); } }

  /* Scrollbar */
  * { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }

  /* Tag */
  .tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 10px; letter-spacing: 1px; }
  .tag.live { background: rgba(0,212,170,0.15); color: var(--accent); }

  /* Notification */
  .notif {
    position: fixed; bottom: 24px; right: 24px; z-index: 100;
    background: var(--surface); border: 1px solid var(--accent);
    border-radius: 10px; padding: 12px 16px; font-size: 12px;
    animation: slideIn 0.3s ease; max-width: 280px;
    box-shadow: 0 4px 30px rgba(0,212,170,0.2);
  }
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .notif-title { font-weight: 700; color: var(--accent); margin-bottom: 2px; }

  /* Tab content */
  .tab-content { display: none; }
  .tab-content.active { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

  /* Activity feed */
  .activity-item {
    display: flex; gap: 10px; padding: 10px 0;
    border-bottom: 1px solid var(--border); align-items: flex-start;
  }
  .activity-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
  .activity-icon.buy { background: rgba(0,212,170,0.15); }
  .activity-icon.sell { background: rgba(255,59,92,0.15); }
  .activity-icon.alert { background: rgba(255,107,53,0.15); }
  .activity-detail { flex: 1; }
  .activity-title { font-size: 12px; font-weight: 700; }
  .activity-sub { font-size: 10px; color: var(--muted); margin-top: 2px; }
  .activity-time { font-size: 10px; color: var(--muted); }
`;

// ── Mock Data ─────────────────────────────────────────────────────────────────
const PORTFOLIO = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", icon: "₿", amount: 0.4821, price: 67240, change: 2.34, color: "#f7931a" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", icon: "Ξ", amount: 3.2, price: 3480, change: -1.12, color: "#627eea" },
  { id: "solana", symbol: "SOL", name: "Solana", icon: "◎", amount: 28, price: 178, change: 5.67, color: "#9945ff" },
  { id: "cardano", symbol: "ADA", name: "Cardano", icon: "₳", amount: 2400, price: 0.612, change: -0.83, color: "#0033ad" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", icon: "⬡", amount: 85, price: 14.2, change: 3.21, color: "#2a5ada" },
];

const MARKET = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿", price: 67240, change: 2.34 },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", price: 3480, change: -1.12 },
  { symbol: "SOL", name: "Solana", icon: "◎", price: 178, change: 5.67 },
  { symbol: "BNB", name: "BNB", icon: "⬡", price: 592, change: 0.45 },
  { symbol: "XRP", name: "XRP", icon: "✕", price: 0.624, change: -2.31 },
  { symbol: "DOGE", name: "Dogecoin", icon: "Ð", price: 0.132, change: 8.12 },
  { symbol: "AVAX", name: "Avalanche", icon: "▲", price: 38.4, change: -0.67 },
  { symbol: "DOT", name: "Polkadot", icon: "●", price: 7.82, change: 1.23 },
];

const ACTIVITIES = [
  { type: "buy", icon: "↑", title: "Bought 0.05 BTC", sub: "Market order • $3,362", time: "2m ago" },
  { type: "alert", icon: "⚡", title: "ETH Support Alert", sub: "Price testing $3,400 support", time: "18m ago" },
  { type: "sell", icon: "↓", title: "Sold 5 SOL", sub: "Limit order filled • $890", time: "1h ago" },
  { type: "buy", icon: "↑", title: "Bought 500 ADA", sub: "DCA strategy • $306", time: "3h ago" },
  { type: "alert", icon: "⚡", title: "Portfolio ATH", sub: "New all-time high reached", time: "1d ago" },
];

const QUICK_CMDS = [
  "Analyze my portfolio", "What should I buy?", "Market overview", "BTC prediction",
  "Risk assessment", "Rebalance suggestions", "Top gainers today",
];

const AI_GREET = `**Welcome to your Crypto Command Center.**

I'm your AI portfolio manager with direct access to your Coinbase account. I can:

**📊 Analyze** - Real-time portfolio metrics, P&L, risk exposure, correlations
**🔍 Research** - Deep-dive analysis on any coin, on-chain data, sentiment
**💡 Strategize** - DCA plans, momentum strategies, hedging recommendations  
**⚡ Execute** - Buy/sell orders (I'll always confirm before executing)
**🚨 Alert** - Proactive alerts on key price levels and market events

Your portfolio is currently **up +4.2%** today. SOL is your best performer at **+5.67%**. ETH is your only red position at **-1.12%**.

What would you like to do?`;

// ── Sparkline SVG ─────────────────────────────────────────────────────────────
function Sparkline({ positive }) {
  const pts = Array.from({ length: 20 }, (_, i) => {
    const base = 15;
    const trend = positive ? -i * 0.3 : i * 0.3;
    return base + trend + (Math.random() * 8 - 4);
  }).reverse();
  const min = Math.min(...pts), max = Math.max(...pts);
  const norm = pts.map(p => 28 - ((p - min) / (max - min)) * 26);
  const d = norm.map((y, x) => `${x === 0 ? "M" : "L"} ${(x / 19) * 100} ${y}`).join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
      <path d={d} stroke={positive ? "#00d4aa" : "#ff3b5c"} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ── Trade Card ────────────────────────────────────────────────────────────────
function TradeCard({ trade, onConfirm, onCancel }) {
  return (
    <div className="trade-card">
      <div className="trade-card-header">
        <span className={`trade-type ${trade.type}`}>{trade.type.toUpperCase()}</span>
        <span style={{ fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 700 }}>{trade.symbol}</span>
      </div>
      <div className="trade-row"><span className="label">Amount</span><span>{trade.amount} {trade.symbol}</span></div>
      <div className="trade-row"><span className="label">Price</span><span>${trade.price.toLocaleString()}</span></div>
      <div className="trade-row"><span className="label">Total</span><span style={{ fontWeight: 700 }}>${(trade.amount * trade.price).toLocaleString()}</span></div>
      <div className="trade-row"><span className="label">Fee (est.)</span><span style={{ color: "var(--muted)" }}>~$2.40</span></div>
      <div className="trade-btns">
        <button className="btn cancel" onClick={onCancel}>Cancel</button>
        <button className="btn confirm" onClick={() => onConfirm(trade)}>Confirm {trade.type === "buy" ? "Purchase" : "Sale"}</button>
      </div>
    </div>
  );
}

// ── Message Renderer ──────────────────────────────────────────────────────────
function MessageContent({ content, onChipClick, onConfirm, onCancel }) {
  if (content.type === "trade") {
    return <TradeCard trade={content.trade} onConfirm={onConfirm} onCancel={onCancel} />;
  }
  const formatted = content.text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--surface2);padding:1px 5px;border-radius:3px;font-size:11px;">$1</code>')
    .replace(/\n/g, '<br/>');
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: formatted }} />
      {content.chips && (
        <div className="action-chips">
          {content.chips.map((c, i) => (
            <button key={i} className={`chip ${c.variant || ""}`} onClick={() => onChipClick(c.label)}>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function CryptoAgent() {
  const [messages, setMessages] = useState([
    { id: 1, role: "ai", content: { text: AI_GREET }, ts: "Just now" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [notification, setNotification] = useState(null);
  const [pendingTrade, setPendingTrade] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const conversationRef = useRef([]);

  const totalValue = PORTFOLIO.reduce((s, c) => s + c.amount * c.price, 0);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showNotif = (title, body) => {
    setNotification({ title, body });
    setTimeout(() => setNotification(null), 4000);
  };

  const portfolioContext = `
PORTFOLIO CONTEXT (live data):
- Total Value: $${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
- 24h Change: +4.2% (+$${(totalValue * 0.042).toLocaleString(undefined, { maximumFractionDigits: 0 })})
- Holdings: ${PORTFOLIO.map(c => `${c.symbol}: ${c.amount} units @ $${c.price} (${c.change > 0 ? "+" : ""}${c.change}% 24h)`).join(", ")}
- Market Fear & Greed Index: 72 (Greed)
- Connected exchange: Coinbase
- Current date/time context: crypto markets active
`;

  const SYSTEM_PROMPT = `You are an expert AI crypto portfolio manager and trading agent integrated with Coinbase. You have real-time access to the user's portfolio and market data.

${portfolioContext}

Your capabilities:
1. ANALYSIS: Provide detailed technical, fundamental, and sentiment analysis
2. STRATEGY: Suggest and implement DCA, momentum, mean-reversion, and other strategies  
3. EXECUTION: When user wants to trade, always confirm with specifics before executing. Format trade requests with the exact structure needed.
4. ALERTS: Proactively flag risks, opportunities, and portfolio imbalances
5. EDUCATION: Explain crypto concepts clearly

Personality: Professional, data-driven, direct. Use crypto-native terminology. Be concise but thorough.

IMPORTANT RULES:
- ALWAYS confirm trades before "executing" – say you'll show a confirmation
- When suggesting a trade, respond with: [TRADE: type=buy|sell, symbol=XXX, amount=N, price=CURRENT_PRICE, reason=...]
- Use **bold** for emphasis, bullet points with hyphens
- Keep responses focused and actionable
- When you recommend a trade, include the [TRADE:] tag in your response so the UI can parse it
- Real price data is shown above – use it in your analysis
- You can't actually connect to Coinbase in this demo, but simulate realistic trading interactions

Format trade triggers like: [TRADE: type=buy, symbol=BTC, amount=0.01, price=67240]`;

  const parseTradeFromResponse = (text) => {
    const match = text.match(/\[TRADE:\s*type=(\w+),\s*symbol=(\w+),\s*amount=([\d.]+),\s*price=([\d.]+)\]/);
    if (match) {
      return { type: match[1], symbol: match[2], amount: parseFloat(match[3]), price: parseFloat(match[4]) };
    }
    return null;
  };

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { id: Date.now(), role: "user", content: { text }, ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    conversationRef.current = [...conversationRef.current, { role: "user", content: text }];

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: conversationRef.current,
        }),
      });
      const data = await response.json();
      const rawText = data.content?.[0]?.text || "I encountered an error. Please try again.";

      conversationRef.current = [...conversationRef.current, { role: "assistant", content: rawText }];

      // Parse trade
      const trade = parseTradeFromResponse(rawText);
      const cleanText = rawText.replace(/\[TRADE:[^\]]+\]/g, "").trim();

      // Build chips based on context
      let chips = [];
      if (rawText.toLowerCase().includes("buy") || rawText.toLowerCase().includes("purchase")) {
        chips.push({ label: "Show me more analysis", variant: "" });
      }
      if (trade) {
        chips.push({ label: "Confirm trade", variant: "buy" }, { label: "Cancel", variant: "sell" });
      }
      if (rawText.toLowerCase().includes("risk")) {
        chips.push({ label: "Hedge my portfolio", variant: "warn" });
      }

      const aiMsg = {
        id: Date.now() + 1,
        role: "ai",
        content: { text: cleanText, chips: chips.length ? chips : undefined, trade: trade ? { ...trade, confirmed: false } : undefined },
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      if (trade) {
        aiMsg.content.type = undefined; // will show trade after text
        setPendingTrade(trade);
        setMessages(prev => [...prev, aiMsg, {
          id: Date.now() + 2, role: "ai",
          content: { type: "trade", trade },
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }]);
      } else {
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: "ai",
        content: { text: "Network error. Please check your connection and try again." },
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleTradeConfirm = (trade) => {
    setMessages(prev => prev.map(m =>
      m.content?.type === "trade" ? { ...m, content: { ...m.content, confirmed: true } } : m
    ));
    showNotif("Order Submitted ✓", `${trade.type.toUpperCase()} ${trade.amount} ${trade.symbol} @ $${trade.price.toLocaleString()}`);
    setPendingTrade(null);
    setMessages(prev => [...prev, {
      id: Date.now(), role: "ai",
      content: { text: `✅ **Order submitted to Coinbase.** Your ${trade.type} order for **${trade.amount} ${trade.symbol}** at **$${trade.price.toLocaleString()}** has been placed. I'll notify you when it fills.\n\nWould you like me to set a price alert or stop-loss for this position?`, chips: [{ label: "Set stop-loss", variant: "warn" }, { label: "Set price alert", variant: "" }] },
      ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
  };

  const handleTradeCancel = () => {
    setPendingTrade(null);
    setMessages(prev => prev.filter(m => m.content?.type !== "trade"));
    setMessages(prev => [...prev, {
      id: Date.now(), role: "ai",
      content: { text: "Trade cancelled. Your portfolio is unchanged. Let me know if you'd like to explore other opportunities." },
      ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="app">
      <div className="grid-bg" />
      <div className="glow-orb a" />
      <div className="glow-orb b" />

      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">⬡</div>
          <div>
            <div className="logo-text">NEXUS AI</div>
            <div className="logo-sub">CRYPTO PORTFOLIO AGENT</div>
          </div>
        </div>
        <div className="header-status">
          <div className="status-pill">
            <div className="status-dot" />
            LIVE MARKET DATA
          </div>
          <div className="tag live">AGENT ACTIVE</div>
          <button
            className={`coinbase-btn ${connected ? "connected" : ""}`}
            onClick={() => { setConnected(!connected); showNotif(connected ? "Disconnected" : "Coinbase Connected ✓", connected ? "Coinbase account unlinked" : "Your Coinbase account is now linked"); }}
          >
            <span>⬡</span>
            {connected ? "● Coinbase Connected" : "Connect Coinbase"}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="main">

        {/* LEFT – Portfolio */}
        <div className="panel">
          <div className="portfolio-value">
            <div className="pv-label">TOTAL PORTFOLIO VALUE</div>
            <div className="pv-amount">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div className="pv-change">
              <span className="pv-pct pos">+4.2%</span>
              <span className="pv-period">24H</span>
              <span className="pv-pct pos" style={{ marginLeft: "auto" }}>+18.7% 30D</span>
            </div>
          </div>
          <div className="panel-header">
            <div className="panel-title">Holdings</div>
            <div className="tag live">● LIVE</div>
          </div>
          <div className="panel-scroll">
            {PORTFOLIO.map(coin => {
              const value = coin.amount * coin.price;
              const pos = coin.change >= 0;
              return (
                <div
                  key={coin.id}
                  className={`holding-card ${selectedCoin?.id === coin.id ? "selected" : ""}`}
                  onClick={() => { setSelectedCoin(coin); sendMessage(`Give me a detailed analysis of ${coin.name} (${coin.symbol}) and my position.`); }}
                >
                  <div className="coin-icon" style={{ border: `1px solid ${coin.color}22` }}>{coin.icon}</div>
                  <div>
                    <div className="coin-name">{coin.symbol}</div>
                    <div className="coin-sym">{coin.amount} {coin.symbol}</div>
                    <Sparkline positive={pos} />
                  </div>
                  <div className="coin-val">
                    <div className="coin-usd">${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className={`coin-chg ${pos ? "pos" : "neg"}`}>{pos ? "+" : ""}{coin.change}%</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>${coin.price.toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER – Chat / Activity */}
        <div className="chat-area">
          <div className="chat-tabs">
            {["chat", "activity"].map(t => (
              <div key={t} className={`chat-tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                {t === "chat" ? "🤖 AI Agent" : "📋 Activity"}
              </div>
            ))}
          </div>

          <div className={`tab-content ${activeTab === "chat" ? "active" : ""}`}>
            <div className="messages">
              {messages.map(msg => (
                <div key={msg.id} className={`msg ${msg.role}`}>
                  <div className={`msg-avatar ${msg.role}`}>{msg.role === "ai" ? "⬡" : "👤"}</div>
                  <div>
                    <div className={`msg-bubble ${msg.role}`}>
                      <MessageContent
                        content={msg.content}
                        onChipClick={sendMessage}
                        onConfirm={handleTradeConfirm}
                        onCancel={handleTradeCancel}
                      />
                    </div>
                    <div className="msg-meta">{msg.ts}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="msg ai">
                  <div className="msg-avatar ai">⬡</div>
                  <div className="msg-bubble ai">
                    <div className="typing">
                      <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
              <div className="quick-cmds">
                {QUICK_CMDS.map((cmd, i) => (
                  <button key={i} className="quick-cmd" onClick={() => sendMessage(cmd)}>{cmd}</button>
                ))}
              </div>
              <div className="input-row">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder="Ask anything - analyze, trade, strategize..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button className="send-btn" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
                  ↑
                </button>
              </div>
            </div>
          </div>

          <div className={`tab-content ${activeTab === "activity" ? "active" : ""}`}>
            <div className="panel-scroll" style={{ padding: "16px 20px" }}>
              <div className="strategy-alert">
                <div className="sa-header">⚡ AGENT ALERT</div>
                <div className="sa-body">SOL momentum is accelerating. RSI at 68, approaching overbought. Consider taking 20% profits or setting a trailing stop at $165.</div>
              </div>
              {ACTIVITIES.map((a, i) => (
                <div key={i} className="activity-item">
                  <div className={`activity-icon ${a.type}`}>{a.icon}</div>
                  <div className="activity-detail">
                    <div className="activity-title">{a.title}</div>
                    <div className="activity-sub">{a.sub}</div>
                  </div>
                  <div className="activity-time">{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT – Market */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Market</div>
            <div className="tag live">● LIVE</div>
          </div>
          <div className="panel-scroll">
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">MARKET CAP</div>
                <div className="metric-value">$2.41T</div>
                <div className="metric-sub" style={{ color: "var(--green)" }}>+3.2% 24h</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">24H VOLUME</div>
                <div className="metric-value">$87.4B</div>
                <div className="metric-sub" style={{ color: "var(--muted)" }}>+12% vs avg</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">BTC DOM.</div>
                <div className="metric-value">52.3%</div>
                <div className="metric-sub" style={{ color: "var(--red)" }}>-0.4% 24h</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">ETH GAS</div>
                <div className="metric-value">24 gwei</div>
                <div className="metric-sub" style={{ color: "var(--green)" }}>Low</div>
              </div>
            </div>

            {/* Fear & Greed */}
            <div className="market-section">
              <div className="market-section-title">SENTIMENT</div>
              <div className="fg-meter">
                <svg viewBox="0 0 120 65" width="120" height="65" style={{ display: "block", margin: "0 auto 8px" }}>
                  <defs>
                    <linearGradient id="fg" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ff3b5c" />
                      <stop offset="50%" stopColor="#ff6b35" />
                      <stop offset="100%" stopColor="#00d4aa" />
                    </linearGradient>
                  </defs>
                  <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#1e2d3d" strokeWidth="8" />
                  <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="url(#fg)" strokeWidth="8" strokeDasharray="157" strokeDashoffset="47" strokeLinecap="round" />
                  <line x1="60" y1="60" x2="60" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round"
                    transform="rotate(26, 60, 60)" />
                  <circle cx="60" cy="60" r="4" fill="#fff" />
                </svg>
                <div className="fg-label">72</div>
                <div className="fg-name">GREED</div>
                <div className="fg-desc">Market is greedy - be cautious</div>
              </div>
            </div>

            <div className="market-section">
              <div className="market-section-title">TOP COINS</div>
              {MARKET.map(coin => (
                <div key={coin.symbol} className="market-row" onClick={() => sendMessage(`Tell me about ${coin.name} (${coin.symbol}) - current price, recent trend, and should I buy?`)}>
                  <div className="market-row-left">
                    <div className="market-coin-icon">{coin.icon}</div>
                    <div>
                      <div className="market-name">{coin.symbol}</div>
                    </div>
                  </div>
                  <div>
                    <div className="market-price">${coin.price.toLocaleString()}</div>
                    <div className={`market-chg ${coin.change >= 0 ? "pos" : "neg"}`}>{coin.change >= 0 ? "+" : ""}{coin.change}%</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="market-section">
              <div className="market-section-title">AI STRATEGIES</div>
              <div className="strategy-alert">
                <div className="sa-header">🎯 DCA ACTIVE</div>
                <div className="sa-body">Weekly BTC DCA running. Next buy: $500 on Monday. 12-week avg: $64,200.</div>
              </div>
              <div className="strategy-alert" style={{ borderColor: "rgba(0,136,255,0.3)", background: "rgba(0,136,255,0.06)" }}>
                <div className="sa-header" style={{ color: "var(--accent2)" }}>💡 OPPORTUNITY</div>
                <div className="sa-body">ETH/BTC ratio at 6-month low. Historically bullish for ETH. Consider rotating 5% BTC to ETH.</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Notification */}
      {notification && (
        <div className="notif">
          <div className="notif-title">{notification.title}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>{notification.body}</div>
        </div>
      )}
    </div>
  );
}