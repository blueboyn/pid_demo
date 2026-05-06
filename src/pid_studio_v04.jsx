import React, { useState, useEffect, useRef } from "react";
import { Edit3, Eye, Plus, Trash2, Code2, Save, X, Move, Layers, GitBranch } from "lucide-react";

// ============================================================
// State machine
// ============================================================
const STATES = {
  normal:    { label: "정상 운전",  color: "#22d3ee", rpm: 1750, level: 0.7,  flow: 1.0, pressure: 0.6 },
  startup:   { label: "기동 중",    color: "#a3e635", rpm: 800,  level: 0.5,  flow: 0.4, pressure: 0.3 },
  cavitation:{ label: "캐비테이션", color: "#fb923c", rpm: 1850, level: 0.3,  flow: 0.6, pressure: 0.5 },
  surge:     { label: "서지",       color: "#f43f5e", rpm: 2100, level: 0.92, flow: 0.2, pressure: 0.95 },
  stopped:   { label: "정지",       color: "#64748b", rpm: 0,    level: 0.7,  flow: 0,   pressure: 0.1 },
};

const SYMBOLS = {
  tank: { name: "탱크", w: 80, h: 130 },
  pump: { name: "펌프", w: 70, h: 80 },
  valve: { name: "밸브", w: 60, h: 80 },
  exchanger: { name: "열교환기", w: 110, h: 80 },
  instrument: { name: "계장", w: 50, h: 60 },
};

const DEFAULT_SVG = {
  tank: `<path d="M -22 38 L -28 60 L 28 60 L 22 38 Z" fill="url(#metalDark)" stroke="#0f172a" stroke-width="0.5"/>
<ellipse cx="0" cy="38" rx="26" ry="7" fill="url(#dome)" stroke="#0f172a" stroke-width="0.5"/>
<rect x="-26" y="-38" width="52" height="76" fill="url(#cylinder)" stroke="#0f172a" stroke-width="0.5"/>
<rect x="-20" y="-35" width="3" height="70" fill="white" opacity="0.08"/>
<ellipse cx="0" cy="-38" rx="26" ry="7" fill="url(#dome)" stroke="#0f172a" stroke-width="0.5"/>
<ellipse cx="-9" cy="-40" rx="8" ry="2" fill="white" opacity="0.2"/>
<circle cx="0" cy="-38" r="4" fill="url(#metal)" stroke="#0f172a" stroke-width="0.3"/>`,

  pump: `<circle r="26" fill="url(#metal)" stroke="#0f172a" stroke-width="0.5"/>
<circle r="22" fill="url(#volute)" stroke="#475569" stroke-width="0.4" cx="-1" cy="-1"/>
<ellipse cx="-9" cy="-12" rx="8" ry="3" fill="white" opacity="0.15"/>
<rect x="-4" y="-30" width="8" height="10" fill="url(#metal)" stroke="#0f172a" stroke-width="0.4"/>
<rect x="-6" y="-30" width="12" height="3" fill="url(#metal)" stroke="#0f172a" stroke-width="0.4"/>
<rect x="-30" y="-4" width="10" height="8" fill="url(#metal)" stroke="#0f172a" stroke-width="0.4"/>
<rect x="-30" y="-6" width="3" height="12" fill="url(#metal)" stroke="#0f172a" stroke-width="0.4"/>`,

  valve: `<path d="M -22 -14 L 22 14 L 22 -14 L -22 14 Z" fill="url(#metal)" stroke="#0f172a" stroke-width="0.6"/>
<rect x="-2" y="-30" width="4" height="16" fill="url(#metal)" stroke="#0f172a" stroke-width="0.3"/>
<rect x="-7" y="-14" width="14" height="4" fill="url(#metal)" stroke="#0f172a" stroke-width="0.3"/>`,

  exchanger: `<path d="M -32 22 L -36 38 L -22 38 L -22 22 Z" fill="url(#metalDark)" stroke="#0f172a" stroke-width="0.4"/>
<path d="M 32 22 L 36 38 L 22 38 L 22 22 Z" fill="url(#metalDark)" stroke="#0f172a" stroke-width="0.4"/>
<rect x="-40" y="-20" width="80" height="40" rx="4" fill="url(#cylinder)" stroke="#0f172a" stroke-width="0.6"/>
<rect x="-36" y="-18" width="72" height="3" fill="white" opacity="0.12"/>
<rect x="-46" y="-16" width="8" height="32" fill="url(#metal)" stroke="#0f172a" stroke-width="0.4"/>
<rect x="38" y="-16" width="8" height="32" fill="url(#metal)" stroke="#0f172a" stroke-width="0.4"/>`,

  instrument: `<circle r="18" fill="url(#metal)" stroke="#0f172a" stroke-width="0.6"/>
<circle r="14" fill="#0f172a" stroke="#475569" stroke-width="0.4"/>`,
};

