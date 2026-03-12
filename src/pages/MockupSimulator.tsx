import { useEffect, useState, useRef, useCallback } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Download, Image as ImageIcon, Layers, RotateCcw, ZoomIn, Move, Palette } from "lucide-react";

const MOCKUPS = [
  { id: "baby-towel", label: "Toalha de Bebê", src: "/mockups/baby-towel.jpg", overlayArea: { x: 0.25, y: 0.45, w: 0.5, h: 0.35 } },
  { id: "dish-towel", label: "Pano de Prato", src: "/mockups/dish-towel.jpg", overlayArea: { x: 0.2, y: 0.3, w: 0.6, h: 0.4 } },
  { id: "baby-bib", label: "Babador", src: "/mockups/baby-bib.jpg", overlayArea: { x: 0.3, y: 0.4, w: 0.4, h: 0.3 } },
  { id: "baby-clothes", label: "Roupinha de Bebê", src: "/mockups/baby-clothes.jpg", overlayArea: { x: 0.3, y: 0.3, w: 0.4, h: 0.35 } },
  { id: "pillow-cover", label: "Capa de Almofada", src: "/mockups/pillow-cover.jpg", overlayArea: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } },
];

const FABRIC_COLORS = [
  { id: "branco", label: "Branco", hex: "#FFFFFF" },
  { id: "preto", label: "Preto", hex: "#1A1A1A" },
  { id: "bege", label: "Bege/Cru", hex: "#E8DCC8" },
  { id: "rosa", label: "Rosa Claro", hex: "#F4C2C2" },
  { id: "azul-bebe", label: "Azul Bebê", hex: "#B5D8F7" },
  { id: "cinza", label: "Cinza Mescla", hex: "#B0B0B0" },
  { id: "vermelho", label: "Vermelho", hex: "#C41E3A" },
  { id: "marinho", label: "Azul Marinho", hex: "#1B2A4A" },
];

