import React, { useState, useEffect, useRef, useMemo } from "react";
import { Upload, FileCode2, ZoomIn, ZoomOut, Maximize2, AlertTriangle, CheckCircle2, Layers, Settings2, Download } from "lucide-react";

// ============================================================
// 1. Minimal DXF parser (group-code pair format)
//    Handles: INSERT, LINE, LWPOLYLINE, TEXT, MTEXT, CIRCLE
// ============================================================
function parseDXF(text) {
  const lines = text.split(/\r?\n/).map(s => s.trim());
  const pairs = [];
  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = parseInt(lines[i], 10);
    if (Number.isNaN(code)) continue;
    pairs.push([code, lines[i + 1]]);
  }

  const entities = [];
  let inEntities = false;
  let cur = null;

  const flush = () => { if (cur) { entities.push(cur); cur = null; } };

  for (let i = 0; i < pairs.length; i++) {
    const [code, val] = pairs[i];
    if (code === 0) {
      if (val === "SECTION") {
        const next = pairs[i + 1];
        if (next && next[0] === 2 && next[1] === "ENTITIES") inEntities = true;
        continue;
      }
      if (val === "ENDSEC") { flush(); inEntities = false; continue; }
      if (!inEntities) continue;
      flush();
      cur = { type: val, layer: "0", x: 0, y: 0, x2: 0, y2: 0, rotation: 0, name: "", text: "", radius: 0, vertices: [] };
      continue;
    }
    if (!cur || !inEntities) continue;
    const num = parseFloat(val);
    switch (code) {
      case 8: cur.layer = val; break;
      case 2: cur.name = val; break;
      case 1: cur.text = val; break;
      case 10: cur.x = num; if (cur.type === "LWPOLYLINE") cur.vertices.push({ x: num, y: 0 }); break;
      case 20: cur.y = num; if (cur.type === "LWPOLYLINE" && cur.vertices.length) cur.vertices[cur.vertices.length - 1].y = num; break;
      case 11: cur.x2 = num; break;
      case 21: cur.y2 = num; break;
      case 40: cur.radius = num; break;
      case 50: cur.rotation = num; break;
    }
  }
  flush();
  return entities;
}

// ============================================================
// 2. Symbol mapping rules — block name → canonical symbol type
//    In production this comes from client's icon library spec.
// ============================================================
const MAPPING_RULES = [
  { match: /^(PUMP|P-|CENTRIFUGAL)/i,    type: "pump",        label: "펌프" },
  { match: /^(VALVE|V-|GATE|GLOBE|BALL)/i, type: "valve",       label: "밸브" },
  { match: /^(TANK|T-|VESSEL|DRUM)/i,    type: "tank",        label: "탱크" },
  { match: /^(HX|E-|EXCHANGER|COOLER)/i, type: "exchanger",   label: "열교환기" },
  { match: /^(COMP|C-|K-|COMPRESSOR)/i,  type: "compressor",  label: "압축기" },
  { match: /^(TI|PI|FI|LI|TIC|PIC|FIC)/i, type: "instrument", label: "계장" },
];

function mapBlock(name) {
  for (const rule of MAPPING_RULES) if (rule.match.test(name)) return rule;
  return null;
}

// ============================================================
// 3. SVG symbol primitives — replace with client's icon set
// ============================================================
const Symbol = ({ type, x, y, rotation, tag, mapped }) => {
  const stroke = mapped ? "#22d3ee" : "#fb923c";
  const fill = mapped ? "rgba(34,211,238,0.08)" : "rgba(251,146,60,0.10)";
  const t = `translate(${x} ${-y}) rotate(${-rotation})`;
  const common = { stroke, fill, strokeWidth: 1.4, vectorEffect: "non-scaling-stroke" };

  let shape = null;
  switch (type) {
    case "pump":
      shape = (<>
        <circle r="14" {...common} />
        <polygon points="0,-14 14,0 0,14" stroke={stroke} fill="none" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </>); break;
    case "valve":
      shape = (<>
        <polygon points="-12,-10 12,10 12,-10 -12,10" {...common} />
      </>); break;
    case "tank":
      shape = (<>
        <rect x="-18" y="-22" width="36" height="44" rx="3" {...common} />
        <ellipse cx="0" cy="-22" rx="18" ry="5" {...common} />
        <ellipse cx="0" cy="22" rx="18" ry="5" {...common} />
      </>); break;
    case "exchanger":
      shape = (<>
        <circle r="16" {...common} />
        <line x1="-22" y1="0" x2="22" y2="0" stroke={stroke} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      </>); break;
    case "compressor":
      shape = (<>
        <polygon points="-14,-10 14,-14 14,14 -14,10" {...common} />
      </>); break;
    case "instrument":
      shape = (<>
        <circle r="11" {...common} />
        <line x1="-11" y1="0" x2="11" y2="0" stroke={stroke} strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </>); break;
    default:
      shape = (<>
        <rect x="-12" y="-12" width="24" height="24" {...common} strokeDasharray="3 2" />
        <text textAnchor="middle" dominantBaseline="central" fontSize="14" fill={stroke}>?</text>
      </>);
  }

  return (
    <g transform={t}>
      {shape}
      {tag && (
        <text y="32" textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="JetBrains Mono, monospace" style={{ letterSpacing: "0.05em" }}>
          {tag}
        </text>
      )}
    </g>
  );
};