// ============================================================
// Animated overlays per type
// ============================================================
const AnimatedOverlay = ({ type, s, c, id }) => {
  switch (type) {
    case "tank": {
      const fillY = -28 + 56 * (1 - s.level);
      const wave1 = `M -26 ${fillY} Q -13 ${fillY-1.5} 0 ${fillY} Q 13 ${fillY+1.5} 26 ${fillY}`;
      const wave2 = `M -26 ${fillY} Q -13 ${fillY+1.5} 0 ${fillY} Q 13 ${fillY-1.5} 26 ${fillY}`;
      const releasingSteam = s.pressure > 0.85;
      return (
        <>
          <clipPath id={`tankClip-${id}`}>
            <rect x="-26" y="-38" width="52" height="76"/>
          </clipPath>
          <g clipPath={`url(#tankClip-${id})`}>
            <rect x="-26" y={fillY} width="52" height={38 - fillY} fill={c} fillOpacity="0.5"/>
            <path fill="none" stroke={c} strokeOpacity="0.95" strokeWidth="1.2">
              <animate attributeName="d" values={`${wave1};${wave2};${wave1}`} dur="3s" repeatCount="indefinite"/>
            </path>
          </g>
          <g transform="translate(28, 0)">
            <rect x="-1" y="-25" width="3" height="50" fill="rgba(255,255,255,0.08)" stroke="#475569" strokeWidth="0.4"/>
            <rect x="-0.5" y={-25 + 50 * (1 - s.level)} width="2" height={50 * s.level} fill={c} opacity="0.7"/>
          </g>
          <g transform="translate(12, -45)">
            <rect x="-1.5" y="0" width="3" height="6" fill="url(#metalDark)"/>
            <rect x="-3" y="-2" width="6" height="3" fill="url(#metal)"/>
            {releasingSteam && [0, 0.4, 0.8, 1.2].map((delay, i) => (
              <circle key={i} cx="0" cy="-3" r={2 + i * 0.6} fill="white">
                <animate attributeName="cy" values="-3;-30" dur="1.4s" begin={`${delay}s`} repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0;0.6;0" dur="1.4s" begin={`${delay}s`} repeatCount="indefinite"/>
              </circle>
            ))}
          </g>
          <text x="0" y="-52" textAnchor="middle" fontSize="8" fill={c} fontFamily="JetBrains Mono"
                style={{ filter: s.rpm > 0 ? `drop-shadow(0 0 3px ${c})` : "none" }}>
            {Math.round(s.level * 100)}%
          </text>
        </>
      );
    }
    case "pump": {
      const spinDur = s.rpm > 0 ? Math.max(0.15, 60 / s.rpm * 8) : 0;
      const pulsing = s.pressure > 0.85;
      return (
        <>
          {s.rpm > 0 && (
            <circle r="28" fill="none" stroke={c} strokeWidth="1.5" opacity="0.4" filter="url(#glow)">
              {pulsing && <animate attributeName="opacity" values="0.2;0.6;0.2" dur="0.5s" repeatCount="indefinite"/>}
            </circle>
          )}
          <g>
            {s.rpm > 0 && (
              <animateTransform attributeName="transform" type="rotate"
                                from="0 0 0" to="360 0 0" dur={`${spinDur}s`} repeatCount="indefinite"/>
            )}
            {[0, 120, 240].map(a => (
              <path key={a}
                    d="M 4 -1.5 Q 11 -2.5 13 0 Q 11 2.5 4 1.5 Z"
                    fill="url(#metalDark)" stroke="#475569" strokeWidth="0.4"
                    transform={`rotate(${a})`}/>
            ))}
            <circle r="4" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.3"/>
            {[0, 90, 180, 270].map(a => (
              <circle key={a}
                      cx={2.5 * Math.cos(a * Math.PI / 180)}
                      cy={2.5 * Math.sin(a * Math.PI / 180)}
                      r="0.5" fill="#0f172a"/>
            ))}
            <circle r="0.8" fill="#0f172a"/>
          </g>
          <text y="-36" textAnchor="middle" fontSize="8" fill={c} fontFamily="JetBrains Mono"
                style={{ filter: s.rpm > 0 ? `drop-shadow(0 0 3px ${c})` : "none" }}>
            {s.rpm} RPM
          </text>
        </>
      );
    }
    case "valve": {
      const valveAngle = s.flow > 0 ? -90 + s.flow * 90 : -90;
      return (
        <>
          <circle r="6" fill="url(#volute)" stroke="#475569" strokeWidth="0.4"/>
          <circle r="3.5" fill={c} opacity="0.7"
                  style={s.flow > 0 ? { filter: `drop-shadow(0 0 4px ${c})` } : {}}/>
          <g transform={`translate(0, -32) rotate(${valveAngle * 4})`}>
            <circle r="8" fill="none" stroke="url(#metal)" strokeWidth="2.5"/>
            <circle r="2" fill="url(#metalDark)"/>
            {[0, 60, 120].map(a => {
              const rad = (a - 90) * Math.PI / 180;
              return (
                <line key={a}
                      x1={7 * Math.cos(rad)} y1={7 * Math.sin(rad)}
                      x2={-7 * Math.cos(rad)} y2={-7 * Math.sin(rad)}
                      stroke="url(#metal)" strokeWidth="1.4" strokeLinecap="round"/>
              );
            })}
          </g>
          <path d="M -14 -44 A 14 14 0 0 1 14 -44" fill="none" stroke="#475569" strokeWidth="0.6"/>
          <line x1="0" y1="-44"
                x2={10 * Math.sin((s.flow * 90) * Math.PI / 180)}
                y2={-44 - 10 * Math.cos((s.flow * 90) * Math.PI / 180)}
                stroke={c} strokeWidth="1.6" strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 2px ${c})` }}/>
        </>
      );
    }
    case "exchanger": {
      return (
        <>
          {[-12, -6, 0, 6, 12].map(y => (
            <line key={y} x1="-38" y1={y} x2="38" y2={y} stroke={c} strokeWidth="0.5"
                  opacity={s.flow > 0 ? 0.6 : 0.2}/>
          ))}
          <rect x="-20" y="-26" width="8" height="8" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.4"/>
          <rect x="12" y="20" width="8" height="6" fill="url(#metal)" stroke="#0f172a" strokeWidth="0.4"/>
        </>
      );
    }
    case "instrument": {
      const cavitating = s.pressure < 0.4 && s.rpm > 1500;
      return (
        <>
          <g>
            {cavitating && (
              <animateTransform attributeName="transform" type="rotate"
                                values="-1;1;-1" dur="0.15s" repeatCount="indefinite"/>
            )}
            <line x1="0" y1="0"
                  x2={9 * Math.cos((s.pressure * 240 - 210) * Math.PI / 180)}
                  y2={9 * Math.sin((s.pressure * 240 - 210) * Math.PI / 180)}
                  stroke={c} strokeWidth="1.4" strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 2px ${c})` }}/>
            <circle r="1.5" fill={c}/>
          </g>
          {[-210, -150, -90, -30, 30].map(a => {
            const rad = a * Math.PI / 180;
            return (
              <line key={a}
                    x1={11 * Math.cos(rad)} y1={11 * Math.sin(rad)}
                    x2={13 * Math.cos(rad)} y2={13 * Math.sin(rad)}
                    stroke="#64748b" strokeWidth="0.4"/>
            );
          })}
          <circle cx="11" cy="-11" r="1.5" fill={c} opacity={s.rpm > 0 ? 1 : 0.3}>
            {s.rpm > 0 && <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite"/>}
          </circle>
          <text y="34" textAnchor="middle" fontSize="7" fill={c} fontFamily="JetBrains Mono">
            {(s.pressure * 10).toFixed(1)} bar
          </text>
        </>
      );
    }
    default: return null;
  }
};

