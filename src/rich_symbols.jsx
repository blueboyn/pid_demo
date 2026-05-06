import React, { useState, useEffect } from "react";

// ============================================================
// Rich industrial symbols — production-grade rendering
// Techniques: gradients, filters, multi-layer detail, animated fills
// ============================================================

const STATES = {
  normal:    { label: "정상 운전",  color: "#22d3ee", rpm: 1750, level: 0.7, flow: 1.0, pressure: 0.6 },
  startup:   { label: "기동 중",    color: "#a3e635", rpm: 800,  level: 0.5, flow: 0.4, pressure: 0.3 },
  cavitation:{ label: "캐비테이션", color: "#fb923c", rpm: 1850, level: 0.3, flow: 0.6, pressure: 0.5 },
  surge:     { label: "서지",       color: "#f43f5e", rpm: 2100, level: 0.92,flow: 0.2, pressure: 0.95 },
  stopped:   { label: "정지",       color: "#64748b", rpm: 0,    level: 0.7, flow: 0,   pressure: 0.1 },
};

export default function RichSymbols() {
  const [state, setState] = useState("normal");
  const s = STATES[state];
  const c = s.color;

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spinFast { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%,100% { opacity: 0.4 } 50% { opacity: 1 } }
      @keyframes shake { 0%,100% { transform: translate(0,0) } 25% { transform: translate(0.6px,-0.4px) } 75% { transform: translate(-0.6px,0.4px) } }
      @keyframes steam-rise { 0% { transform: translate(0,0); opacity: 0 } 20% { opacity: 0.8 } 100% { transform: translate(-3px,-30px); opacity: 0 } }
      @keyframes wave-shift { 0%,100% { transform: translateX(0) } 50% { transform: translateX(-8px) } }
      @keyframes flow-slide { 0% { transform: translateX(-40px) } 100% { transform: translateX(0) } }
      @keyframes needle-jitter { 0%,100% { transform: rotate(0deg) } 50% { transform: rotate(2deg) } }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const spinDur = s.rpm > 0 ? `${Math.max(0.15, 60 / s.rpm * 8)}s` : "0s";
  const flowDur = s.flow > 0 ? `${1.4 / s.flow}s` : "0s";
  const tankFillY = -28 + 56 * (1 - s.level);
  const releasingSteam = state === "surge";
  const cavitating = state === "cavitation";
  const valveAngle = s.flow > 0 ? (s.flow * 90 - 90) : 0; // -90 = closed handle position

  return (
    <div className="w-full h-screen flex flex-col text-slate-200" style={{
      fontFamily: '"DM Sans", system-ui, sans-serif',
      background: "radial-gradient(ellipse at top, #1e293b 0%, #0a0e1a 60%, #020617 100%)",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <header className="border-b border-slate-800/60 px-6 py-4 flex items-end justify-between">
        <div>
          <div style={{ fontFamily: '"Instrument Serif", serif' }} className="text-2xl italic text-slate-100">
            Industrial Symbol Library <span className="text-amber-400">·</span> Rich Render
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-1 font-mono">
            multi-layer SVG · gradients · filters · particle FX
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-500">v0.2 / production-grade</div>
      </header>

      <div className="px-6 py-4 border-b border-slate-800/60 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 mr-2 font-mono uppercase tracking-wider">상태:</span>
        {Object.entries(STATES).map(([key, v]) => (
          <button key={key} onClick={() => setState(key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-mono border transition-all ${
                    state === key ? "border-transparent text-slate-950 shadow-lg" : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                  style={state === key ? { background: v.color, boxShadow: `0 0 20px ${v.color}40` } : {}}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden p-4">
        <div className="absolute inset-0 opacity-20 pointer-events-none"
             style={{
               backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
               backgroundSize: '32px 32px',
             }} />

        <svg viewBox="0 0 700 320" className="w-full max-w-5xl h-auto" style={{ maxHeight: "70vh" }}>
          <defs>
            {/* === FILTERS === */}
            <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.5"/>
            </filter>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="innerShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dy="1" result="off"/>
              <feFlood floodColor="#000" floodOpacity="0.5"/>
              <feComposite in2="off" operator="in"/>
              <feComposite in2="SourceGraphic" operator="over"/>
            </filter>

            {/* === GRADIENTS === */}
            <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b"/>
              <stop offset="35%" stopColor="#475569"/>
              <stop offset="65%" stopColor="#334155"/>
              <stop offset="100%" stopColor="#1e293b"/>
            </linearGradient>
            <linearGradient id="metalDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155"/>
              <stop offset="50%" stopColor="#1e293b"/>
              <stop offset="100%" stopColor="#0f172a"/>
            </linearGradient>
            <linearGradient id="cylinder" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0f172a"/>
              <stop offset="20%" stopColor="#334155"/>
              <stop offset="45%" stopColor="#64748b"/>
              <stop offset="55%" stopColor="#64748b"/>
              <stop offset="80%" stopColor="#334155"/>
              <stop offset="100%" stopColor="#0f172a"/>
            </linearGradient>
            <radialGradient id="dome" cx="0.35" cy="0.35">
              <stop offset="0%" stopColor="#94a3b8"/>
              <stop offset="50%" stopColor="#475569"/>
              <stop offset="100%" stopColor="#1e293b"/>
            </radialGradient>
            <radialGradient id="volute" cx="0.4" cy="0.4">
              <stop offset="0%" stopColor="#475569"/>
              <stop offset="60%" stopColor="#1e293b"/>
              <stop offset="100%" stopColor="#020617"/>
            </radialGradient>
            <linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity="0.85"/>
              <stop offset="50%" stopColor={c} stopOpacity="0.55"/>
              <stop offset="100%" stopColor={c} stopOpacity="0.25"/>
            </linearGradient>
            <linearGradient id="flowFluid" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={c} stopOpacity="0"/>
              <stop offset="35%" stopColor={c} stopOpacity="0.9"/>
              <stop offset="65%" stopColor={c} stopOpacity="0.9"/>
              <stop offset="100%" stopColor={c} stopOpacity="0"/>
            </linearGradient>

            {/* Pattern: cooling fins */}
            <pattern id="fins" width="3" height="20" patternUnits="userSpaceOnUse">
              <line x1="1.5" y1="0" x2="1.5" y2="20" stroke="#0f172a" strokeWidth="1"/>
            </pattern>
          </defs>

          {/* ============================================
              PIPE NETWORK with animated flow
              ============================================ */}
          {[
            { x1: 80, x2: 200, y: 180 },
            { x1: 240, x2: 340, y: 180 },
            { x1: 380, x2: 480, y: 180 },
            { x1: 520, x2: 620, y: 180 },
          ].map((p, i) => (
            <g key={`pipe-${i}`}>
              {/* Pipe body (3D-ish: dark stroke + light center) */}
              <line x1={p.x1} y1={p.y} x2={p.x2} y2={p.y} stroke="#0f172a" strokeWidth="10" strokeLinecap="round"/>
              <line x1={p.x1} y1={p.y} x2={p.x2} y2={p.y} stroke="url(#metal)" strokeWidth="8" strokeLinecap="round"/>
              <line x1={p.x1} y1={p.y - 1.5} x2={p.x2} y2={p.y - 1.5} stroke="#94a3b8" strokeWidth="0.6" opacity="0.6"/>
              {/* Pipe weld marks */}
              <circle cx={p.x1 + 8} cy={p.y} r="3.5" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
              <circle cx={p.x2 - 8} cy={p.y} r="3.5" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
              {/* Animated fluid */}
              {s.flow > 0 && (
                <g style={{ animation: `flow-slide ${flowDur} linear infinite` }}>
                  {Array.from({ length: Math.ceil((p.x2 - p.x1) / 40) + 2 }).map((_, j) => (
                    <rect key={j} x={p.x1 + j * 40 - 40} y={p.y - 3} width="40" height="6" fill="url(#flowFluid)"/>
                  ))}
                </g>
              )}
            </g>
          ))}

          {/* ============================================
              [1] VERTICAL TANK with wavy liquid + sight glass
              ============================================ */}
          <g transform="translate(50, 180)" filter="url(#shadow)">
            {/* Skirt support */}
            <path d="M -22 38 L -28 60 L 28 60 L 22 38 Z" fill="url(#metalDark)" stroke="#0f172a" strokeWidth="0.5"/>
            <line x1="-16" y1="48" x2="16" y2="48" stroke="#0f172a" strokeWidth="0.5"/>
            
            {/* Bottom dome */}
            <ellipse cx="0" cy="38" rx="26" ry="7" fill="url(#dome)" stroke="#0f172a" strokeWidth="0.5"/>
            
            {/* Body cylinder */}
            <rect x="-26" y="-38" width="52" height="76" fill="url(#cylinder)" stroke="#0f172a" strokeWidth="0.5"/>
            
            {/* Liquid with wave */}
            <clipPath id="tankClip">
              <rect x="-26" y="-38" width="52" height="76"/>
            </clipPath>
            <g clipPath="url(#tankClip)">
              <g style={{ animation: "wave-shift 3s ease-in-out infinite", transformOrigin: "center" }}>
                <path d={`M -34 ${tankFillY} Q -17 ${tankFillY - 3} 0 ${tankFillY} T 34 ${tankFillY} L 34 38 L -34 38 Z`}
                      fill="url(#liquid)"
                      style={{ transition: "d 0.8s cubic-bezier(0.4,0,0.2,1)" }}/>
              </g>
              {/* Liquid surface highlight */}
              <line x1="-26" y1={tankFillY} x2="26" y2={tankFillY} stroke={c} strokeWidth="0.6" opacity="0.9"
                    style={{ transition: "y1 0.8s, y2 0.8s" }}/>
            </g>
            
            {/* Top dome with highlight */}
            <ellipse cx="0" cy="-38" rx="26" ry="7" fill="url(#dome)" stroke="#0f172a" strokeWidth="0.5"/>
            <ellipse cx="-9" cy="-40" rx="8" ry="2" fill="white" opacity="0.2"/>
            
            {/* Manway on top */}
            <circle cx="0" cy="-38" r="4" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.3"/>
            {[0, 90, 180, 270].map(a => (
              <circle key={a} cx={3 * Math.cos(a * Math.PI / 180)} cy={-38 + 3 * Math.sin(a * Math.PI / 180)} r="0.5" fill="#0f172a"/>
            ))}
            
            {/* Side highlight (specular) */}
            <rect x="-20" y="-35" width="3" height="70" fill="white" opacity="0.08"/>
            
            {/* Sight glass column */}
            <g transform="translate(28, 0)">
              <rect x="-1" y="-25" width="3" height="50" fill="rgba(255,255,255,0.08)" stroke="#475569" strokeWidth="0.4"/>
              <rect x="-0.5" y={-25 + 50 * (1 - s.level)} width="2" height={50 * s.level} fill={c} opacity="0.7"
                    style={{ transition: "y 0.8s, height 0.8s" }}/>
              {[-20, -10, 0, 10, 20].map(y => (
                <line key={y} x1="3" y1={y} x2="6" y2={y} stroke="#64748b" strokeWidth="0.3"/>
              ))}
            </g>
            
            {/* Pressure relief on top — emits steam during surge */}
            <g transform="translate(12, -45)">
              <rect x="-1.5" y="0" width="3" height="6" fill="url(#metalDark)"/>
              <rect x="-3" y="-2" width="6" height="3" fill="url(#metal)"/>
              {releasingSteam && [0, 0.4, 0.8, 1.2].map((delay, i) => (
                <circle key={i} cx="0" cy="-3" r={2 + i * 0.8} fill="white" opacity="0.4"
                        style={{ animation: `steam-rise 1.4s ease-out infinite`, animationDelay: `${delay}s` }}/>
              ))}
            </g>
            
            {/* Tag plate */}
            <rect x="-12" y="65" width="24" height="9" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.3"/>
            <text y="71" textAnchor="middle" fontSize="6" fill="#cbd5e1" fontFamily="JetBrains Mono">T-101</text>
            
            {/* Level readout */}
            <text x="0" y="-52" textAnchor="middle" fontSize="8" fill={c} fontFamily="JetBrains Mono"
                  style={{ filter: state !== "stopped" ? `drop-shadow(0 0 3px ${c})` : "none" }}>
              {Math.round(s.level * 100)}%
            </text>
          </g>

          {/* ============================================
              [2] CENTRIFUGAL PUMP with detailed impeller
              ============================================ */}
          <g transform="translate(220, 180)" filter="url(#shadow)" 
             style={cavitating ? { animation: "shake 0.08s linear infinite" } : {}}>
            {/* Glow halo when running */}
            {s.rpm > 0 && (
              <circle r="28" fill="none" stroke={c} strokeWidth="1.5" opacity="0.4" filter="url(#glow)"
                      style={cavitating ? { animation: "pulse 0.5s ease-in-out infinite" } : {}}/>
            )}
            
            {/* Mounting flange (outer ring) */}
            <circle r="26" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.5"/>
            {/* Bolts on flange */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
              <circle key={a} cx={23 * Math.cos(a * Math.PI / 180)} cy={23 * Math.sin(a * Math.PI / 180)}
                      r="1.2" fill="#0f172a"/>
            ))}
            
            {/* Volute casing */}
            <circle cx="-1" cy="-1" r="22" fill="url(#volute)" stroke="#475569" strokeWidth="0.4"/>
            
            {/* Specular highlight */}
            <ellipse cx="-9" cy="-12" rx="8" ry="3" fill="white" opacity="0.15"/>
            
            {/* Discharge nozzle (top) */}
            <rect x="-4" y="-30" width="8" height="10" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.4"/>
            <rect x="-6" y="-30" width="12" height="3" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.4"/>
            
            {/* Suction nozzle (left) */}
            <rect x="-30" y="-4" width="10" height="8" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.4"/>
            <rect x="-30" y="-6" width="3" height="12" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.4"/>
            
            {/* Rotating impeller (6 backward-curved blades) */}
            <g style={s.rpm > 0 ? { animation: `spinFast ${spinDur} linear infinite`, transformOrigin: "center" } : {}}>
              {[0, 60, 120, 180, 240, 300].map(a => (
                <path key={a} d="M 4 0 Q 10 -2 16 -4 Q 14 1 8 3 Q 5 2 4 0 Z"
                      fill={c} opacity="0.75" stroke={c} strokeWidth="0.3"
                      transform={`rotate(${a})`}/>
              ))}
              {/* Inner shroud */}
              <circle r="6" fill="url(#metalDark)" stroke="#475569" strokeWidth="0.3"/>
              {/* Hub bolts */}
              {[0, 90, 180, 270].map(a => (
                <circle key={a} cx={3.5 * Math.cos(a * Math.PI / 180)} cy={3.5 * Math.sin(a * Math.PI / 180)}
                        r="0.6" fill="#0f172a"/>
              ))}
              <circle r="1.5" fill="#0f172a"/>
            </g>
            
            {/* Tag plate */}
            <rect x="-12" y="32" width="24" height="9" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.3"/>
            <text y="38" textAnchor="middle" fontSize="6" fill="#cbd5e1" fontFamily="JetBrains Mono">P-101</text>
            
            {/* RPM readout */}
            <text y="-36" textAnchor="middle" fontSize="8" fill={c} fontFamily="JetBrains Mono"
                  style={{ filter: s.rpm > 0 ? `drop-shadow(0 0 3px ${c})` : "none" }}>
              {s.rpm} RPM
            </text>
          </g>

          {/* ============================================
              [3] CONTROL VALVE with handwheel + position
              ============================================ */}
          <g transform="translate(360, 180)" filter="url(#shadow)">
            {/* Body (bowtie wedge) */}
            <path d="M -22 -14 L 22 14 L 22 -14 L -22 14 Z" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.6"/>
            
            {/* Flange faces with bolts */}
            {[-22, 22].map(x => (
              <g key={x}>
                <line x1={x} y1="-15" x2={x} y2="15" stroke="#0f172a" strokeWidth="1.5"/>
                {[-10, -4, 4, 10].map(y => (
                  <circle key={y} cx={x + (x < 0 ? 1.5 : -1.5)} cy={y} r="0.8" fill="#0f172a"/>
                ))}
              </g>
            ))}
            
            {/* Center seat/seal */}
            <circle r="6" fill="url(#volute)" stroke="#475569" strokeWidth="0.4"/>
            <circle r="3.5" fill={c} opacity="0.7"
                    style={s.flow > 0 ? { filter: `drop-shadow(0 0 4px ${c})` } : {}}/>
            
            {/* Stem */}
            <rect x="-2" y="-30" width="4" height="16" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.3"/>
            <rect x="-3" y="-16" width="6" height="3" fill="url(#metalDark)"/>
            
            {/* Bonnet */}
            <rect x="-7" y="-14" width="14" height="4" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.3"/>
            
            {/* Handwheel with rotation tied to flow */}
            <g style={{ transformOrigin: "0 -32px",
                       transform: `rotate(${valveAngle * 4}deg)`,
                       transition: "transform 1.2s cubic-bezier(0.4,0,0.2,1)" }}>
              <circle cx="0" cy="-32" r="8" fill="none" stroke="url(#metal)" strokeWidth="2.5"/>
              <circle cx="0" cy="-32" r="2" fill="url(#metalDark)"/>
              {/* Spokes */}
              {[0, 60, 120].map(a => {
                const rad = (a - 90) * Math.PI / 180;
                return (
                  <line key={a}
                        x1={7 * Math.cos(rad)} y1={-32 + 7 * Math.sin(rad)}
                        x2={-7 * Math.cos(rad)} y2={-32 - 7 * Math.sin(rad)}
                        stroke="url(#metal)" strokeWidth="1.4" strokeLinecap="round"/>
                );
              })}
            </g>
            
            {/* Position indicator arc */}
            <path d="M -14 -44 A 14 14 0 0 1 14 -44" fill="none" stroke="#475569" strokeWidth="0.6"/>
            <text x="-14" y="-46" fontSize="5" fill="#64748b" fontFamily="JetBrains Mono">0</text>
            <text x="14" y="-46" fontSize="5" fill="#64748b" fontFamily="JetBrains Mono" textAnchor="end">100</text>
            {/* Needle */}
            <line x1="0" y1="-44" 
                  x2={10 * Math.sin((s.flow * 90) * Math.PI / 180)} 
                  y2={-44 - 10 * Math.cos((s.flow * 90) * Math.PI / 180)}
                  stroke={c} strokeWidth="1.6" strokeLinecap="round"
                  style={{ transition: "x2 0.8s, y2 0.8s", filter: `drop-shadow(0 0 2px ${c})` }}/>
            
            {/* Tag */}
            <rect x="-12" y="32" width="24" height="9" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.3"/>
            <text y="38" textAnchor="middle" fontSize="6" fill="#cbd5e1" fontFamily="JetBrains Mono">FCV-101</text>
          </g>

          {/* ============================================
              [4] SHELL & TUBE HEAT EXCHANGER
              ============================================ */}
          <g transform="translate(500, 180)" filter="url(#shadow)">
            {/* Saddle supports */}
            <path d="M -32 22 L -36 38 L -22 38 L -22 22 Z" fill="url(#metalDark)" stroke="#0f172a" strokeWidth="0.4"/>
            <path d="M 32 22 L 36 38 L 22 38 L 22 22 Z" fill="url(#metalDark)" stroke="#0f172a" strokeWidth="0.4"/>
            
            {/* Shell body */}
            <rect x="-40" y="-20" width="80" height="40" rx="4" fill="url(#cylinder)" stroke="#0f172a" strokeWidth="0.6"/>
            
            {/* Body specular */}
            <rect x="-36" y="-18" width="72" height="3" fill="white" opacity="0.12"/>
            
            {/* End channels */}
            <rect x="-46" y="-16" width="8" height="32" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.4"/>
            <rect x="38" y="-16" width="8" height="32" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.4"/>
            {/* Channel bolts */}
            {[-46, 38].map(x => [-12, -4, 4, 12].map(y => (
              <circle key={`${x},${y}`} cx={x + 4} cy={y} r="0.7" fill="#0f172a"/>
            )))}
            
            {/* Tube sheet (visible tubes through gap) */}
            {[-12, -6, 0, 6, 12].map(y => (
              <line key={y} x1="-38" y1={y} x2="38" y2={y} stroke={c} strokeWidth="0.5" opacity={s.flow > 0 ? 0.6 : 0.2}/>
            ))}
            
            {/* Top nozzle (inlet) */}
            <rect x="-20" y="-26" width="8" height="8" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.4"/>
            <rect x="-22" y="-26" width="12" height="3" fill="url(#metal)"/>
            
            {/* Bottom nozzle (outlet) */}
            <rect x="12" y="20" width="8" height="6" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.4"/>
            <rect x="10" y="25" width="12" height="3" fill="url(#metal)"/>
            
            {/* Tag */}
            <rect x="-15" y="44" width="30" height="9" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.3"/>
            <text y="50" textAnchor="middle" fontSize="6" fill="#cbd5e1" fontFamily="JetBrains Mono">E-201</text>
          </g>

          {/* ============================================
              [5] FIELD INSTRUMENT (DCS-style)
              ============================================ */}
          <g transform="translate(50, 80)" filter="url(#shadow)">
            <line x1="0" y1="22" x2="0" y2="92" stroke="#475569" strokeWidth="0.6" strokeDasharray="2 2"/>
            
            {/* Bezel */}
            <circle r="18" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.6"/>
            <circle r="18" fill="none" stroke="#0f172a" strokeWidth="0.5"/>
            
            {/* Display inset */}
            <circle r="14" fill="#0f172a" stroke="#475569" strokeWidth="0.4"/>
            <circle r="14" fill="none" stroke="black" strokeWidth="0.4" filter="url(#innerShadow)"/>
            
            {/* Mounting screws */}
            {[45, 135, 225, 315].map(a => (
              <circle key={a} cx={16 * Math.cos(a * Math.PI / 180)} cy={16 * Math.sin(a * Math.PI / 180)}
                      r="1" fill="#0f172a"/>
            ))}
            
            {/* Gauge needle */}
            <g style={cavitating ? { animation: "needle-jitter 0.15s linear infinite" } : {}}>
              <line x1="0" y1="0"
                    x2={9 * Math.cos((s.pressure * 240 - 210) * Math.PI / 180)}
                    y2={9 * Math.sin((s.pressure * 240 - 210) * Math.PI / 180)}
                    stroke={c} strokeWidth="1.4" strokeLinecap="round"
                    style={{ transition: "x2 0.6s, y2 0.6s", filter: `drop-shadow(0 0 2px ${c})` }}/>
              <circle r="1.5" fill={c}/>
            </g>
            
            {/* Tick marks */}
            {[-210, -150, -90, -30, 30].map(a => {
              const rad = a * Math.PI / 180;
              return (
                <line key={a} x1={11 * Math.cos(rad)} y1={11 * Math.sin(rad)}
                      x2={13 * Math.cos(rad)} y2={13 * Math.sin(rad)}
                      stroke="#64748b" strokeWidth="0.4"/>
              );
            })}
            
            {/* Status LED */}
            <circle cx="11" cy="-11" r="1.5" fill={c}
                    style={s.rpm > 0 ? { animation: "pulse 1.2s ease-in-out infinite", filter: `drop-shadow(0 0 3px ${c})` } : { opacity: 0.3 }}/>
            
            <text y="-24" textAnchor="middle" fontSize="6" fill="#94a3b8" fontFamily="JetBrains Mono">PI-101</text>
            <text y="34" textAnchor="middle" fontSize="7" fill={c} fontFamily="JetBrains Mono">
              {(s.pressure * 10).toFixed(1)} bar
            </text>
          </g>
        </svg>
      </div>

      <footer className="border-t border-slate-800/60 px-6 py-3 grid grid-cols-5 gap-3 font-mono text-[11px]">
        <Param label="state" value={s.label} color={c}/>
        <Param label="rpm" value={s.rpm}/>
        <Param label="level" value={`${Math.round(s.level * 100)}%`}/>
        <Param label="flow" value={s.flow.toFixed(2)}/>
        <Param label="pressure" value={`${(s.pressure * 10).toFixed(1)} bar`}/>
      </footer>
    </div>
  );
}

const Param = ({ label, value, color }) => (
  <div className="border border-slate-800/60 rounded p-2 bg-slate-950/40">
    <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-0.5">{label}</div>
    <div className="text-sm" style={{ color: color || "#cbd5e1" }}>{value}</div>
  </div>
);
