import { useRef, useEffect, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types matching embroideryPreview.ts ──────────────────────────────────

interface Stitch {
  x: number;
  y: number;
  flags: number;
  color: number;
}

interface EmbroideryColor {
  r: number;
  g: number;
  b: number;
  name: string;
}

interface EmbroideryPattern {
  stitches: Stitch[];
  colors: EmbroideryColor[];
  top: number;
  bottom: number;
  left: number;
  right: number;
}

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

// ── Rendering ───────────────────────────────────────────────────────────

interface Segment { x: number; y: number }
interface ColorBlock { hex: string; darkerHex: string; highlightHex: string; paths: Segment[][] }

function buildColorBlocks(pattern: EmbroideryPattern): ColorBlock[] {
  const CATALOG_PALETTE: EmbroideryColor[] = [
    { r: 27, g: 58, b: 92, name: "Navy Blue" },
    { r: 192, g: 57, b: 43, name: "Rich Red" },
    { r: 39, g: 174, b: 96, name: "Emerald Green" },
    { r: 243, g: 156, b: 18, name: "Golden Amber" },
    { r: 142, g: 68, b: 173, name: "Deep Purple" },
  ];

  const blocks: ColorBlock[] = [];
  let curColor = pattern.colors[pattern.stitches[0]?.color] || CATALOG_PALETTE[0];
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
        blocks.push({ hex: curHex, darkerHex: shadeColor(curHex, -25), highlightHex: shadeColor(curHex, 70), paths: curPaths });
        curPaths = [];
      }
      curColor = sColor;
      curHex = sHex;
    }

    // Skip jumps, trims, stops, ends
    if (s.flags === JUMP || s.flags === TRIM || s.flags === (TRIM | STOP) ||
        (s.flags & STOP) === STOP || s.flags === END) {
      if (curPath.length > 0) { curPaths.push(curPath); curPath = []; }
      continue;
    }

    curPath.push({ x: s.x, y: s.y });
  }

  if (curPath.length > 0) curPaths.push(curPath);
  if (curPaths.length > 0) {
    blocks.push({ hex: curHex, darkerHex: shadeColor(curHex, -25), highlightHex: shadeColor(curHex, 70), paths: curPaths });
  }

  return blocks;
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
  mode: "commercial" | "technical" = "technical",
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (mode === "technical") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    // Checkerboard to visualize transparency
    const cSize = 12;
    for (let y = 0; y < canvasHeight; y += cSize) {
      for (let x = 0; x < canvasWidth; x += cSize) {
        ctx.fillStyle = ((x / cSize + y / cSize) % 2 === 0) ? "#f0f0f0" : "#e0e0e0";
        ctx.fillRect(x, y, cSize, cSize);
      }
    }
  }

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

  const drawPaths = (paths: Segment[][], style: string, width: number, alpha: number) => {
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.globalAlpha = alpha;
    for (const path of paths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x * scale + offsetX, path[0].y * scale + offsetY);
      for (let j = 1; j < path.length; j++) {
        ctx.lineTo(path[j].x * scale + offsetX, path[j].y * scale + offsetY);
      }
      ctx.stroke();
    }
  };

  if (mode === "commercial") {
    // Fine, delicate thread rendering — resembles real embroidery thread
    const size = Math.min(canvasWidth, canvasHeight);
    const rawThickness = (size / 600) * Math.sqrt(zoom);
    const baseThickness = Math.max(0.6, Math.min(1.2, rawThickness));
    for (const block of blocks) {
      // Subtle shadow for depth — very light
      drawPaths(block.paths, block.darkerHex, baseThickness * 1.15, 0.12);
      // Main thread stroke — slightly transparent for overlap blending
      drawPaths(block.paths, block.hex, baseThickness, 0.85);
      // Fine sheen highlight
      drawPaths(block.paths, block.highlightHex, baseThickness * 0.25, 0.1);
    }
  } else {
    // Technical: thick, full opacity for stitch analysis
    const baseThickness = Math.max(1.5, (Math.min(canvasWidth, canvasHeight) / 250) * zoom);
    for (const block of blocks) {
      drawPaths(block.paths, block.darkerHex, baseThickness * 1.3, 0.45);
      drawPaths(block.paths, block.hex, baseThickness, 1.0);
      drawPaths(block.paths, block.highlightHex, baseThickness * 0.4, 0.3);
    }
  }

  ctx.globalAlpha = 1.0;
}

// ── Component ───────────────────────────────────────────────────────────

interface EmbroideryViewerProps {
  pattern: EmbroideryPattern;
  className?: string;
  mode?: "commercial" | "technical";
}

export function EmbroideryViewer({ pattern, className = "", mode = "technical" }: EmbroideryViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const blocksRef = useRef<ColorBlock[]>([]);

  // Build color blocks once
  useEffect(() => {
    if (pattern.stitches.length > 0) {
      blocksRef.current = buildColorBlocks(pattern);
    }
  }, [pattern]);

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

    drawPattern(ctx, blocksRef.current, pattern, rect.width, rect.height, zoom, pan.x, pan.y, mode);
  }, [pattern, zoom, pan, mode]);

  useEffect(() => {
    render();
  }, [render]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => render());
    ro.observe(container);
    return () => ro.disconnect();
  }, [render]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(20, z * delta)));
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

  const normalStitches = pattern.stitches.filter(s => s.flags === NORMAL).length;
  const colorCount = new Set(pattern.stitches.map(s => s.color)).size;
  const pw = pattern.right - pattern.left;
  const ph = pattern.bottom - pattern.top;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 rounded-t-xl">
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
          <span className="text-xs text-muted-foreground ml-2">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{normalStitches.toLocaleString()} pontos</span>
          <span>{colorCount} cor{colorCount !== 1 ? "es" : ""}</span>
          <span>{(pw * 0.1).toFixed(1)}×{(ph * 0.1).toFixed(1)} mm</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[300px] bg-white rounded-b-xl border border-t-0 border-border overflow-hidden"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Color legend */}
      {pattern.colors.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {pattern.colors.slice(0, 20).map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div
                className="w-3.5 h-3.5 rounded-full border border-border"
                style={{ backgroundColor: rgbToHex(c) }}
              />
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Re-export pattern type for external use
export type { EmbroideryPattern, EmbroideryColor, Stitch };