// ============================================================
// Pipe — rich rendering with rotated local coordinate system
// ============================================================
const Pipe = ({ pipe, s, c, mode, selected, flowDur, onPipeMouseDown, onEndpointDown }) => {
  const dx = pipe.x2 - pipe.x1;
  const dy = pipe.y2 - pipe.y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 1) return null;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const bandCount = Math.ceil(length / 40) + 2;

  return (
    <g>
      <g transform={`translate(${pipe.x1}, ${pipe.y1}) rotate(${angle})`}>
        <line x1="0" y1="0" x2={length} y2="0" stroke="#0f172a" strokeWidth="10" strokeLinecap="round"/>
        <line x1="0" y1="0" x2={length} y2="0" stroke="url(#metal)" strokeWidth="8" strokeLinecap="round"/>
        <line x1="2" y1="-1.5" x2={length - 2} y2="-1.5" stroke="#94a3b8" strokeWidth="0.6" opacity="0.6"/>
        <circle cx="8" cy="0" r="3.5" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
        <circle cx={length - 8} cy="0" r="3.5" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
        {mode === "viz" && s.flow > 0 && (
          <g>
            <animateTransform attributeName="transform" type="translate"
                              from="-40 0" to="0 0" dur={flowDur} repeatCount="indefinite"/>
            <clipPath id={`pipeClip-${pipe.id}`}>
              <rect x="0" y="-4" width={length} height="8"/>
            </clipPath>
            <g clipPath={`url(#pipeClip-${pipe.id})`}>
              {Array.from({ length: bandCount }).map((_, j) => (
                <rect key={j} x={j * 40 - 40} y="-3" width="40" height="6" fill="url(#flowFluid)"/>
              ))}
            </g>
          </g>
        )}
      </g>

      <line x1={pipe.x1} y1={pipe.y1} x2={pipe.x2} y2={pipe.y2}
            stroke="transparent" strokeWidth="16" strokeLinecap="round"
            style={{ cursor: mode === "edit" ? "pointer" : "default" }}
            onMouseDown={mode === "edit" ? (e) => onPipeMouseDown(e, pipe.id) : undefined}/>

      {selected && (
        <line x1={pipe.x1} y1={pipe.y1} x2={pipe.x2} y2={pipe.y2}
              stroke="#f59e0b" strokeWidth="14" strokeLinecap="round"
              fill="none" opacity="0.25" pointerEvents="none"/>
      )}

      {selected && mode === "edit" && (
        <>
          <circle cx={pipe.x1} cy={pipe.y1} r="6" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5"
                  style={{ cursor: "move" }}
                  onMouseDown={(e) => onEndpointDown(e, pipe.id, "start")}/>
          <circle cx={pipe.x2} cy={pipe.y2} r="6" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5"
                  style={{ cursor: "move" }}
                  onMouseDown={(e) => onEndpointDown(e, pipe.id, "end")}/>
        </>
      )}
    </g>
  );
};

