import React, { useState, useRef, useMemo } from "react";
import { Upload, FileCode2, Layers, AlertTriangle, CheckCircle2, Maximize2, ZoomIn, ZoomOut, Download, FileJson, FileImage } from "lucide-react";

// ============================================================
// DXF PARSER (extended) — same as v0.1, with system-block filter
// ============================================================
function parseDXF(text) {
  const lines = text.split(/\r?\n/).map(s => s.trim());
  const pairs = [];
  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = parseInt(lines[i], 10);
    if (Number.isNaN(code)) continue;
    pairs.push([code, lines[i + 1]]);
  }

  const blocks = {};
  const entities = [];
  let section = null;
  let currentBlock = null;
  let cur = null;

  const newEntity = (type) => ({
    type, layer: "0", x: 0, y: 0, z: 0, x2: 0, y2: 0, cx: 0, cy: 0,
    radius: 0, startAngle: 0, endAngle: 0, majorX: 0, majorY: 0, ratio: 1,
    name: "", text: "", height: 4, rotation: 0, scaleX: 1, scaleY: 1,
    closed: false, vertices: [], color: 256,
  });

  const flushEntity = () => {
    if (!cur) return;
    // Filter out system entities (SOLID, leftovers from system blocks)
    const allowedTypes = ["LINE","CIRCLE","ARC","ELLIPSE","LWPOLYLINE","INSERT","TEXT","MTEXT"];
    if (!allowedTypes.includes(cur.type)) { cur = null; return; }
    const target = currentBlock ? blocks[currentBlock] : entities;
    if (target) target.push(cur);
    cur = null;
  };

  for (let i = 0; i < pairs.length; i++) {
    const [code, val] = pairs[i];
    if (code === 0) {
      flushEntity();
      if (val === "SECTION") {
        const next = pairs[i + 1];
        if (next && next[0] === 2) {
          if (next[1] === "BLOCKS") section = "BLOCKS";
          else if (next[1] === "ENTITIES") section = "ENTITIES";
          else section = null;
        }
        continue;
      }
      if (val === "ENDSEC") { section = null; currentBlock = null; continue; }
      if (section === "BLOCKS") {
        if (val === "BLOCK") { currentBlock = "__pending__"; continue; }
        if (val === "ENDBLK") { currentBlock = null; continue; }
        if (currentBlock) { cur = newEntity(val); continue; }
      }
      if (section === "ENTITIES") { cur = newEntity(val); continue; }
      continue;
    }
    if (!section) continue;
    if (currentBlock === "__pending__" && code === 2) {
      currentBlock = val;
      // Skip system blocks (start with * or _)
      if (val.startsWith("*") || val.startsWith("_")) {
        blocks[currentBlock] = [];  // still allocate to absorb entities, but won't render
      } else {
        blocks[currentBlock] = [];
      }
      continue;
    }
    if (!cur) continue;
    const num = parseFloat(val);
    switch (code) {
      case 8: cur.layer = val; break;
      case 2: cur.name = val; break;
      case 1: cur.text = val; break;
      case 10: cur.x = num; cur.cx = num;
               if (cur.type === "LWPOLYLINE") cur.vertices.push({ x: num, y: 0, bulge: 0 }); break;
      case 20: cur.y = num; cur.cy = num;
               if (cur.type === "LWPOLYLINE" && cur.vertices.length)
                 cur.vertices[cur.vertices.length - 1].y = num; break;
      case 11: cur.x2 = num; cur.majorX = num; break;
      case 21: cur.y2 = num; cur.majorY = num; break;
      case 40: cur.radius = num; cur.height = num; cur.ratio = num; break;
      case 41: cur.ratio = num; cur.scaleX = num; break;
      case 42: cur.scaleY = num;
               if (cur.type === "LWPOLYLINE" && cur.vertices.length)
                 cur.vertices[cur.vertices.length - 1].bulge = num; break;
      case 50: cur.startAngle = num; cur.rotation = num; break;
      case 51: cur.endAngle = num; break;
      case 62: cur.color = parseInt(val, 10); break;
      case 70: cur.closed = (parseInt(val, 10) & 1) === 1; break;
    }
  }
  flushEntity();

  // Filter out system blocks from final output (keep them for parsing only)
  const userBlocks = {};
  for (const [name, ents] of Object.entries(blocks)) {
    if (!name.startsWith("*") && !name.startsWith("_")) userBlocks[name] = ents;
  }

  // Filter INSERTs that reference system blocks (defensive)
  const userEntities = entities.filter(e => {
    if (e.type === "INSERT") return !e.name.startsWith("*") && !e.name.startsWith("_");
    return true;
  });

  return { entities: userEntities, blocks: userBlocks };
}

