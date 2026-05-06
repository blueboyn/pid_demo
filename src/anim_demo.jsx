import React, { useState, useEffect } from "react";
import { Play, Pause, AlertTriangle, Activity, Zap } from "lucide-react";

// ============================================================
// State-driven animation demo
// 4 layers: Geometry → Animation → (would be) Binding → Semantic
// ============================================================

const STATES = {
  normal:    { label: "정상 운전",     color: "#22d3ee", rpm: 1750, level: 0.7, flow: 1.0 },
  startup:   { label: "기동 중",       color: "#a3e635", rpm: 800,  level: 0.5, flow: 0.4 },
  cavitation:{ label: "캐비테이션",    color: "#fb923c", rpm: 1850, level: 0.3, flow: 0.6 },
  surge:     { label: "서지",          color: "#f43f5e", rpm: 2100, level: 0.9, flow: 0.2 },
  stopped:   { label: "정지",          color: "#475569", rpm: 0,    level: 0.7, flow: 0   },
};

export default function AnimDemo() {
  const [state, setState] = useState("normal");
  const s = STATES[state];

  // Inject keyframes once
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
      @keyframes shake { 0%,100% { transform: translate(0,0) } 25% { transform: translate(0.4px,-0.3px) } 75% { transform: translate(-0.4px,0.3px) } }
      @keyframes flow-dash { to { stroke-dashoffset: -20; } }
      @keyframes wave { 0%,100% { d: path("M-18,-10 Q-9,-13 0,-10 T18,-10 L18,22 L-18,22 Z"); } 50% { d: path("M-18,-10 Q-9,-7 0,-10 T18,-10 L18,22 L-18,22 Z"); } }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Animation params derived from state (this is the "binding" layer)
  const spinDur = s.rpm > 0 ? `${60 / (s.rpm / 100)}s` : "0s";
  const flowDur = s.flow > 0 ? `${1.2 / s.flow}s` : "0s";
  const shaking = state === "cavitation";
  const pulsing = state === "surge" || state === "cavitation";
  const tankFillY = -22 + 44 * (1 - s.level);

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-slate-200" style={{
      fontFamily: '"DM Sans", system-ui, sans-serif',
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(34,211,238,0.04), transparent 60%)',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <header className="border-b border-slate-800 px-6 py-4">
        <div style={{ fontFamily: '"Instrument Serif", serif' }} className="text-2xl italic text-slate-100">
          State-Driven HMI Animation <span className="text-amber-400">·</span> Demo
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-1 font-mono">
          상상이 KG state → animation parameters
        </div>
      </header>

      {/* State controls */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 mr-2 font-mono uppercase tracking-wider">의미적 상태:</span>
        {Object.entries(STATES).map(([key, v]) => (
          <button key={key} onClick={() => setState(key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-mono border transition-all ${
                    state === key
                      ? "border-transparent text-slate-950"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                  style={state === key ? { background: v.color } : {}}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Stage */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{
               backgroundImage: 'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)',
               backgroundSize: '24px 24px',
             }} />

        <svg viewBox="0 0 600 220" className="w-full max-w-4xl h-auto" style={{ maxHeight: "60vh" }}>
          {/* Process line tank → pump */}
          <line x1="78" y1="110" x2="172" y2="110" stroke="#475569" strokeWidth="2" />
          {/* Process line pump → valve */}
          <line x1="208" y1="110" x2="278" y2="110" stroke="#475569" strokeWidth="2" />
          {/* Animated flow indicator (overlay dashed line) */}
          {s.flow > 0 && (
            <>
              <line x1="78" y1="110" x2="172" y2="110"
                    stroke={s.color} strokeWidth="2" strokeDasharray="6 14"
                    style={{ animation: `flow-dash ${flowDur} linear infinite` }} />
              <line x1="208" y1="110" x2="278" y2="110"
                    stroke={s.color} strokeWidth="2" strokeDasharray="6 14"
                    style={{ animation: `flow-dash ${flowDur} linear infinite` }} />
            </>
          )}

          {/* TANK with animated level */}
          <g transform="translate(40, 110)">
            <rect x="-18" y="-22" width="36" height="44" rx="3"
                  stroke="#64748b" fill="rgba(15,23,42,0.6)" strokeWidth="1.4" />
            {/* Liquid */}
            <clipPath id="tankClip">
              <rect x="-18" y="-22" width="36" height="44" rx="3" />
            </clipPath>
            <rect x="-18" y={tankFillY} width="36" height={22 - tankFillY + 22}
                  fill={s.color} opacity="0.35" clipPath="url(#tankClip)"
                  style={{ transition: "y 0.8s cubic-bezier(0.4,0,0.2,1), height 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
            <line x1="-18" y1={tankFillY} x2="18" y2={tankFillY}
                  stroke={s.color} strokeWidth="1.2"
                  style={{ transition: "y1 0.8s, y2 0.8s" }} />
            <ellipse cx="0" cy="-22" rx="18" ry="5" stroke="#64748b" fill="rgba(15,23,42,0.6)" strokeWidth="1.4" />
            <ellipse cx="0" cy="22" rx="18" ry="5" stroke="#64748b" fill="rgba(15,23,42,0.6)" strokeWidth="1.4" />
            <text y="42" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="JetBrains Mono">T-101</text>
            <text y="-32" textAnchor="middle" fontSize="8" fill={s.color} fontFamily="JetBrains Mono">
              {Math.round(s.level * 100)}%
            </text>
          </g>

          {/* PUMP with rotating impeller */}
          <g transform="translate(190, 110)" style={shaking ? { animation: "shake 0.08s linear infinite" } : {}}>
            <circle r="18" stroke={s.color} fill="rgba(15,23,42,0.6)" strokeWidth="1.4"
                    style={pulsing ? { animation: "pulse 0.6s ease-in-out infinite" } : {}} />
            {/* Impeller (rotating group) */}
            <g style={s.rpm > 0 ? { animation: `spin ${spinDur} linear infinite`, transformOrigin: "center" } : {}}>
              <polygon points="0,-12 10,6 -10,6" stroke={s.color} fill="none" strokeWidth="1.4" />
              <polygon points="0,12 -10,-6 10,-6" stroke={s.color} fill="none" strokeWidth="0.8" opacity="0.5" />
            </g>
            <text y="36" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="JetBrains Mono">P-101</text>
            <text y="-26" textAnchor="middle" fontSize="8" fill={s.color} fontFamily="JetBrains Mono">
              {s.rpm} RPM
            </text>
          </g>

          {/* VALVE with rotating handle */}
          <g transform="translate(300, 110)">
            <polygon points="-14,-10 14,10 14,-10 -14,10"
                     stroke={s.color} fill="rgba(15,23,42,0.4)" strokeWidth="1.4" />
            {/* Handle rotates based on flow */}
            <line x1="0" y1="-10" x2="0" y2="-22" stroke={s.color} strokeWidth="1.6"
                  style={{ transformOrigin: "0 -10px",
                           transform: `rotate(${s.flow > 0 ? 0 : 90}deg)`,
                           transition: "transform 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
            <circle cx="0" cy="-22" r="2.5" fill={s.color} />
            <text y="32" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="JetBrains Mono">V-101</text>
          </g>

          {/* HEAT EXCHANGER (just colored, shows state propagation) */}
          <line x1="322" y1="110" x2="408" y2="110" stroke="#475569" strokeWidth="2" />
          {s.flow > 0 && (
            <line x1="322" y1="110" x2="408" y2="110"
                  stroke={s.color} strokeWidth="2" strokeDasharray="6 14"
                  style={{ animation: `flow-dash ${flowDur} linear infinite` }} />
          )}
          <g transform="translate(430, 110)">
            <circle r="20" stroke={s.color} fill="rgba(15,23,42,0.4)" strokeWidth="1.4" />
            <line x1="-26" y1="0" x2="26" y2="0" stroke={s.color} strokeWidth="1.4" />
            <text y="38" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="JetBrains Mono">E-201</text>
          </g>

          {/* Instrument with state-driven blink */}
          <g transform="translate(40, 50)">
            <line x1="0" y1="14" x2="0" y2="58" stroke="#475569" strokeWidth="0.8" strokeDasharray="2 2" />
            <circle r="11" stroke={s.color} fill="rgba(15,23,42,0.6)" strokeWidth="1.4"
                    style={pulsing ? { animation: "pulse 0.8s ease-in-out infinite" } : {}} />
            <line x1="-11" y1="0" x2="11" y2="0" stroke={s.color} strokeWidth="0.8" />
            <text y="-18" textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="JetBrains Mono">TI-101</text>
          </g>
        </svg>
      </div>

      {/* Animation params readout */}
      <div className="border-t border-slate-800 px-6 py-3 grid grid-cols-4 gap-4 font-mono text-xs">
        <Param label="state" value={state} color={s.color} />
        <Param label="spin_dur" value={spinDur} />
        <Param label="flow_dur" value={s.flow > 0 ? flowDur : "—"} />
        <Param label="effects" value={[
          shaking && "shake",
          pulsing && "pulse",
        ].filter(Boolean).join(", ") || "—"} />
      </div>

      <footer className="border-t border-slate-800 px-6 py-2 text-[10px] font-mono text-slate-500">
        의미적 상태(state) 변경 → 모든 애니메이션 파라미터가 자동 재계산. 실제로는 KG에서 상태가 추론되어 들어오는 구조.
      </footer>
    </div>
  );
}

const Param = ({ label, value, color }) => (
  <div className="border border-slate-800/60 rounded p-2">
    <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-0.5">{label}</div>
    <div className="text-sm" style={{ color: color || "#cbd5e1" }}>{value}</div>
  </div>
);