// ============================================================
// 4. Sample DXF — small process flow for instant demo
// ============================================================
const SAMPLE_DXF = `0
SECTION
2
ENTITIES
0
INSERT
8
EQUIP
2
TANK
10
40
20
120
0
INSERT
8
EQUIP
2
PUMP-101
10
140
20
120
0
INSERT
8
EQUIP
2
VALVE-101
10
220
20
120
0
INSERT
8
EQUIP
2
HX-201
10
320
20
120
0
INSERT
8
EQUIP
2
TANK-202
10
440
20
120
0
INSERT
8
INSTR
2
TI-101
10
40
20
60
0
INSERT
8
INSTR
2
PI-102
10
220
20
60
0
INSERT
8
INSTR
2
FI-201
10
320
20
60
0
INSERT
8
EQUIP
2
COMP-301
10
140
20
220
0
INSERT
8
UNKNOWN
2
MYSTERY-X
10
380
20
220
0
LINE
8
PROCESS
10
58
20
120
11
122
21
120
0
LINE
8
PROCESS
10
158
20
120
11
208
21
120
0
LINE
8
PROCESS
10
234
20
120
11
304
21
120
0
LINE
8
PROCESS
10
336
20
120
11
422
21
120
0
LINE
8
SIGNAL
10
40
20
72
11
40
21
106
0
LINE
8
SIGNAL
10
220
20
72
11
220
21
106
0
LINE
8
SIGNAL
10
320
20
72
11
320
21
106
0
TEXT
8
TAGS
10
40
20
145
1
T-101
0
TEXT
8
TAGS
10
140
20
145
1
P-101
0
TEXT
8
TAGS
10
220
20
145
1
V-101
0
TEXT
8
TAGS
10
320
20
145
1
E-201
0
TEXT
8
TAGS
10
440
20
145
1
T-202
0
ENDSEC
0
EOF
`;