// ============================================================
// ENTITY → SVG NODES
// ============================================================
function entityToSvgNodes(e, opts = {}) {
  const { stroke = "#cbd5e1", strokeWidth = 1, fill = "none", flipY = true } = opts;
  const fy = flipY ? -1 : 1;
  const nodes = [];

  switch (e.type) {
    case "LINE":
      nodes.push({ tag: "line", attrs: {
        x1: e.x, y1: e.y * fy, x2: e.x2, y2: e.y2 * fy,
        stroke, "stroke-width": strokeWidth, "stroke-linecap": "round" }});
      break;
    case "CIRCLE":
      nodes.push({ tag: "circle", attrs: {
        cx: e.cx, cy: e.cy * fy, r: e.radius,
        stroke, "stroke-width": strokeWidth, fill }});
      break;
    case "ARC": {
      const sa = e.startAngle * Math.PI / 180;
      const ea = e.endAngle * Math.PI / 180;
      const x1 = e.cx + e.radius * Math.cos(sa);
      const y1 = (e.cy + e.radius * Math.sin(sa)) * fy;
      const x2 = e.cx + e.radius * Math.cos(ea);
      const y2 = (e.cy + e.radius * Math.sin(ea)) * fy;
      let sweep = ea - sa;
      while (sweep < 0) sweep += 2 * Math.PI;
      const largeArc = sweep > Math.PI ? 1 : 0;
      const sweepFlag = flipY ? 0 : 1;
      nodes.push({ tag: "path", attrs: {
        d: `M ${x1} ${y1} A ${e.radius} ${e.radius} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`,
        stroke, "stroke-width": strokeWidth, fill: "none" }});
      break;
    }
    case "ELLIPSE": {
      const rx = Math.sqrt(e.majorX ** 2 + e.majorY ** 2);
      const ry = rx * e.ratio;
      const angle = Math.atan2(e.majorY, e.majorX) * 180 / Math.PI * (flipY ? -1 : 1);
      nodes.push({ tag: "ellipse", attrs: {
        cx: 0, cy: 0, rx, ry,
        transform: `translate(${e.cx} ${e.cy * fy}) rotate(${angle})`,
        stroke, "stroke-width": strokeWidth, fill }});
      break;
    }
    case "LWPOLYLINE": {
      if (!e.vertices.length) break;
      const verts = e.vertices;
      let d = `M ${verts[0].x} ${verts[0].y * fy}`;
      for (let i = 1; i < verts.length; i++) {
        const prev = verts[i - 1];
        const v = verts[i];
        if (Math.abs(prev.bulge) > 1e-6) {
          const dx = v.x - prev.x, dy = (v.y - prev.y) * fy;
          const chord = Math.sqrt(dx*dx + dy*dy);
          const sagitta = Math.abs(prev.bulge) * chord / 2;
          const r = (chord*chord/4 + sagitta*sagitta) / (2 * sagitta);
          const largeArc = Math.abs(prev.bulge) > 1 ? 1 : 0;
          const sweepFlag = prev.bulge > 0 ? (flipY ? 0 : 1) : (flipY ? 1 : 0);
          d += ` A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${v.x} ${v.y * fy}`;
        } else {
          d += ` L ${v.x} ${v.y * fy}`;
        }
      }
      if (e.closed) d += " Z";
      nodes.push({ tag: "path", attrs: {
        d, stroke, "stroke-width": strokeWidth,
        fill: e.closed ? fill : "none",
        "stroke-linejoin": "round", "stroke-linecap": "round" }});
      break;
    }
    case "TEXT":
    case "MTEXT":
      nodes.push({ tag: "text", attrs: {
        x: e.x, y: e.y * fy,
        "font-size": e.height || 4,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-family": "JetBrains Mono, monospace",
        fill: stroke,
      }, text: e.text });
      break;
  }
  return nodes;
}

