import { useRef, useEffect, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Play, Pause, Grid3X3, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EmbroideryPattern, EmbroideryColor, Stitch } from "@/lib/embroideryPreview";

const NORMAL = 0;
const JUMP = 1;
const TRIM = 2;
const STOP = 4;
const END = 8;

function rgbToHex(c: EmbroideryColor): string {
  return `#${((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1)}`;
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

// ── Hoop sizes in mm ────────────────────────────────────────────────────

const HOOP_SIZES: { label: string; w: number; h: number }[] = [
  { label: "10×10", w: 100, h: 100 },
  { label: "13×18", w: 130, h: 180 },
  { label: "16×26", w: 160, h: 260 },
  { label: "20×30", w: 200, h: 300 },
];

// ── Color block building ────────────────────────────────────────────────

interface Segment { x: number; y: number }
interface ColorBlock { colorIndex: number; hex: string; darkerHex: string; highlightHex: string; paths: Segment[][] }

const CATALOG_PALETTE: EmbroideryColor[] = [
  { r: 27, g: 58, b: 92, name: "Navy Blue" },
  { r: 192, g: 57, b: 43, name: "Rich Red" },
  { r: 39, g: 174, b: 96, name: "Emerald Green" },
  { r: 243, g: 156, b: 18, name: "Golden Amber" },
  { r: 142, g: 68, b: 173, name: "Deep Purple" },
];

function buildColorBlocks(pattern: EmbroideryPattern): ColorBlock[] {
  const blocks: ColorBlock[] = [];
  let curColorIdx = pattern.stitches[0]?.color ?? 0;
  let curColor = pattern.colors[curColorIdx] || CATALOG_PALETTE[curColorIdx % CATALOG_PALETTE.length];
  let curHex = rgbToHex(curColor);
  let curPaths: Segment[][] = [];
  let curPath: Segment[] = [];

  for (let i = 0; i < pattern.stitches.length; i++) {
    const s = pattern.stitches[i];
    const sColor = pattern.colors[s.color] || CATALOG_PALETTE[s.color % CATALOG_PALETTE.length];
    const sHex = rgbToHex(sColor);

    if (i > 0 && sHex !== curHex) {
      if (curPath.length > 0) { curPaths.push(curPath); curPath = []; }
      if (curPaths.length > 0) {
        blocks.push({ colorIndex: curColorIdx, hex: curHex, darkerHex: shadeColor(curHex, -25), highlightHex: shadeColor(curHex, 70), paths: curPaths });
        curPaths = [];
      }
      curColorIdx = s.color;
      curColor = sColor;
      curHex = sHex;
    }

    if (s.flags === JUMP || s.flags === TRIM || s.flags === (TRIM | STOP) ||
        (s.flags & STOP) === STOP || s.flags === END) {
      if (curPath.length > 0) { curPaths.push(curPath); curPath = []; }
      continue;
    }

    curPath.push({ x: s.x, y: s.y });
  }

  if (curPath.length > 0) curPaths.push(curPath);
  if (curPaths.length > 0) {
    blocks.push({ colorIndex: curColorIdx, hex: curHex, darkerHex: shadeColor(curHex, -25), highlightHex: shadeColor(curHex, 70), paths: curPaths });
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
  const padding = Math.min(canvasW, canvasH) * 0.08;
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

  // Convert hoop mm to stitch units (1 unit ≈ 0.1mm)
  const hoopWUnits = hoop.w / 0.1;
  const hoopHUnits = hoop.h / 0.1;

  const hx = pcx - hoopWUnits / 2;
  const hy = pcy - hoopHUnits / 2;

  const rx = hx * scale + oX;
  const ry = hy * scale + oY;
  const rw = hoopWUnits * scale;
  const rh = hoopHUnits * scale;

  ctx.save();
  ctx.strokeStyle = "rgba(120, 120, 120, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(rx, ry, rw, rh);

  // Center crosshair
  const ccx = rx + rw / 2;
  const ccy = ry + rh / 2;
  ctx.beginPath();
  ctx.moveTo(ccx - 10, ccy);
  ctx.lineTo(ccx + 10, ccy);
  ctx.moveTo(ccx, ccy - 10);
  ctx.lineTo(ccx, ccy + 10);
  ctx.stroke();

  // Label
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(80, 80, 80, 0.7)";
  ctx.font = "11px sans-serif";
  ctx.fillText(hoop.label + " cm", rx + 4, ry - 4);
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
  maxStitchIndex?: number,
  hoopSize?: { w: number; h: number; label: string },
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (blocks.length === 0) return;

  const padding = Math.min(canvasWidth, canvasHeight) * 0.08;
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

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const baseThickness = Math.max(1.5, (Math.min(canvasWidth, canvasHeight) / 250) * zoom);

  let globalStitchCounter = 0;

  for (const block of blocks) {
    if (hiddenColors.has(block.colorIndex)) {
      // Count stitches in this block even if hidden (for simulation progress)
      for (const path of block.paths) globalStitchCounter += Math.max(0, path.length - 1);
      continue;
    }

    const blockStitchCount = block.paths.reduce((acc, p) => acc + Math.max(0, p.length - 1), 0);

    if (maxStitchIndex !== undefined && globalStitchCounter >= maxStitchIndex) break;

    const remaining = maxStitchIndex !== undefined ? maxStitchIndex - globalStitchCounter : undefined;

    drawPaths(ctx, block.paths, block.darkerHex, baseThickness * 1.3, 0.45, scale, offsetX, offsetY, remaining);
    drawPaths(ctx, block.paths, block.hex, baseThickness, 1.0, scale, offsetX, offsetY, remaining);
    drawPaths(ctx, block.paths, block.highlightHex, baseThickness * 0.4, 0.3, scale, offsetX, offsetY, remaining);

    globalStitchCounter += blockStitchCount;
  }

  ctx.globalAlpha = 1.0;

  // Draw hoop grid overlay
  if (hoopSize) {
    drawHoopGrid(ctx, hoopSize, pattern, canvasWidth, canvasHeight, zoom, panX, panY);
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

  // New features state
  const [hiddenColors, setHiddenColors] = useState<Set<number>>(new Set());
  const [hoopIndex, setHoopIndex] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const simRef = useRef<number>(0);
  const totalNormalRef = useRef(0);

  // Build color blocks once
  useEffect(() => {
    if (pattern.stitches.length > 0) {
      blocksRef.current = buildColorBlocks(pattern);
      totalNormalRef.current = pattern.stitches.filter(s => s.flags === NORMAL).length;
    }
  }, [pattern]);

  // Get unique color indices used
  const usedColors = (() => {
    const map = new Map<number, EmbroideryColor>();
    for (const s of pattern.stitches) {
      if (!map.has(s.color)) {
        map.set(s.color, pattern.colors[s.color] || CATALOG_PALETTE[s.color % CATALOG_PALETTE.length]);
      }
    }
    return Array.from(map.entries());
  })();

  // Render
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

    drawPattern(ctx, blocksRef.current, pattern, rect.width, rect.height, zoom, pan.x, pan.y, hiddenColors, maxIdx, hoop);
  }, [pattern, zoom, pan, hiddenColors, simulating, simProgress, hoopIndex]);

  useEffect(() => { render(); }, [render]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [render]);

  // Simulation animation
  useEffect(() => {
    if (!simulating) return;
    const total = totalNormalRef.current;
    if (total === 0) { setSimulating(false); return; }

    const step = Math.max(1, Math.floor(total / 400)); // ~400 frames
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

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(20, z * delta)));
  }, []);

  // Double-click fit
  const handleDoubleClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Drag pan
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

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

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
  const colorCount = new Set(pattern.stitches.map(s => s.color)).size;
  const pw = pattern.right - pattern.left;
  const ph = pattern.bottom - pattern.top;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 rounded-t-xl flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(20, z * 1.3))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.2, z / 1.3))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetView}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-1">{Math.round(zoom * 100)}%</span>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Simulate button */}
          <Button
            variant={simulating ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={toggleSimulation}
          >
            {simulating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {simulating ? "Pausar" : "Simular bordado"}
          </Button>

          {/* Hoop grid selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={hoopIndex !== null ? "default" : "outline"} size="sm" className="h-8 gap-1.5 text-xs">
                <Grid3X3 className="h-3.5 w-3.5" />
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

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[300px] bg-background rounded-b-xl border border-t-0 border-border overflow-hidden"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Color legend with toggle */}
      {usedColors.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
          {usedColors.slice(0, 20).map(([idx, c]) => {
            const isHidden = hiddenColors.has(idx);
            return (
              <button
                key={idx}
                className={`flex items-center gap-1.5 text-xs transition-opacity ${isHidden ? "opacity-40" : "opacity-100"}`}
                onClick={() => toggleColor(idx)}
                title={isHidden ? "Mostrar cor" : "Ocultar cor"}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full border border-border flex items-center justify-center"
                  style={{ backgroundColor: isHidden ? "transparent" : rgbToHex(c) }}
                >
                  {isHidden && <EyeOff className="h-2.5 w-2.5 text-muted-foreground" />}
                </div>
                <span className="text-muted-foreground">{c.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { EmbroideryPattern, EmbroideryColor, Stitch };