// ============================================================
// 5. Main App
// ============================================================
export default function PIDPilot() {
  const [rawEntities, setRawEntities] = useState([]);
  const [filename, setFilename] = useState("sample.dxf");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    setRawEntities(parseDXF(SAMPLE_DXF));
  }, []);

  const { symbols, processLines, signalLines, tags, bounds, blockSummary } = useMemo(() => {
    const symbols = [];
    const processLines = [];
    const signalLines = [];
    const tags = [];
    const blockCounts = {};
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const e of rawEntities) {
      if (e.type === "INSERT") {
        const rule = mapBlock(e.name);
        symbols.push({ ...e, rule });
        blockCounts[e.name] = (blockCounts[e.name] || 0) + 1;
        minX = Math.min(minX, e.x - 30); maxX = Math.max(maxX, e.x + 30);
        minY = Math.min(minY, e.y - 30); maxY = Math.max(maxY, e.y + 30);
      } else if (e.type === "LINE") {
        const target = e.layer.toUpperCase().includes("SIGNAL") ? signalLines : processLines;
        target.push(e);
        minX = Math.min(minX, e.x, e.x2); maxX = Math.max(maxX, e.x, e.x2);
        minY = Math.min(minY, e.y, e.y2); maxY = Math.max(maxY, e.y, e.y2);
      } else if (e.type === "TEXT" || e.type === "MTEXT") {
        tags.push(e);
      }
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 500; maxY = 300; }

    const blockSummary = Object.entries(blockCounts).map(([name, count]) => ({
      name, count, rule: mapBlock(name),
    })).sort((a, b) => (a.rule ? 0 : 1) - (b.rule ? 0 : 1));

    return {
      symbols, processLines, signalLines, tags,
      bounds: { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY },
      blockSummary,
    };
  }, [rawEntities]);

  const stats = useMemo(() => {
    const mapped = symbols.filter(s => s.rule).length;
    return {
      total: symbols.length,
      mapped,
      unmapped: symbols.length - mapped,
      coverage: symbols.length ? Math.round((mapped / symbols.length) * 100) : 0,
      processLines: processLines.length,
      signalLines: signalLines.length,
      tags: tags.length,
    };
  }, [symbols, processLines, signalLines, tags]);

  const handleFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setFilename(file.name);
    setRawEntities(parseDXF(text));
    setZoom(1); setOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(8, z * delta)));
  };

  const handleMouseDown = (e) => setDragging({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y });
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setOffset({ x: dragging.ox + (e.clientX - dragging.x), y: dragging.oy + (e.clientY - dragging.y) });
  };
  const handleMouseUp = () => setDragging(null);

  const fitView = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };

  // viewBox padded
  const pad = 40;
  const vb = `${bounds.minX - pad} ${-bounds.maxY - pad} ${bounds.w + 2 * pad} ${bounds.h + 2 * pad}`;

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-slate-200" style={{
      fontFamily: '"DM Sans", system-ui, sans-serif',
      backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(34,211,238,0.04), transparent 50%), radial-gradient(circle at 80% 100%, rgba(251,146,60,0.03), transparent 50%)',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur px-5 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md border border-amber-500/40 bg-amber-500/10 flex items-center justify-center">
            <FileCode2 size={16} className="text-amber-400" />
          </div>
          <div>
            <div style={{ fontFamily: '"Instrument Serif", serif' }} className="text-xl italic leading-none tracking-tight text-slate-100">
              P&ID Auto-Layout <span className="text-amber-400">·</span> Pilot
            </div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-slate-500 mt-0.5 font-mono">
              CAD → Symbol Library Mapper
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-700 hover:border-amber-500/60 hover:bg-amber-500/5 transition-colors text-sm">
            <Upload size={14} />
            <span>DXF 업로드</span>
            <input type="file" accept=".dxf" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          </label>
          <button onClick={() => { setFilename("sample.dxf"); setRawEntities(parseDXF(SAMPLE_DXF)); fitView(); }}
                  className="px-3 py-1.5 rounded-md border border-slate-800 hover:border-slate-600 text-sm text-slate-400 hover:text-slate-200">
            샘플 다시 로드
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: stats */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-950/40 p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">파일</div>
            <div className="font-mono text-xs text-slate-300 truncate">{filename}</div>
          </div>

          <Stat label="검출 심볼" value={stats.total} accent="amber" />
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="매핑됨" value={stats.mapped} color="text-cyan-400" />
            <MiniStat label="미매핑" value={stats.unmapped} color="text-orange-400" />
          </div>

          {/* Coverage bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">매핑률</span>
              <span className="font-mono text-xs text-slate-200">{stats.coverage}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all"
                   style={{ width: `${stats.coverage}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
            <MiniStat label="공정선" value={stats.processLines} color="text-slate-300" />
            <MiniStat label="신호선" value={stats.signalLines} color="text-slate-300" />
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-1.5">
              <Layers size={11} /> 블록 인벤토리
            </div>
            <div className="space-y-1 font-mono text-xs">
              {blockSummary.map(b => (
                <div key={b.name} className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-slate-900/60">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {b.rule
                      ? <CheckCircle2 size={11} className="text-cyan-400 shrink-0" />
                      : <AlertTriangle size={11} className="text-orange-400 shrink-0" />}
                    <span className="truncate text-slate-300">{b.name}</span>
                  </div>
                  <span className="text-slate-500 shrink-0">×{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Drawing area */}
        <main className="flex-1 relative overflow-hidden bg-slate-950"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: dragging ? "grabbing" : "grab" }}>
          {/* Grid background */}
          <div className="absolute inset-0 opacity-30 pointer-events-none"
               style={{
                 backgroundImage: 'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)',
                 backgroundSize: '24px 24px',
               }} />

          <svg ref={svgRef} className="w-full h-full" viewBox={vb} preserveAspectRatio="xMidYMid meet"
               style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: "center" }}>
            {/* Process lines */}
            {processLines.map((l, i) => (
              <line key={`p${i}`} x1={l.x} y1={-l.y} x2={l.x2} y2={-l.y2}
                    stroke="#475569" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            ))}
            {/* Signal lines (dashed) */}
            {signalLines.map((l, i) => (
              <line key={`s${i}`} x1={l.x} y1={-l.y} x2={l.x2} y2={-l.y2}
                    stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
            ))}
            {/* Symbols */}
            {symbols.map((s, i) => (
              <Symbol key={i}
                      type={s.rule?.type || "unknown"}
                      x={s.x} y={s.y} rotation={s.rotation}
                      tag={s.name}
                      mapped={!!s.rule} />
            ))}
            {/* Original CAD text labels */}
            {tags.map((t, i) => (
              <text key={`t${i}`} x={t.x} y={-t.y} textAnchor="middle" fontSize="8"
                    fill="#64748b" fontFamily="JetBrains Mono, monospace">
                {t.text}
              </text>
            ))}
          </svg>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-slate-900/80 backdrop-blur rounded-md border border-slate-800 p-1">
            <button onClick={() => setZoom(z => Math.min(8, z * 1.2))} className="p-1.5 hover:bg-slate-800 rounded text-slate-300"><ZoomIn size={14} /></button>
            <button onClick={() => setZoom(z => Math.max(0.2, z * 0.83))} className="p-1.5 hover:bg-slate-800 rounded text-slate-300"><ZoomOut size={14} /></button>
            <button onClick={fitView} className="p-1.5 hover:bg-slate-800 rounded text-slate-300"><Maximize2 size={14} /></button>
          </div>

          {/* Status pill */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur rounded-md border border-slate-800 font-mono text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>zoom {zoom.toFixed(2)}× · drag to pan · scroll to zoom</span>
          </div>
        </main>

        {/* Right sidebar: mapping rules */}
        <aside className="w-72 border-l border-slate-800/80 bg-slate-950/40 p-4 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3 flex items-center gap-1.5">
            <Settings2 size={11} /> 매핑 규칙
          </div>
          <div className="space-y-2">
            {MAPPING_RULES.map((r, i) => (
              <div key={i} className="border border-slate-800 rounded-md p-2.5 bg-slate-900/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-200">{r.label}</span>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase">{r.type}</span>
                </div>
                <code className="text-[11px] font-mono text-slate-500 block truncate">
                  {r.match.toString()}
                </code>
              </div>
            ))}
            <div className="border border-dashed border-slate-800 rounded-md p-2.5 text-[11px] text-slate-500">
              실제 배포 시 이 규칙은 고객사 심볼 라이브러리 명세서에서 자동 생성됩니다 (ISA-5.1, KS, 또는 자체 정의).
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">다음 단계</div>
            <ul className="text-xs text-slate-400 space-y-1.5 list-none">
              <li className="flex gap-2"><span className="text-amber-400">01</span> 고객 아이콘 SVG 라이브러리 임포트</li>
              <li className="flex gap-2"><span className="text-amber-400">02</span> 미매핑 블록 → LLM 보조 분류 (Gemma)</li>
              <li className="flex gap-2"><span className="text-amber-400">03</span> 토폴로지 그래프 추출 → 상상이 KG 주입</li>
              <li className="flex gap-2"><span className="text-amber-400">04</span> 좌표 보존 / 자동 정렬 모드 선택</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-5 py-2 flex items-center justify-between font-mono text-[10px] text-slate-500">
        <span>SAMSANG-i 2.0 / vision pipeline / pid-mapper v0.1</span>
        <span>{rawEntities.length} entities parsed · {symbols.length} symbols · {processLines.length + signalLines.length} lines</span>
      </footer>
    </div>
  );
}

const Stat = ({ label, value, accent }) => (
  <div className="border border-slate-800 rounded-md p-3 bg-slate-900/40">
    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">{label}</div>
    <div className={`text-2xl font-mono ${accent === "amber" ? "text-amber-400" : "text-slate-200"}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
      {value}
    </div>
  </div>
);

const MiniStat = ({ label, value, color }) => (
  <div className="border border-slate-800/60 rounded p-2">
    <div className="text-[9px] uppercase tracking-[0.15em] text-slate-500">{label}</div>
    <div className={`text-lg font-mono ${color}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>{value}</div>
  </div>
);