// ============================================================
// SHAPE CLASSIFIER + STYLE ENGINE
// ============================================================
function classifyBlockShape(entities) {
  const counts = { CIRCLE: 0, LINE: 0, ARC: 0, LWPOLYLINE: 0, ELLIPSE: 0 };
  for (const e of entities) counts[e.type] = (counts[e.type] || 0) + 1;
  const hasCircle = counts.CIRCLE > 0;
  const hasArc = counts.ARC > 0;
  const hasEllipse = counts.ELLIPSE > 0;
  const polyCount = counts.LWPOLYLINE || 0;
  if (hasCircle && polyCount >= 1 && polyCount <= 4) return "rotating";
  if (polyCount >= 1 && hasEllipse) return "vessel";
  if (polyCount >= 1 && hasArc && counts.LINE >= 2) return "vessel";
  if (polyCount >= 1 && hasArc) return "exchanger";
  if (hasCircle && counts.LINE <= 2 && polyCount === 0) return "instrument";
  if (polyCount === 1 && counts.LINE <= 2) return "valve";
  return "generic";
}

function getStyleForShape(shape, layer) {
  if (layer === "PROCESS") return { kind: "pipe" };
  if (layer === "SIGNAL") return { kind: "signal", stroke: "#64748b", strokeWidth: 1, dash: "3 2" };
  switch (shape) {
    case "rotating":
      return { kind: "filled", fill: "url(#metalGrad)", stroke: "#0f172a", strokeWidth: 0.5,
               highlight: { type: "specular" }, shadow: true };
    case "vessel":
      return { kind: "filled", fill: "url(#cylinderGrad)", stroke: "#0f172a", strokeWidth: 0.5,
               highlight: { type: "vertical-stripe" }, shadow: true };
    case "exchanger":
      return { kind: "filled", fill: "url(#cylinderGrad)", stroke: "#0f172a", strokeWidth: 0.5, shadow: true };
    case "instrument":
      return { kind: "filled", fill: "url(#metalGrad)", stroke: "#0f172a", strokeWidth: 0.6,
               innerInset: { fill: "#0f172a", scale: 0.78 }, shadow: true };
    case "valve":
      return { kind: "filled", fill: "url(#metalGrad)", stroke: "#0f172a", strokeWidth: 0.6, shadow: true };
    default:
      return { kind: "outline", stroke: "#cbd5e1", strokeWidth: 1, shadow: true };
  }
}

function applyStyle(nodes, style) {
  return nodes.map(n => {
    const attrs = { ...n.attrs };
    if (style.kind === "filled") {
      attrs.stroke = style.stroke;
      attrs["stroke-width"] = style.strokeWidth;
      if (n.tag !== "line") attrs.fill = style.fill;
    } else if (style.kind === "signal") {
      attrs.stroke = style.stroke;
      attrs["stroke-width"] = style.strokeWidth;
      attrs["stroke-dasharray"] = style.dash;
      attrs.fill = "none";
    } else {
      attrs.stroke = style.stroke || "#cbd5e1";
      attrs["stroke-width"] = style.strokeWidth || 1;
    }
    return { ...n, attrs };
  });
}