// ============================================================
// Symbol node
// ============================================================
const SymbolNode = ({ sym, s, c, mode, selected, onMouseDown }) => {
  const dim = SYMBOLS[sym.type] || SYMBOLS.pump;
  const baseSvg = sym.customSvg ?? DEFAULT_SVG[sym.type] ?? "";

  return (
    <g transform={`translate(${sym.x}, ${sym.y}) scale(${sym.scale || 1})`}
       style={{ cursor: mode === "edit" ? "move" : "default" }}
       onMouseDown={mode === "edit" ? (e) => onMouseDown(e, sym.id) : undefined}>
      <g filter="url(#shadow)" dangerouslySetInnerHTML={{ __html: baseSvg }} />
      <AnimatedOverlay type={sym.type} s={s} c={c} id={sym.id}/>
      <rect x="-14" y={dim.h / 2 - 5} width="28" height="10" rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.3"/>
      <text y={dim.h / 2 + 1} textAnchor="middle" fontSize="6.5" fill="#cbd5e1" fontFamily="JetBrains Mono">
        {sym.tag}
      </text>
      {mode === "edit" && selected && (
        <>
          <rect x={-dim.w / 2 - 4} y={-dim.h / 2 - 4} width={dim.w + 8} height={dim.h + 8}
                fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" pointerEvents="none"/>
          <rect x={dim.w / 2 + 1} y={dim.h / 2 + 1} width="6" height="6"
                fill="#f59e0b" stroke="#0f172a" strokeWidth="0.5"
                style={{ cursor: "nwse-resize" }}
                onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, sym.id, "resize"); }}/>
        </>
      )}
    </g>
  );
};

