import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Play, Pause, Grid3X3, Eye, EyeOff, GitBranch, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EmbroideryPattern, EmbroideryColor } from "@/lib/embroideryPreview";

const NORMAL = 0;
const JUMP = 1;
const TRIM = 2;
const STOP = 4;
const END = 8;

// ── Color utilities ─────────────────────────────────────────────────────

function rgbToHex(c: EmbroideryColor): string {
  return `#${((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1)}`;
}

function saturateHex(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 0xFF;
  let g = (num >> 8) & 0xFF;
  let b = num & 0xFF;
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  r = Math.min(255, Math.max(0, Math.round(gray + (r - gray) * (1 + amount))));
  g = Math.min(255, Math.max(0, Math.round(gray + (g - gray) * (1 + amount))));
  b = Math.min(255, Math.max(0, Math.round(gray + (b - gray) * (1 + amount))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

// ── Color name localization ──────────────────────────────────────────────

// Compound phrases first (multi-word), then single words
const COLOR_PHRASES_PT: [string, string][] = [
  // Greens
  ["light green", "Verde Claro"], ["dark green", "Verde Escuro"], ["lime green", "Verde Limão"],
  ["olive green", "Verde Oliva"], ["forest green", "Verde Floresta"], ["emerald green", "Verde Esmeralda"],
  ["mint green", "Verde Menta"], ["sea green", "Verde Mar"], ["bright green", "Verde Brilhante"],
  ["deep green", "Verde Intenso"], ["neon green", "Verde Neon"],
  // Blues
  ["light blue", "Azul Claro"], ["dark blue", "Azul Escuro"], ["sky blue", "Azul Céu"],
  ["navy blue", "Azul Marinho"], ["royal blue", "Azul Royal"], ["baby blue", "Azul Bebê"],
  ["deep blue", "Azul Intenso"], ["bright blue", "Azul Brilhante"],
  // Browns
  ["light brown", "Marrom Claro"], ["dark brown", "Marrom Escuro"], ["golden brown", "Marrom Dourado"],
  // Grays
  ["light gray", "Cinza Claro"], ["light grey", "Cinza Claro"],
  ["dark gray", "Cinza Escuro"], ["dark grey", "Cinza Escuro"],
  // Reds/Pinks
  ["dark red", "Vermelho Escuro"], ["bright red", "Vermelho Brilhante"], ["deep red", "Vermelho Intenso"],
  ["light pink", "Rosa Claro"], ["dark pink", "Rosa Escuro"], ["hot pink", "Rosa Pink"],
  ["rich red", "Vermelho Rico"],
  // Purples
  ["light purple", "Roxo Claro"], ["dark purple", "Roxo Escuro"], ["deep purple", "Roxo Intenso"],
  // Yellows
  ["light yellow", "Amarelo Claro"], ["dark yellow", "Amarelo Escuro"], ["golden yellow", "Amarelo Ouro"],
  ["bright yellow", "Amarelo Brilhante"], ["golden amber", "Âmbar Dourado"],
  // Others
  ["old gold", "Ouro Velho"], ["off white", "Branco Gelo"],
];

const COLOR_SINGLE_PT: Record<string, string> = {
  black: "Preto", white: "Branco", blue: "Azul", red: "Vermelho",
  green: "Verde", yellow: "Amarelo", orange: "Laranja", pink: "Rosa",
  purple: "Roxo", brown: "Marrom", gray: "Cinza", grey: "Cinza",
  gold: "Dourado", silver: "Prata", navy: "Azul Marinho",
  cyan: "Ciano", magenta: "Magenta", lime: "Verde Limão", teal: "Verde-azulado",
  coral: "Coral", salmon: "Salmão", cream: "Creme", beige: "Bege",
  ivory: "Marfim", turquoise: "Turquesa", violet: "Violeta",
  crimson: "Carmesim", scarlet: "Escarlate", emerald: "Esmeralda",
  amber: "Âmbar", indigo: "Índigo", maroon: "Bordô", olive: "Verde Oliva",
  tan: "Castanho", peach: "Pêssego", lavender: "Lavanda", khaki: "Cáqui",
};

function translateColorName(name: string | undefined, index: number): string {
  if (!name) return `Cor ${index + 1}`;
  const lower = name.toLowerCase().trim();
  // Try compound phrase match first
  for (const [en, pt] of COLOR_PHRASES_PT) {
    if (lower === en) return pt;
  }
  // Try single-word match
  if (COLOR_SINGLE_PT[lower]) return COLOR_SINGLE_PT[lower];
  // Try compound as substring (e.g. "rich red" → check phrases)
  for (const [en, pt] of COLOR_PHRASES_PT) {
    if (lower.includes(en)) return pt;
  }
  // Try to find the base color word in the name
  for (const [en, pt] of Object.entries(COLOR_SINGLE_PT)) {
    if (lower.includes(en)) return pt;
  }
  return `Cor ${index + 1}`;
}

// ── Constants ───────────────────────────────────────────────────────────

const BG_COLOR = "#f4f4f4";

const HOOP_SIZES: { label: string; w: number; h: number }[] = [
  { label: "10×10", w: 100, h: 100 },
  { label: "13×18", w: 130, h: 180 },
  { label: "16×26", w: 160, h: 260 },
  { label: "20×30", w: 200, h: 300 },
];

const CATALOG_PALETTE: EmbroideryColor[] = [
  { r: 27, g: 58, b: 92, name: "Navy Blue" },
  { r: 192, g: 57, b: 43, name: "Rich Red" },
  { r: 39, g: 174, b: 96, name: "Emerald Green" },
  { r: 243, g: 156, b: 18, name: "Golden Amber" },
  { r: 142, g: 68, b: 173, name: "Deep Purple" },
];

// ── Color block building ────────────────────────────────────────────────

interface Segment { x: number; y: number }
interface JumpSegment { from: Segment; to: Segment }
interface ColorBlock {
  colorIndex: number;
  hex: string;
  darkerHex: string;
  highlightHex: string;
  paths: Segment[][];
  jumps: JumpSegment[];
}

function buildColorBlocks(pattern: EmbroideryPattern): ColorBlock[] {
  const blocks: ColorBlock[] = [];
  let curColorIdx = pattern.stitches[0]?.color ?? 0;
  let curColor = pattern.colors[curColorIdx] || CATALOG_PALETTE[curColorIdx % CATALOG_PALETTE.length];
  let curHex = saturateHex(rgbToHex(curColor), 0.15);
  let curPaths: Segment[][] = [];
  let curJumps: JumpSegment[] = [];
  let curPath: Segment[] = [];
  let lastPt: Segment | null = null;

  for (let i = 0; i < pattern.stitches.length; i++) {
    const s = pattern.stitches[i];
    const sColor = pattern.colors[s.color] || CATALOG_PALETTE[s.color % CATALOG_PALETTE.length];
    const sHex = saturateHex(rgbToHex(sColor), 0.15);

    if (i > 0 && sHex !== curHex) {
      if (curPath.length > 0) { curPaths.push(curPath); curPath = []; }
      if (curPaths.length > 0 || curJumps.length > 0) {
        blocks.push({ colorIndex: curColorIdx, hex: curHex, darkerHex: shadeColor(curHex, -20), highlightHex: shadeColor(curHex, 60), paths: curPaths, jumps: curJumps });
        curPaths = [];
        curJumps = [];
      }
      curColorIdx = s.color;
      curColor = sColor;
      curHex = sHex;
    }

    if (s.flags === JUMP) {
      if (curPath.length > 0) { curPaths.push(curPath); curPath = []; }
      if (lastPt) {
        curJumps.push({ from: lastPt, to: { x: s.x, y: s.y } });
      }
      lastPt = { x: s.x, y: s.y };
      continue;
    }

    if (s.flags === TRIM || s.flags === (TRIM | STOP) || (s.flags & STOP) === STOP || s.flags === END) {
      if (curPath.length > 0) { curPaths.push(curPath); curPath = []; }
      lastPt = null;
      continue;
    }

    curPath.push({ x: s.x, y: s.y });
    lastPt = { x: s.x, y: s.y };
  }

  if (curPath.length > 0) curPaths.push(curPath);
  if (curPaths.length > 0 || curJumps.length > 0) {
    blocks.push({ colorIndex: curColorIdx, hex: curHex, darkerHex: shadeColor(curHex, -20), highlightHex: shadeColor(curHex, 60), paths: curPaths, jumps: curJumps });
  }

  return blocks;
}

// ── Drawing helpers ─────────────────────────────────────────────────────

function drawPaths(
  ctx: CanvasRenderingContext2D,
  paths: Segment[][],
  style: string,
  width: number,
  alpha: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  maxStitchIndex?: number,
) {
  ctx.lineWidth = width;
  ctx.strokeStyle = style;
  ctx.globalAlpha = alpha;
  let stitchCount = 0;
  for (const path of paths) {
    if (path.length < 2) { stitchCount += path.length; continue; }
    ctx.beginPath();
    ctx.moveTo(path[0].x * scale + offsetX, path[0].y * scale + offsetY);
    for (let j = 1; j < path.length; j++) {
      stitchCount++;
      if (maxStitchIndex !== undefined && stitchCount > maxStitchIndex) {
        ctx.stroke();
        return;
      }
      ctx.lineTo(path[j].x * scale + offsetX, path[j].y * scale + offsetY);
    }
    ctx.stroke();
  }
}

function drawJumps(
  ctx: CanvasRenderingContext2D,
  jumps: JumpSegment[],
  color: string,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  if (jumps.length === 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.globalAlpha = 0.7;
  ctx.lineCap = "butt";
  for (const j of jumps) {
    ctx.beginPath();
    ctx.moveTo(j.from.x * scale + offsetX, j.from.y * scale + offsetY);
    ctx.lineTo(j.to.x * scale + offsetX, j.to.y * scale + offsetY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackgroundGrid(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  pcx: number,
  pcy: number,
) {
  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.04)";
  ctx.lineWidth = 0.5;

  // Grid spacing: 10mm = 100 stitch units
  const gridUnit = 100;
  const gridPx = gridUnit * scale;

  if (gridPx < 4) { ctx.restore(); return; } // Too dense

  const centerX = pcx * scale + (offsetX - pcx * scale) + pcx * scale;
  const originX = offsetX;
  const originY = offsetY;

  // Vertical lines
  const startX = originX % gridPx;
  for (let x = startX; x < canvasW; x += gridPx) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasH);
    ctx.stroke();
  }

  // Horizontal lines
  const startY = originY % gridPx;
  for (let y = startY; y < canvasH; y += gridPx) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasW, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHoopGrid(
  ctx: CanvasRenderingContext2D,
  hoop: { w: number; h: number; label: string },
  pattern: EmbroideryPattern,
  canvasW: number,
  canvasH: number,
  zoom: number,
  panX: number,
  panY: number,
) {
  const padding = Math.min(canvasW, canvasH) * 0.1;
  const drawW = canvasW - padding * 2;
  const drawH = canvasH - padding * 2;
  const pw = pattern.right - pattern.left;
  const ph = pattern.bottom - pattern.top;
  const baseScale = Math.min(pw > 0 ? drawW / pw : 1, ph > 0 ? drawH / ph : 1);
  const scale = baseScale * zoom;

  const cx = canvasW / 2 + panX;
  const cy = canvasH / 2 + panY;
  const pcx = (pattern.left + pattern.right) / 2;
  const pcy = (pattern.top + pattern.bottom) / 2;
  const oX = cx - pcx * scale;
  const oY = cy - pcy * scale;

  const hoopWUnits = hoop.w / 0.1;
  const hoopHUnits = hoop.h / 0.1;

  const hx = pcx - hoopWUnits / 2;
  const hy = pcy - hoopHUnits / 2;

  const rx = hx * scale + oX;
  const ry = hy * scale + oY;
  const rw = hoopWUnits * scale;
  const rh = hoopHUnits * scale;

  ctx.save();
  ctx.strokeStyle = "rgba(100, 100, 100, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(rx, ry, rw, rh);

  const ccx = rx + rw / 2;
  const ccy = ry + rh / 2;
  ctx.beginPath();
  ctx.moveTo(ccx - 10, ccy);
  ctx.lineTo(ccx + 10, ccy);
  ctx.moveTo(ccx, ccy - 10);
  ctx.lineTo(ccx, ccy + 10);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(80, 80, 80, 0.6)";
  ctx.font = "11px sans-serif";
  ctx.fillText(hoop.label + " cm", rx + 4, ry - 4);
  ctx.restore();
}

function drawSequenceMarkers(
  ctx: CanvasRenderingContext2D,
  blocks: ColorBlock[],
  hiddenColors: Set<number>,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  ctx.save();
  const radius = 10;
  const font = "bold 9px sans-serif";
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (hiddenColors.has(block.colorIndex)) continue;
    const firstPath = block.paths.find(p => p.length > 0);
    if (!firstPath) continue;
    const pt = firstPath[0];
    const cx = pt.x * scale + offsetX;
    const cy = pt.y * scale + offsetY;

    // White circle with border
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.stroke();

    // Label
    ctx.fillStyle = "#333333";
    const label = i === 0 ? "1" : String(i + 1);
    ctx.fillText(label, cx, cy + 0.5);
  }
  ctx.restore();
}

function drawPattern(
  ctx: CanvasRenderingContext2D,
  blocks: ColorBlock[],
  pattern: EmbroideryPattern,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  panX: number,
  panY: number,
  hiddenColors: Set<number>,
  showJumps: boolean,
  showGrid: boolean,
  showSequence: boolean,
  maxStitchIndex?: number,
  hoopSize?: { w: number; h: number; label: string },
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (blocks.length === 0) return;

  const padding = Math.min(canvasWidth, canvasHeight) * 0.1;
  const drawW = canvasWidth - padding * 2;
  const drawH = canvasHeight - padding * 2;
  const pw = pattern.right - pattern.left;
  const ph = pattern.bottom - pattern.top;
  const baseScale = Math.min(pw > 0 ? drawW / pw : 1, ph > 0 ? drawH / ph : 1);
  const scale = baseScale * zoom;

  const cx = canvasWidth / 2 + panX;
  const cy = canvasHeight / 2 + panY;
  const pcx = (pattern.left + pattern.right) / 2;
  const pcy = (pattern.top + pattern.bottom) / 2;
  const offsetX = cx - pcx * scale;
  const offsetY = cy - pcy * scale;

  // Background grid
  if (showGrid) {
    drawBackgroundGrid(ctx, canvasWidth, canvasHeight, scale, offsetX, offsetY, pcx, pcy);
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Thinner base thickness for more precise look
  const baseThickness = Math.max(1.0, (Math.min(canvasWidth, canvasHeight) / 350) * zoom);

  let globalStitchCounter = 0;

  for (const block of blocks) {
    if (hiddenColors.has(block.colorIndex)) {
      for (const path of block.paths) globalStitchCounter += Math.max(0, path.length - 1);
      continue;
    }

    const blockStitchCount = block.paths.reduce((acc, p) => acc + Math.max(0, p.length - 1), 0);

    if (maxStitchIndex !== undefined && globalStitchCounter >= maxStitchIndex) break;

    const remaining = maxStitchIndex !== undefined ? maxStitchIndex - globalStitchCounter : undefined;

    // Shadow layer (subtle)
    drawPaths(ctx, block.paths, block.darkerHex, baseThickness * 1.2, 0.3, scale, offsetX, offsetY, remaining);
    // Main stitch layer
    drawPaths(ctx, block.paths, block.hex, baseThickness, 1.0, scale, offsetX, offsetY, remaining);
    // Highlight layer (subtle sheen)
    drawPaths(ctx, block.paths, block.highlightHex, baseThickness * 0.35, 0.2, scale, offsetX, offsetY, remaining);

    globalStitchCounter += blockStitchCount;
  }

  ctx.globalAlpha = 1.0;

  // ── SEPARATE PASS: Jump stitches on top of everything ──
  if (showJumps) {
    for (const block of blocks) {
      if (hiddenColors.has(block.colorIndex)) continue;
      drawJumps(ctx, block.jumps, "#ff0000", scale, offsetX, offsetY);
    }
  }

  if (hoopSize) {
    drawHoopGrid(ctx, hoopSize, pattern, canvasWidth, canvasHeight, zoom, panX, panY);
  }

  // ── SEPARATE PASS: Sequence markers on top of everything ──
  if (showSequence) {
    drawSequenceMarkers(ctx, blocks, hiddenColors, scale, offsetX, offsetY);
  }
}

// ── Component ───────────────────────────────────────────────────────────

interface EmbroideryViewerProps {
  pattern: EmbroideryPattern;
  className?: string;
}

export function EmbroideryViewer({ pattern, className = "" }: EmbroideryViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const blocksRef = useRef<ColorBlock[]>([]);

  const [hiddenColors, setHiddenColors] = useState<Set<number>>(new Set());
  const [hoopIndex, setHoopIndex] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const simRef = useRef<number>(0);
  const totalNormalRef = useRef(0);
  const [showJumps, setShowJumps] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showSequence, setShowSequence] = useState(false);

  useEffect(() => {
    if (pattern.stitches.length > 0) {
      blocksRef.current = buildColorBlocks(pattern);
      totalNormalRef.current = pattern.stitches.filter(s => s.flags === NORMAL).length;
    }
  }, [pattern]);

  const colorLayerInfo = useMemo(() => {
    const map = new Map<number, { color: EmbroideryColor; stitchCount: number; order: number }>();
    let orderCounter = 0;
    for (const s of pattern.stitches) {
      if (s.flags !== NORMAL) continue;
      if (!map.has(s.color)) {
        map.set(s.color, {
          color: pattern.colors[s.color] || CATALOG_PALETTE[s.color % CATALOG_PALETTE.length],
          stitchCount: 0,
          order: orderCounter++,
        });
      }
      map.get(s.color)!.stitchCount++;
    }
    return Array.from(map.entries()).sort((a, b) => a[1].order - b[1].order);
  }, [pattern]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const maxIdx = simulating ? simProgress : undefined;
    const hoop = hoopIndex !== null ? HOOP_SIZES[hoopIndex] : undefined;

    drawPattern(ctx, blocksRef.current, pattern, rect.width, rect.height, zoom, pan.x, pan.y, hiddenColors, showJumps, showGrid, maxIdx, hoop);
  }, [pattern, zoom, pan, hiddenColors, simulating, simProgress, hoopIndex, showJumps, showGrid]);

  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [render]);

  useEffect(() => {
    if (!simulating) return;
    const total = totalNormalRef.current;
    if (total === 0) { setSimulating(false); return; }

    const step = Math.max(1, Math.floor(total / 400));
    let current = simProgress;

    const tick = () => {
      current += step;
      if (current >= total) {
        setSimProgress(total);
        setSimulating(false);
        return;
      }
      setSimProgress(current);
      simRef.current = requestAnimationFrame(tick);
    };
    simRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(simRef.current);
  }, [simulating]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(20, z * delta)));
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setShowJumps(false);
    setShowGrid(false);
    setHoopIndex(null);
    setHiddenColors(new Set());
    setSimulating(false);
    setSimProgress(0);
  };

  const toggleSimulation = () => {
    if (simulating) {
      setSimulating(false);
    } else {
      setSimProgress(0);
      setSimulating(true);
    }
  };

  const toggleColor = (colorIdx: number) => {
    setHiddenColors(prev => {
      const next = new Set(prev);
      if (next.has(colorIdx)) next.delete(colorIdx);
      else next.add(colorIdx);
      return next;
    });
  };

  const normalStitches = pattern.stitches.filter(s => s.flags === NORMAL).length;
  const jumpStitches = pattern.stitches.filter(s => s.flags === JUMP).length;
  const colorCount = new Set(pattern.stitches.map(s => s.color)).size;
  const pw = pattern.right - pattern.left;
  const ph = pattern.bottom - pattern.top;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 rounded-t-xl flex-wrap gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(20, z * 1.3))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.2, z / 1.3))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetView} title="Resetar visualização">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-1">{Math.round(zoom * 100)}%</span>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Simulate */}
          <Button
            variant={simulating ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={toggleSimulation}
          >
            {simulating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {simulating ? "Pausar" : "Simular"}
          </Button>

          {/* Jump stitch toggle */}
          <Button
            variant={showJumps ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowJumps(v => !v)}
            title="Mostrar/ocultar saltos"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Saltos
          </Button>

          {/* Grid toggle */}
          <Button
            variant={showGrid ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowGrid(v => !v)}
            title="Mostrar/ocultar grade"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            Grade
          </Button>

          {/* Hoop selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={hoopIndex !== null ? "default" : "outline"} size="sm" className="h-8 gap-1.5 text-xs">
                <Eye className="h-3.5 w-3.5" />
                Bastidor
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-2" align="start">
              <div className="space-y-1">
                <button
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors ${hoopIndex === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
                  onClick={() => setHoopIndex(null)}
                >
                  Sem bastidor
                </button>
                {HOOP_SIZES.map((h, i) => (
                  <button
                    key={h.label}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors ${hoopIndex === i ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
                    onClick={() => setHoopIndex(i)}
                  >
                    {h.label} cm
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Technical data */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{normalStitches.toLocaleString()} pontos</span>
          <span>{colorCount} cor{colorCount !== 1 ? "es" : ""}</span>
          <span>{(pw * 0.1).toFixed(1)}×{(ph * 0.1).toFixed(1)} mm</span>
          <span className="text-primary font-medium">Saltos detectados: {jumpStitches}</span>
        </div>
      </div>

      {/* Simulation progress bar */}
      {simulating && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-75"
            style={{ width: `${totalNormalRef.current > 0 ? (simProgress / totalNormalRef.current) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* Canvas + Color Panel side by side */}
      <div className="flex flex-1 min-h-[300px] rounded-b-xl border border-t-0 border-border overflow-hidden">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden"
          style={{ cursor: isDragging ? "grabbing" : "grab", backgroundColor: BG_COLOR }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        {/* Color Layer Panel */}
        {colorLayerInfo.length > 0 && (
          <div className="w-52 border-l border-border bg-background flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-border">
              <h3 className="text-xs font-semibold text-foreground">Cores da matriz</h3>
              <p className="text-[10px] text-muted-foreground">{colorLayerInfo.length} cor{colorLayerInfo.length !== 1 ? "es" : ""}</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {colorLayerInfo.map(([idx, info]) => {
                  const hex = saturateHex(rgbToHex(info.color), 0.15);
                  const isVisible = !hiddenColors.has(idx);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-opacity ${isVisible ? "opacity-100" : "opacity-50"}`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-border shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {translateColorName(info.color.name, info.order)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {info.stitchCount.toLocaleString()} pontos
                        </p>
                      </div>
                      <Switch
                        checked={isVisible}
                        onCheckedChange={() => toggleColor(idx)}
                        className="scale-75"
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

export type { EmbroideryPattern, EmbroideryColor, Stitch } from "@/lib/embroideryPreview";