const MockupSimulator = () => {
  const [kits, setKits] = useState<any[]>([]);
  const [selectedKit, setSelectedKit] = useState<any>(null);
  const [selectedMockup, setSelectedMockup] = useState(MOCKUPS[0]);
  const [selectedColor, setSelectedColor] = useState(FABRIC_COLORS[0]);
  const [scale, setScale] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    db.from("designs")
      .select("id, name, cover_image, categories(name)")
      .eq("is_published", true)
      .order("name")
      .then(({ data }: any) => setKits(data || []));
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mockupImg = new Image();
    mockupImg.crossOrigin = "anonymous";
    mockupImg.onload = () => {
      canvas.width = mockupImg.width;
      canvas.height = mockupImg.height;

      // --- Layer 1: Base mockup (texture, shadows, lighting) ---
      ctx.drawImage(mockupImg, 0, 0);

      // --- Layer 2: Fabric color tint (preserves texture/shadows) ---
      if (selectedColor.id !== "branco") {
        // Extract luminance from the original mockup to preserve shadows/highlights
        const offscreen = document.createElement("canvas");
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const offCtx = offscreen.getContext("2d")!;

        // Draw grayscale version of mockup (luminance map)
        offCtx.drawImage(mockupImg, 0, 0);
        offCtx.globalCompositeOperation = "saturation";
        offCtx.fillStyle = "hsl(0, 0%, 50%)";
        offCtx.fillRect(0, 0, offscreen.width, offscreen.height);

        // On the main canvas: apply color via multiply (tints darks, preserves whites)
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = selectedColor.hex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Restore highlights using the luminance map with screen blend
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.08;
        ctx.drawImage(offscreen, 0, 0);
        ctx.globalAlpha = 1;

        // Restore texture detail from original via overlay at low opacity
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = 0.25;
        ctx.drawImage(mockupImg, 0, 0);
        ctx.globalAlpha = 1;

        ctx.globalCompositeOperation = "source-over";
      }

      // --- Layer 3: Embroidery design (unaffected by tint) ---
        const designImg = new Image();
        designImg.crossOrigin = "anonymous";
        designImg.onload = () => {
          const area = selectedMockup.overlayArea;
          const scaleFactor = scale / 100;
          const baseW = canvas.width * area.w * scaleFactor;
          const baseH = canvas.height * area.h * scaleFactor;

          const ratio = designImg.width / designImg.height;
          let drawW = baseW;
          let drawH = baseW / ratio;
          if (drawH > baseH) {
            drawH = baseH;
            drawW = baseH * ratio;
          }

          const centerX = canvas.width * area.x + (canvas.width * area.w - drawW) / 2 + offsetX * canvas.width * 0.002;
          const centerY = canvas.height * area.y + (canvas.height * area.h - drawH) / 2 + offsetY * canvas.height * 0.002;

          ctx.globalAlpha = 0.88;
          ctx.drawImage(designImg, centerX, centerY, drawW, drawH);
          ctx.globalAlpha = 1;
        };
        designImg.src = selectedKit.cover_image;
      }
    };
    mockupImg.src = selectedMockup.src;
  }, [selectedKit, selectedMockup, selectedColor, scale, offsetX, offsetY]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    try {
      const link = document.createElement("a");
      link.download = `mockup-${selectedMockup.id}-${selectedColor.id}-${selectedKit?.name || "matriz"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Mockup baixado com sucesso!");
    } catch {
      toast.error("Erro ao baixar mockup");
    }
    setRendering(false);
  };

  const resetPosition = () => {
    setScale(100);
    setOffsetX(0);
    setOffsetY(0);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Simulador de Mockup</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Aplique seus bordados em produtos reais</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel - Controls */}
          <div className="space-y-5">
            {/* Design selection */}
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" /> Selecione a Matriz
                </p>
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {kits.map((kit: any) => (
                    <button
                      key={kit.id}
                      onClick={() => setSelectedKit(kit)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedKit?.id === kit.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border/40 hover:border-border"
                      }`}
                    >
                      {kit.cover_image ? (
                        <img src={kit.cover_image} alt={kit.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-2xl">🧵</div>
                      )}
                    </button>
                  ))}
                  {kits.length === 0 && (
                    <p className="col-span-3 text-sm text-muted-foreground text-center py-4">Nenhuma matriz disponível</p>
                  )}
                </div>
                {selectedKit && (
                  <div className="pt-1">
                    <p className="text-sm font-medium truncate">{selectedKit.name}</p>
                    {selectedKit.categories?.name && (
                      <Badge variant="secondary" className="text-[10px] mt-1">{selectedKit.categories.name}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mockup selection */}
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Selecione o Produto
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {MOCKUPS.map((mockup) => (
                    <button
                      key={mockup.id}
                      onClick={() => setSelectedMockup(mockup)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                        selectedMockup.id === mockup.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/40 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <img src={mockup.src} alt={mockup.label} className="w-12 h-12 rounded-md object-cover" />
                      <span className="text-sm font-medium">{mockup.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Color selection */}
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" /> Cor do Produto
                </p>
                <div className="flex flex-wrap gap-2">
                  {FABRIC_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color)}
                      title={color.label}
                      className={`group relative w-9 h-9 rounded-full border-2 transition-all ${
                        selectedColor.id === color.id
                          ? "border-primary ring-2 ring-primary/30 scale-110"
                          : "border-border/50 hover:border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedColor.id === color.id && (
                        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
                          ["preto", "marinho", "vermelho"].includes(color.id) ? "text-white" : "text-foreground"
                        }`}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{selectedColor.label}</p>
              </CardContent>
            </Card>

            {/* Position controls */}
            {selectedKit && (
              <Card className="border-border/60">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Move className="h-4 w-4 text-primary" /> Ajustes
                    </p>
                    <Button variant="ghost" size="sm" onClick={resetPosition} className="h-7 text-xs gap-1">
                      <RotateCcw className="h-3 w-3" /> Reset
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <ZoomIn className="h-3 w-3" /> Tamanho
                        </label>
                        <span className="text-xs font-mono text-muted-foreground">{scale}%</span>
                      </div>
                      <Slider value={[scale]} onValueChange={([v]) => setScale(v)} min={30} max={200} step={5} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-muted-foreground">Posição X</label>
                        <span className="text-xs font-mono text-muted-foreground">{offsetX}</span>
                      </div>
                      <Slider value={[offsetX]} onValueChange={([v]) => setOffsetX(v)} min={-100} max={100} step={1} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-muted-foreground">Posição Y</label>
                        <span className="text-xs font-mono text-muted-foreground">{offsetY}</span>
                      </div>
                      <Slider value={[offsetY]} onValueChange={([v]) => setOffsetY(v)} min={-100} max={100} step={1} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right panel - Preview + Download */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border/60 overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-square bg-muted/30 flex items-center justify-center relative">
                  {!selectedKit ? (
                    <div className="text-center space-y-3 p-8">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                        <Layers className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Selecione um design</p>
                        <p className="text-sm text-muted-foreground/60">Escolha um design e um produto para gerar o mockup</p>
                      </div>
                    </div>
                  ) : (
                    <canvas ref={canvasRef} className="w-full h-full object-contain" />
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedKit && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{selectedKit.name} × {selectedMockup.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Cor: {selectedColor.label} · Ajuste o tamanho e posição antes de baixar
                  </p>
                </div>
                <Button onClick={handleDownload} disabled={rendering} className="gap-2">
                  <Download className="h-4 w-4" />
                  {rendering ? "Gerando..." : "Baixar Mockup"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MockupSimulator;