// ============================================================
// Main App
// ============================================================
export default function PIDStudio() {
  const [mode, setMode] = useState("viz");
  const [state, setState] = useState("normal");
  const [symbols, setSymbols] = useState([
    { id: 1, type: "tank",       x: 110, y: 220, scale: 1, tag: "T-101" },
    { id: 2, type: "pump",       x: 280, y: 220, scale: 1, tag: "P-101" },
    { id: 3, type: "valve",      x: 410, y: 220, scale: 1, tag: "FCV-101" },
    { id: 4, type: "exchanger",  x: 570, y: 220, scale: 1, tag: "E-201" },
    { id: 5, type: "instrument", x: 110, y: 100, scale: 1, tag: "PI-101" },
  ]);
  const [pipes, setPipes] = useState([
    { id: 101, x1: 138, y1: 220, x2: 254, y2: 220 },
    { id: 102, x1: 306, y1: 220, x2: 388, y2: 220 },
    { id: 103, x1: 432, y1: 220, x2: 524, y2: 220 },
    { id: 104, x1: 110, y1: 122, x2: 110, y2: 184 },
  ]);
  const [selection, setSelection] = useState(null);
  const [editingSvg, setEditingSvg] = useState(null);
  const [drag, setDrag] = useState(null);
  const [drawingPipe, setDrawingPipe] = useState(null);
  const [previewEnd, setPreviewEnd] = useState(null);
  const svgRef = useRef(null);
  const nextSymbolId = useRef(200);
  const nextPipeId = useRef(1000);

  const s = STATES[state];
  const c = s.color;
  const flowDur = s.flow > 0 ? `${1.4 / s.flow}s` : "0s";

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setDrawingPipe(null); setPreviewEnd(null); }
      if ((e.key === "Delete" || e.key === "Backspace") && selection && !editingSvg) deleteSelected();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [selection, editingSvg]);

  const clientToSvg = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm.inverse()) : { x: 0, y: 0 };
  };

  const onSymbolMouseDown = (e, id, kind = "move") => {
    e.stopPropagation();
    if (drawingPipe) return;
    setSelection({ type: "symbol", id });
    const sym = symbols.find(x => x.id === id);
    if (!sym) return;
    const pt = clientToSvg(e);
    setDrag({ kind, id, startX: pt.x, startY: pt.y, origX: sym.x, origY: sym.y, origScale: sym.scale || 1 });
  };

  const onPipeMouseDown = (e, id) => {
    e.stopPropagation();
    if (drawingPipe) return;
    setSelection({ type: "pipe", id });
  };

  const onEndpointDown = (e, id, end) => {
    e.stopPropagation();
    setSelection({ type: "pipe", id });
    const pipe = pipes.find(p => p.id === id);
    if (!pipe) return;
    const pt = clientToSvg(e);
    setDrag({ kind: "pipe-endpoint", id, end, startX: pt.x, startY: pt.y,
              orig: { x1: pipe.x1, y1: pipe.y1, x2: pipe.x2, y2: pipe.y2 } });
  };

  const onCanvasMouseDown = (e) => {
    if (mode !== "edit") return;
    if (drawingPipe === "armed") {
      const pt = clientToSvg(e);
      setDrawingPipe({ x1: pt.x, y1: pt.y });
      setPreviewEnd({ x: pt.x, y: pt.y });
      return;
    }
    if (drawingPipe && typeof drawingPipe === "object") {
      const pt = clientToSvg(e);
      const newPipe = { id: nextPipeId.current++, x1: drawingPipe.x1, y1: drawingPipe.y1, x2: pt.x, y2: pt.y };
      setPipes(prev => [...prev, newPipe]);
      setDrawingPipe(null);
      setPreviewEnd(null);
      setSelection({ type: "pipe", id: newPipe.id });
      return;
    }
    setSelection(null);
  };

  const onCanvasMouseMove = (e) => {
    if (drag) {
      const pt = clientToSvg(e);
      const dx = pt.x - drag.startX, dy = pt.y - drag.startY;
      if (drag.kind === "move") {
        setSymbols(prev => prev.map(sy => sy.id === drag.id
          ? { ...sy, x: drag.origX + dx, y: drag.origY + dy } : sy));
      } else if (drag.kind === "resize") {
        setSymbols(prev => prev.map(sy => {
          if (sy.id !== drag.id) return sy;
          const dim = SYMBOLS[sy.type] || SYMBOLS.pump;
          const factor = 1 + (dx + dy) / dim.w;
          return { ...sy, scale: Math.max(0.3, Math.min(3, drag.origScale * factor)) };
        }));
      } else if (drag.kind === "pipe-endpoint") {
        setPipes(prev => prev.map(p => {
          if (p.id !== drag.id) return p;
          if (drag.end === "start") return { ...p, x1: drag.orig.x1 + dx, y1: drag.orig.y1 + dy };
          return { ...p, x2: drag.orig.x2 + dx, y2: drag.orig.y2 + dy };
        }));
      }
      return;
    }
    if (drawingPipe && typeof drawingPipe === "object") {
      const pt = clientToSvg(e);
      setPreviewEnd({ x: pt.x, y: pt.y });
    }
  };

  const onCanvasMouseUp = () => setDrag(null);

  const addSymbol = (type) => {
    const id = nextSymbolId.current++;
    setSymbols(prev => [...prev, { id, type, x: 350, y: 150, scale: 1, tag: `${type.toUpperCase()}-${id}` }]);
    setSelection({ type: "symbol", id });
  };

  const startDrawingPipe = () => { setSelection(null); setDrawingPipe("armed"); setPreviewEnd(null); };
  const cancelDrawingPipe = () => { setDrawingPipe(null); setPreviewEnd(null); };

  const deleteSelected = () => {
    if (!selection) return;
    if (selection.type === "symbol") setSymbols(prev => prev.filter(sy => sy.id !== selection.id));
    else setPipes(prev => prev.filter(p => p.id !== selection.id));
    setSelection(null);
  };

  const updateSelectedSymbol = (patch) => {
    if (selection?.type !== "symbol") return;
    setSymbols(prev => prev.map(sy => sy.id === selection.id ? { ...sy, ...patch } : sy));
  };

  const updateSelectedPipe = (patch) => {
    if (selection?.type !== "pipe") return;
    setPipes(prev => prev.map(p => p.id === selection.id ? { ...p, ...patch } : p));
  };

  const saveCustomSvg = (svgText) => {
    if (selection?.type === "symbol") updateSelectedSymbol({ customSvg: svgText });
    setEditingSvg(null);
  };

  const selectedSymbol = selection?.type === "symbol" ? symbols.find(x => x.id === selection.id) : null;
  const selectedPipe = selection?.type === "pipe" ? pipes.find(p => p.id === selection.id) : null;

  return (
    <div className="w-full h-screen flex flex-col text-slate-200" style={{
      fontFamily: '"DM Sans", system-ui, sans-serif',
      background: "radial-gradient(ellipse at top, #1e293b 0%, #0a0e1a 60%, #020617 100%)",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <header className="border-b border-slate-800/60 px-6 py-3 flex items-center gap-4">
        <div>
          <div style={{ fontFamily: '"Instrument Serif", serif' }} className="text-xl italic text-slate-100 leading-none">
            P&ID Studio <span className="text-amber-400">·</span> v0.4
          </div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mt-1 font-mono">
            edit · visualize · operate
          </div>
        </div>
        <div className="ml-auto flex border border-slate-700 rounded-md overflow-hidden">
          <button onClick={() => { setMode("edit"); setSelection(null); }}
                  className={`px-4 py-2 flex items-center gap-2 text-sm transition-colors ${
                    mode === "edit" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                  }`}>
            <Edit3 size={14}/> 수정 모드
          </button>
          <button onClick={() => { setMode("viz"); setSelection(null); cancelDrawingPipe(); }}
                  className={`px-4 py-2 flex items-center gap-2 text-sm transition-colors ${
                    mode === "viz" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                  }`}>
            <Eye size={14}/> 시각화 모드
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-slate-800/60 bg-slate-950/40 p-4 overflow-y-auto flex flex-col gap-4">
          {mode === "viz" ? (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">의미적 상태</div>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(STATES).map(([key, v]) => (
                    <button key={key} onClick={() => setState(key)}
                            className={`px-3 py-2 rounded-md text-sm font-mono border transition-all flex items-center justify-between ${
                              state === key ? "border-transparent text-slate-950" : "border-slate-700 text-slate-400 hover:border-slate-500"
                            }`}
                            style={state === key ? { background: v.color } : {}}>
                      <span>{v.label}</span>
                      <span className="w-2 h-2 rounded-full" style={{ background: v.color }}/>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/60">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">파라미터</div>
                <div className="space-y-1.5 font-mono text-xs">
                  <Row label="rpm" value={s.rpm}/>
                  <Row label="level" value={`${Math.round(s.level * 100)}%`}/>
                  <Row label="flow" value={s.flow.toFixed(2)}/>
                  <Row label="pressure" value={`${(s.pressure * 10).toFixed(1)} bar`} color={c}/>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-1.5">
                  <Plus size={11}/> 심볼 추가
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(SYMBOLS).map(([type, def]) => (
                    <button key={type} onClick={() => addSymbol(type)}
                            disabled={!!drawingPipe}
                            className="px-2 py-1.5 text-xs border border-slate-700 rounded hover:border-amber-500/60 hover:bg-amber-500/5 text-slate-300 disabled:opacity-30">
                      {def.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button onClick={drawingPipe ? cancelDrawingPipe : startDrawingPipe}
                        className={`w-full px-3 py-2 rounded-md text-sm flex items-center justify-center gap-2 border transition-all ${
                          drawingPipe
                            ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                            : "border-slate-700 hover:border-amber-500/60 text-slate-300"
                        }`}>
                  <GitBranch size={13}/>
                  {drawingPipe ? "그리기 취소 (ESC)" : "파이프 추가"}
                </button>
                {drawingPipe && (
                  <div className="mt-2 text-[10px] text-amber-400 font-mono leading-relaxed">
                    {drawingPipe === "armed"
                      ? "캔버스에서 시작점 클릭"
                      : "끝점을 클릭하여 완성"}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/60">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-1.5">
                  <Layers size={11}/> 객체 ({symbols.length} 심볼 · {pipes.length} 배관)
                </div>
                <div className="space-y-0.5 max-h-72 overflow-y-auto">
                  {symbols.map(sy => (
                    <button key={`s-${sy.id}`} onClick={() => setSelection({ type: "symbol", id: sy.id })}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono flex items-center justify-between ${
                              selection?.type === "symbol" && selection.id === sy.id
                                ? "bg-amber-500/10 border border-amber-500/40"
                                : "border border-transparent hover:bg-slate-900/60"
                            }`}>
                      <span className="text-slate-200">{sy.tag}</span>
                      <span className="text-slate-500 text-[10px]">{SYMBOLS[sy.type]?.name}</span>
                    </button>
                  ))}
                  {pipes.map(p => (
                    <button key={`p-${p.id}`} onClick={() => setSelection({ type: "pipe", id: p.id })}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono flex items-center justify-between ${
                              selection?.type === "pipe" && selection.id === p.id
                                ? "bg-amber-500/10 border border-amber-500/40"
                                : "border border-transparent hover:bg-slate-900/60"
                            }`}>
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <GitBranch size={10}/> 배관 #{p.id}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {Math.round(Math.sqrt((p.x2-p.x1)**2 + (p.y2-p.y1)**2))}u
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>

        <main className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none"
               style={{
                 backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
                 backgroundSize: '32px 32px',
               }}/>

          <svg ref={svgRef} viewBox="0 0 700 360" className="w-full h-full"
               style={{ cursor: drawingPipe ? "crosshair" : "default" }}
               onMouseMove={onCanvasMouseMove}
               onMouseUp={onCanvasMouseUp}
               onMouseDown={onCanvasMouseDown}>
            <defs>
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
                <stop offset="50%" stopColor="#64748b"/>
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
              <linearGradient id="flowFluid" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={c} stopOpacity="0"/>
                <stop offset="35%" stopColor={c} stopOpacity="0.9"/>
                <stop offset="65%" stopColor={c} stopOpacity="0.9"/>
                <stop offset="100%" stopColor={c} stopOpacity="0"/>
              </linearGradient>
            </defs>

            {pipes.map(p => (
              <Pipe key={p.id} pipe={p} s={s} c={c} mode={mode} flowDur={flowDur}
                    selected={selection?.type === "pipe" && selection.id === p.id}
                    onPipeMouseDown={onPipeMouseDown}
                    onEndpointDown={onEndpointDown}/>
            ))}

            {drawingPipe && typeof drawingPipe === "object" && previewEnd && (
              <>
                <line x1={drawingPipe.x1} y1={drawingPipe.y1}
                      x2={previewEnd.x} y2={previewEnd.y}
                      stroke="#f59e0b" strokeWidth="3" strokeDasharray="5 4" opacity="0.7"
                      pointerEvents="none"/>
                <circle cx={drawingPipe.x1} cy={drawingPipe.y1} r="5" fill="#f59e0b" pointerEvents="none"/>
                <circle cx={previewEnd.x} cy={previewEnd.y} r="4" fill="none" stroke="#f59e0b" strokeWidth="1.5" pointerEvents="none"/>
              </>
            )}

            {symbols.map(sym => (
              <SymbolNode key={sym.id} sym={sym} s={s} c={c} mode={mode}
                          selected={selection?.type === "symbol" && selection.id === sym.id}
                          onMouseDown={onSymbolMouseDown}/>
            ))}
          </svg>

          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur rounded-md border border-slate-800 font-mono text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full ${mode === "edit" ? "bg-amber-400" : "bg-cyan-400 animate-pulse"}`}/>
            <span className="text-slate-300">{mode === "edit" ? "EDIT MODE" : "VISUALIZATION"}</span>
            {drawingPipe && <span className="text-amber-400 ml-2">· 파이프 그리는 중</span>}
          </div>
        </main>

        {mode === "edit" && (
          <aside className="w-72 border-l border-slate-800/60 bg-slate-950/40 p-4 overflow-y-auto">
            {selectedSymbol ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">선택된 심볼</div>
                    <div className="text-lg font-mono text-amber-400">{selectedSymbol.tag}</div>
                  </div>
                  <button onClick={deleteSelected}
                          className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30">
                    <Trash2 size={14}/>
                  </button>
                </div>
                <Field label="태그" value={selectedSymbol.tag} onChange={v => updateSelectedSymbol({ tag: v })}/>
                <Field label="타입" value={selectedSymbol.type} type="select"
                       options={Object.keys(SYMBOLS)}
                       onChange={v => updateSelectedSymbol({ type: v, customSvg: undefined })}/>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="X" value={Math.round(selectedSymbol.x)} type="number"
                         onChange={v => updateSelectedSymbol({ x: parseFloat(v) || 0 })}/>
                  <Field label="Y" value={Math.round(selectedSymbol.y)} type="number"
                         onChange={v => updateSelectedSymbol({ y: parseFloat(v) || 0 })}/>
                </div>
                <Field label="크기 (scale)" value={(selectedSymbol.scale || 1).toFixed(2)} type="number"
                       step="0.1" onChange={v => updateSelectedSymbol({ scale: parseFloat(v) || 1 })}/>
                <button onClick={() => setEditingSvg(selectedSymbol.customSvg ?? DEFAULT_SVG[selectedSymbol.type] ?? "")}
                        className="mt-4 w-full px-3 py-2 rounded-md border border-slate-700 hover:border-amber-500/60 text-sm flex items-center justify-center gap-2 text-slate-300">
                  <Code2 size={13}/> SVG 직접 편집
                </button>
                {selectedSymbol.customSvg && (
                  <button onClick={() => updateSelectedSymbol({ customSvg: undefined })}
                          className="mt-2 w-full px-3 py-1.5 rounded-md border border-slate-800 text-xs text-slate-500 hover:text-slate-300">
                    기본 SVG로 복원
                  </button>
                )}
              </>
            ) : selectedPipe ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">선택된 배관</div>
                    <div className="text-lg font-mono text-amber-400 flex items-center gap-2">
                      <GitBranch size={16}/> #{selectedPipe.id}
                    </div>
                  </div>
                  <button onClick={deleteSelected}
                          className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30">
                    <Trash2 size={14}/>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="X1" value={Math.round(selectedPipe.x1)} type="number"
                         onChange={v => updateSelectedPipe({ x1: parseFloat(v) || 0 })}/>
                  <Field label="Y1" value={Math.round(selectedPipe.y1)} type="number"
                         onChange={v => updateSelectedPipe({ y1: parseFloat(v) || 0 })}/>
                  <Field label="X2" value={Math.round(selectedPipe.x2)} type="number"
                         onChange={v => updateSelectedPipe({ x2: parseFloat(v) || 0 })}/>
                  <Field label="Y2" value={Math.round(selectedPipe.y2)} type="number"
                         onChange={v => updateSelectedPipe({ y2: parseFloat(v) || 0 })}/>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-1.5 font-mono text-xs">
                  <Row label="length" value={`${Math.round(Math.sqrt((selectedPipe.x2-selectedPipe.x1)**2 + (selectedPipe.y2-selectedPipe.y1)**2))} u`}/>
                  <Row label="angle" value={`${Math.round(Math.atan2(selectedPipe.y2-selectedPipe.y1, selectedPipe.x2-selectedPipe.x1) * 180 / Math.PI)}°`}/>
                </div>
                <div className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                  양 끝의 앰버색 핸들을 드래그하여 끝점을 자유롭게 이동할 수 있습니다.
                </div>
              </>
            ) : (
              <div className="text-center text-slate-500 text-sm py-8">
                <Move size={24} className="mx-auto mb-2 opacity-40"/>
                객체를 클릭하여 선택<br/>
                <span className="text-[11px]">드래그로 이동, 모서리로 크기 조정</span><br/>
                <span className="text-[11px]">DEL로 삭제, ESC로 그리기 취소</span>
              </div>
            )}
          </aside>
        )}
      </div>

      {editingSvg !== null && (
        <SvgEditor initial={editingSvg} onSave={saveCustomSvg} onCancel={() => setEditingSvg(null)}/>
      )}
    </div>
  );
}

const Row = ({ label, value, color }) => (
  <div className="flex justify-between items-center px-2 py-1 rounded hover:bg-slate-900/60">
    <span className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</span>
    <span style={{ color: color || "#cbd5e1" }}>{value}</span>
  </div>
);

const Field = ({ label, value, onChange, type = "text", options, step }) => (
  <div className="mb-3">
    <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500 mb-1">{label}</div>
    {type === "select" ? (
      <select value={value} onChange={e => onChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 font-mono">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} step={step}
             onChange={e => onChange(e.target.value)}
             className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 font-mono focus:border-amber-500 outline-none"/>
    )}
  </div>
);

const SvgEditor = ({ initial, onSave, onCancel }) => {
  const [text, setText] = useState(initial);
  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center z-50 p-8">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-3xl flex flex-col" style={{ height: "70vh" }}>
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 size={14} className="text-amber-400"/>
            <span className="text-sm font-mono text-slate-200">SVG 마크업 편집</span>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-200"><X size={16}/></button>
        </div>
        <div className="px-4 py-2 text-[11px] text-slate-500 border-b border-slate-800/60">
          좌표계: 객체 중심이 (0,0). 사용 가능한 그라디언트: <code className="text-amber-400">url(#metal)</code>, <code className="text-amber-400">url(#metalDark)</code>, <code className="text-amber-400">url(#cylinder)</code>, <code className="text-amber-400">url(#dome)</code>, <code className="text-amber-400">url(#volute)</code>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)}
                  className="flex-1 bg-slate-950 text-slate-200 font-mono text-xs p-4 outline-none resize-none border-0"
                  spellCheck={false}/>
        <div className="px-4 py-3 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded text-sm text-slate-400 hover:text-slate-200">취소</button>
          <button onClick={() => onSave(text)}
                  className="px-3 py-1.5 rounded bg-amber-500 text-slate-950 text-sm font-medium flex items-center gap-1.5">
            <Save size={13}/> 저장
          </button>
        </div>
      </div>
    </div>
  );
};