// ============================================================
// BBOX UTILITIES
// ============================================================
function bboxOfEntities(entities, blocks) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const expand = (x, y) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  const visit = (e) => {
    switch (e.type) {
      case "LINE": expand(e.x, -e.y); expand(e.x2, -e.y2); break;
      case "CIRCLE": expand(e.cx - e.radius, -e.cy - e.radius);
                     expand(e.cx + e.radius, -e.cy + e.radius); break;
      case "ARC": expand(e.cx - e.radius, -e.cy - e.radius);
                  expand(e.cx + e.radius, -e.cy + e.radius); break;
      case "ELLIPSE": {
        const rx = Math.sqrt(e.majorX ** 2 + e.majorY ** 2);
        const r = Math.max(rx, rx * e.ratio);
        expand(e.cx - r, -e.cy - r); expand(e.cx + r, -e.cy + r); break;
      }
      case "LWPOLYLINE": for (const v of e.vertices) expand(v.x, -v.y); break;
      case "INSERT": {
        const blkEnts = blocks[e.name];
        if (blkEnts) {
          for (const be of blkEnts) {
            const shifted = { ...be,
              x: be.x + e.x, y: be.y + e.y,
              x2: be.x2 + e.x, y2: be.y2 + e.y,
              cx: be.cx + e.x, cy: be.cy + e.y,
              vertices: be.vertices?.map(v => ({ ...v, x: v.x + e.x, y: v.y + e.y })) ?? [] };
            visit(shifted);
          }
        } else { expand(e.x - 20, -e.y - 20); expand(e.x + 20, -e.y + 20); }
        break;
      }
      case "TEXT": case "MTEXT":
        expand(e.x - 10, -e.y - e.height); expand(e.x + 10, -e.y); break;
    }
  };
  for (const e of entities) visit(e);
  if (!isFinite(minX)) return { x: 0, y: 0, w: 100, h: 100 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ============================================================
// RENDERER
// ============================================================
const SvgNode = ({ node }) => {
  const { tag, attrs, text } = node;
  if (tag === "text") return React.createElement(tag, attrs, text);
  return React.createElement(tag, attrs);
};

const BlockInstance = ({ ins, blocks, showDebug }) => {
  const blkEnts = blocks[ins.name];
  if (!blkEnts || !blkEnts.length) {
    return (
      <g transform={`translate(${ins.x} ${-ins.y})`}>
        <rect x="-12" y="-12" width="24" height="24" fill="rgba(251,146,60,0.1)"
              stroke="#fb923c" strokeWidth="0.8" strokeDasharray="2 1.5"/>
        <text textAnchor="middle" dominantBaseline="central" fontSize="6" fill="#fb923c"
              fontFamily="JetBrains Mono">{ins.name?.slice(0, 8) || "?"}</text>
      </g>
    );
  }

  const shape = classifyBlockShape(blkEnts);
  const style = getStyleForShape(shape, ins.layer);
  let allNodes = [];
  for (const be of blkEnts) allNodes = allNodes.concat(entityToSvgNodes(be));
  allNodes = applyStyle(allNodes, style);
  const bb = bboxOfEntities(blkEnts, blocks);

  return (
    <g transform={`translate(${ins.x} ${-ins.y}) rotate(${-(ins.rotation || 0)}) scale(${ins.scaleX || 1} ${ins.scaleY || 1})`}
       filter={style.shadow ? "url(#dropShadow)" : undefined}>
      {allNodes.map((n, i) => <SvgNode key={i} node={n}/>)}
      {style.highlight?.type === "specular" && (
        <ellipse cx={bb.x + bb.w * 0.3} cy={bb.y + bb.h * 0.3}
                 rx={bb.w * 0.3} ry={bb.h * 0.12}
                 fill="white" opacity="0.18" pointerEvents="none"/>
      )}
      {style.highlight?.type === "vertical-stripe" && (
        <rect x={bb.x + bb.w * 0.15} y={bb.y + bb.h * 0.05}
              width={bb.w * 0.06} height={bb.h * 0.9}
              fill="white" opacity="0.1" pointerEvents="none"/>
      )}
      {style.innerInset && (() => {
        const cx = bb.x + bb.w / 2;
        const cy = bb.y + bb.h / 2;
        const r = Math.min(bb.w, bb.h) / 2 * style.innerInset.scale;
        return <circle cx={cx} cy={cy} r={r} fill={style.innerInset.fill}
                       stroke="#475569" strokeWidth="0.4"/>;
      })()}
      {showDebug && (
        <text x={bb.x} y={bb.y - 2} fontSize="2.5" fill="#22d3ee" opacity="0.7"
              fontFamily="JetBrains Mono">[{shape}]</text>
      )}
    </g>
  );
};

const BareEntity = ({ ent }) => {
  if (ent.layer === "PROCESS" && ent.type === "LINE") {
    return (
      <g>
        <line x1={ent.x} y1={-ent.y} x2={ent.x2} y2={-ent.y2}
              stroke="#0f172a" strokeWidth="6" strokeLinecap="round"/>
        <line x1={ent.x} y1={-ent.y} x2={ent.x2} y2={-ent.y2}
              stroke="url(#metalGrad)" strokeWidth="4.5" strokeLinecap="round"/>
        <line x1={ent.x} y1={-ent.y} x2={ent.x2} y2={-ent.y2}
              stroke="#94a3b8" strokeWidth="0.5" opacity="0.5"/>
      </g>
    );
  }
  if (ent.layer === "PROCESS" && ent.type === "ARC") {
    const nodes = entityToSvgNodes(ent);
    const arcAttrs = nodes[0]?.attrs || {};
    return (
      <g>
        <path {...arcAttrs} stroke="#0f172a" strokeWidth="6" fill="none"/>
        <path {...arcAttrs} stroke="url(#metalGrad)" strokeWidth="4.5" fill="none"/>
      </g>
    );
  }
  const style = getStyleForShape("generic", ent.layer);
  let nodes = entityToSvgNodes(ent);
  nodes = applyStyle(nodes, style);
  return <>{nodes.map((n, i) => <SvgNode key={i} node={n}/>)}</>;
};

// ============================================================
// EXPORT FUNCTIONS
// ============================================================
function exportSVG(svgElement, filename) {
  // Clone and inline computed styles (gradients are in <defs>, already self-contained)
  const clone = svgElement.cloneNode(true);
  // Remove transform from inline style (zoom/pan)
  clone.style.transform = "";
  // Wrap with proper XML header
  const serializer = new XMLSerializer();
  let svgStr = serializer.serializeToString(clone);
  if (!svgStr.match(/^<\?xml/)) svgStr = '<?xml version="1.0" standalone="no"?>\n' + svgStr;
  if (!svgStr.match(/xmlns/)) svgStr = svgStr.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const blob = new Blob([svgStr], { type: "image/svg+xml" });
  triggerDownload(blob, filename.replace(/\.dxf$/i, "") + ".svg");
}

function exportJSON(data, filename, bbox) {
  // Build PID Studio compatible JSON
  const project = {
    id: `PID-${Date.now()}`,
    source: filename,
    version: 1,
    createdAt: new Date().toISOString(),
    viewport: { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h },
    blocks: data.blocks,           // block definitions for rendering
    entities: data.entities,       // raw geometry + INSERTs
    // Convenience: pre-classified instances for quick PID Studio load
    instances: data.entities.filter(e => e.type === "INSERT").map((e, i) => {
      const blkEnts = data.blocks[e.name];
      const shape = blkEnts ? classifyBlockShape(blkEnts) : "unknown";
      return {
        id: i + 1,
        blockName: e.name,
        shape,
        x: e.x, y: -e.y,             // flip Y for SVG coords
        scale: e.scaleX || 1,
        rotation: e.rotation || 0,
        layer: e.layer,
        tag: "",                     // user fills in PID Studio
        binding: null,               // signalR/websocket tag mapping
      };
    }),
    pipes: data.entities.filter(e => e.type === "LINE" && e.layer === "PROCESS").map((e, i) => ({
      id: 1000 + i,
      x1: e.x, y1: -e.y, x2: e.x2, y2: -e.y2,
    })),
  };
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  triggerDownload(blob, filename.replace(/\.dxf$/i, "") + ".pid.json");
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// MAIN APP
// ============================================================
export default function DXFConverter() {
  const [data, setData] = useState({ entities: [], blocks: {} });
  const [filename, setFilename] = useState("sample.dxf");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [exportFlash, setExportFlash] = useState(null);
  const svgRef = useRef(null);

  React.useEffect(() => {
    setData(parseDXF(BUILT_IN_SAMPLE));
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setFilename(file.name);
    setData(parseDXF(text));
    fitView();
  };

  const bbox = useMemo(() => bboxOfEntities(data.entities, data.blocks), [data]);

  const stats = useMemo(() => {
    const entityCounts = {};
    let unmappedBlocks = 0;
    const blockUsage = {};
    for (const e of data.entities) {
      entityCounts[e.type] = (entityCounts[e.type] || 0) + 1;
      if (e.type === "INSERT") {
        blockUsage[e.name] = (blockUsage[e.name] || 0) + 1;
        if (!data.blocks[e.name]) unmappedBlocks++;
      }
    }
    const knownBlocks = Object.keys(data.blocks).length;
    return { entityCounts, blockUsage, knownBlocks, unmappedBlocks,
             totalEntities: data.entities.length };
  }, [data]);

  const fitView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(10, z * delta)));
  };

  const onMouseDown = (e) => setDrag({ x: e.clientX, y: e.clientY, ox: pan.x, oy: pan.y });
  const onMouseMove = (e) => {
    if (!drag) return;
    setPan({ x: drag.ox + (e.clientX - drag.x), y: drag.oy + (e.clientY - drag.y) });
  };
  const onMouseUp = () => setDrag(null);

  const handleSvgExport = () => {
    if (svgRef.current) {
      exportSVG(svgRef.current, filename);
      setExportFlash("svg");
      setTimeout(() => setExportFlash(null), 1500);
    }
  };

  const handleJsonExport = () => {
    exportJSON(data, filename, bbox);
    setExportFlash("json");
    setTimeout(() => setExportFlash(null), 1500);
  };

  const pad = Math.max(bbox.w, bbox.h) * 0.1;
  const vb = `${bbox.x - pad} ${bbox.y - pad} ${bbox.w + 2 * pad} ${bbox.h + 2 * pad}`;

  return (
    <div className="w-full h-screen flex flex-col bg-slate-950 text-slate-200" style={{
      fontFamily: '"DM Sans", system-ui, sans-serif',
      backgroundImage: 'radial-gradient(ellipse at top, #1e293b 0%, #0a0e1a 60%, #020617 100%)',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      <header className="border-b border-slate-800/60 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md border border-amber-500/40 bg-amber-500/10 flex items-center justify-center">
            <FileCode2 size={16} className="text-amber-400"/>
          </div>
          <div>
            <div style={{ fontFamily: '"Instrument Serif", serif' }} className="text-xl italic text-slate-100 leading-none">
              DXF → SVG <span className="text-amber-400">·</span> Auto Converter v0.2
            </div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-slate-500 mt-0.5 font-mono">
              parser + auto styling + json/svg export
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-700 hover:border-amber-500/60 hover:bg-amber-500/5 text-sm">
            <Upload size={14}/>
            <span>DXF 업로드</span>
            <input type="file" accept=".dxf" className="hidden" onChange={e => handleFile(e.target.files?.[0])}/>
          </label>

          {/* Export buttons */}
          <button onClick={handleJsonExport}
                  className={`px-3 py-1.5 rounded-md border text-sm flex items-center gap-2 transition-all ${
                    exportFlash === "json"
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                      : "border-cyan-500/40 hover:bg-cyan-500/10 text-cyan-300"
                  }`}>
            <FileJson size={14}/> JSON 저장
          </button>
          <button onClick={handleSvgExport}
                  className={`px-3 py-1.5 rounded-md border text-sm flex items-center gap-2 transition-all ${
                    exportFlash === "svg"
                      ? "border-amber-400 bg-amber-500/20 text-amber-300"
                      : "border-amber-500/40 hover:bg-amber-500/10 text-amber-300"
                  }`}>
            <FileImage size={14}/> SVG 저장
          </button>

          <button onClick={() => setShowDebug(d => !d)}
                  className={`px-3 py-1.5 rounded-md border text-sm ${
                    showDebug ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300" : "border-slate-700 text-slate-400"
                  }`}>
            디버그 {showDebug ? "ON" : "OFF"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 border-r border-slate-800/60 bg-slate-950/40 p-4 overflow-y-auto flex flex-col gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">현재 파일</div>
            <div className="font-mono text-xs text-slate-300 truncate">{filename}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Stat label="엔티티" value={stats.totalEntities}/>
            <Stat label="블록 정의" value={stats.knownBlocks}/>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">엔티티 분포</div>
            <div className="space-y-0.5 font-mono text-xs">
              {Object.entries(stats.entityCounts).sort((a,b) => b[1]-a[1]).map(([t, n]) => (
                <div key={t} className="flex justify-between px-2 py-1 rounded hover:bg-slate-900/60">
                  <span className="text-slate-400">{t}</span>
                  <span className="text-cyan-400">×{n}</span>
                </div>
              ))}
            </div>
          </div>

          {Object.keys(stats.blockUsage).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-1.5">
                <Layers size={11}/> 블록 사용
              </div>
              <div className="space-y-0.5 font-mono text-xs">
                {Object.entries(stats.blockUsage).map(([name, n]) => {
                  const known = !!data.blocks[name];
                  const shape = known ? classifyBlockShape(data.blocks[name]) : null;
                  return (
                    <div key={name} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-900/60">
                      {known
                        ? <CheckCircle2 size={10} className="text-cyan-400 shrink-0"/>
                        : <AlertTriangle size={10} className="text-orange-400 shrink-0"/>}
                      <span className="text-slate-300 flex-1 truncate">{name}</span>
                      {shape && <span className="text-[9px] text-cyan-500/70">{shape}</span>}
                      <span className="text-slate-500">×{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800/60">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2 flex items-center gap-1.5">
              <Download size={11}/> 저장 포맷
            </div>
            <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
              <div className="flex gap-2">
                <span className="text-cyan-400 shrink-0 mt-0.5">JSON</span>
                <span>PID Studio에서 다시 열어 편집·바인딩 가능. 권장.</span>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-400 shrink-0 mt-0.5">SVG</span>
                <span>인쇄·문서 첨부용 정적 이미지. 수정 불가.</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 relative overflow-hidden"
              onWheel={handleWheel}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              style={{ cursor: drag ? "grabbing" : "grab" }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none"
               style={{
                 backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
                 backgroundSize: '32px 32px',
               }}/>

          <svg ref={svgRef} className="w-full h-full" viewBox={vb} preserveAspectRatio="xMidYMid meet"
               style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center" }}>
            <defs>
              <filter id="dropShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.5"/>
              </filter>
              <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64748b"/>
                <stop offset="40%" stopColor="#475569"/>
                <stop offset="100%" stopColor="#1e293b"/>
              </linearGradient>
              <linearGradient id="cylinderGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0f172a"/>
                <stop offset="20%" stopColor="#334155"/>
                <stop offset="50%" stopColor="#64748b"/>
                <stop offset="80%" stopColor="#334155"/>
                <stop offset="100%" stopColor="#0f172a"/>
              </linearGradient>
              <radialGradient id="domeGrad" cx="0.35" cy="0.35">
                <stop offset="0%" stopColor="#94a3b8"/>
                <stop offset="60%" stopColor="#475569"/>
                <stop offset="100%" stopColor="#1e293b"/>
              </radialGradient>
            </defs>

            {data.entities.filter(e => e.type !== "INSERT" && e.type !== "TEXT" && e.type !== "MTEXT")
                          .map((e, i) => <BareEntity key={`b${i}`} ent={e}/>)}
            {data.entities.filter(e => e.type === "INSERT")
                          .map((e, i) => <BlockInstance key={`i${i}`} ins={e} blocks={data.blocks} showDebug={showDebug}/>)}
            {data.entities.filter(e => e.type === "TEXT" || e.type === "MTEXT")
                          .map((e, i) => (
                            <text key={`t${i}`} x={e.x} y={-e.y}
                                  fontSize={Math.max(3, e.height || 4)}
                                  textAnchor="middle" dominantBaseline="central"
                                  fill="#cbd5e1" fontFamily="JetBrains Mono">
                              {e.text}
                            </text>
                          ))}

            {showDebug && (
              <rect x={bbox.x} y={bbox.y} width={bbox.w} height={bbox.h}
                    fill="none" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5"/>
            )}
          </svg>

          <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-slate-900/80 backdrop-blur rounded-md border border-slate-800 p-1">
            <button onClick={() => setZoom(z => Math.min(10, z * 1.2))} className="p-1.5 hover:bg-slate-800 rounded text-slate-300"><ZoomIn size={14}/></button>
            <button onClick={() => setZoom(z => Math.max(0.2, z * 0.83))} className="p-1.5 hover:bg-slate-800 rounded text-slate-300"><ZoomOut size={14}/></button>
            <button onClick={fitView} className="p-1.5 hover:bg-slate-800 rounded text-slate-300"><Maximize2 size={14}/></button>
          </div>

          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur rounded-md border border-slate-800 font-mono text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
            zoom {zoom.toFixed(2)}× · drag to pan · scroll to zoom
          </div>

          {exportFlash && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 border border-cyan-500/40 rounded-md text-sm text-cyan-300 font-mono">
              ✓ {exportFlash.toUpperCase()} 다운로드 완료
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="border border-slate-800 rounded-md p-2 bg-slate-900/40">
    <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mb-0.5">{label}</div>
    <div className="text-xl font-mono text-amber-400">{value}</div>
  </div>
);

const BUILT_IN_SAMPLE = `0
SECTION
2
BLOCKS
0
BLOCK
2
PUMP
0
CIRCLE
8
EQUIP
10
0
20
0
40
14
0
LWPOLYLINE
8
EQUIP
70
1
10
0
20
-14
10
14
20
0
10
0
20
14
0
ENDBLK
0
BLOCK
2
TANK
0
LWPOLYLINE
8
EQUIP
70
1
10
-18
20
-22
10
18
20
-22
10
18
20
22
10
-18
20
22
0
ELLIPSE
8
EQUIP
10
0
20
22
11
18
21
0
40
0.28
0
ELLIPSE
8
EQUIP
10
0
20
-22
11
18
21
0
40
0.28
0
ENDBLK
0
ENDSEC
0
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
100
0
INSERT
8
EQUIP
2
PUMP
10
140
20
100
0
INSERT
8
EQUIP
2
TANK
10
260
20
100
0
LINE
8
PROCESS
10
58
20
100
11
118
21
100
0
LINE
8
PROCESS
10
158
20
100
11
234
21
100
0
TEXT
8
TAGS
10
40
20
70
40
4
1
T-101
0
TEXT
8
TAGS
10
140
20
70
40
4
1
P-101
0
TEXT
8
TAGS
10
260
20
70
40
4
1
T-102
0
ENDSEC
0
EOF
`;
