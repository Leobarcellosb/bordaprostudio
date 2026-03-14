import { useEffect, useState, useRef, useCallback } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Download, Image as ImageIcon, Layers, RotateCcw, ZoomIn, Move, Palette } from "lucide-react";
import {
  MOCKUP_TEMPLATES,
  FABRIC_COLORS,
  CANVAS_SIZE,
  CANVAS_BG,
  getMockupBaseSrc,
  getMockupSrc,
  renderMockup,
  type ColorId,
} from "@/lib/mockupTemplates";

const MockupSimulator = () => {
  const [kits, setKits] = useState<any[]>([]);
  const [selectedKit, setSelectedKit] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(MOCKUP_TEMPLATES[0]);
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

    const mockupSrc = getMockupBaseSrc(selectedTemplate.id);
    const mockupImg = new Image();
    mockupImg.crossOrigin = "anonymous";
    mockupImg.onload = () => {
      if (selectedKit?.cover_image) {
        const designImg = new Image();
        designImg.crossOrigin = "anonymous";
        designImg.onload = () => {
          renderMockup(ctx, mockupImg, designImg, selectedTemplate, scale, offsetX, offsetY, selectedColor.hex);
        };
        designImg.onerror = () => {
          renderMockup(ctx, mockupImg, null, selectedTemplate, scale, offsetX, offsetY, selectedColor.hex);
        };
        designImg.src = selectedKit.cover_image;
      } else {
        renderMockup(ctx, mockupImg, null, selectedTemplate, scale, offsetX, offsetY);
      }
    };
    mockupImg.onerror = () => {
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    };
    mockupImg.src = mockupSrc;
  }, [selectedKit, selectedTemplate, selectedColor, scale, offsetX, offsetY]);

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
      link.download = `mockup-${selectedTemplate.id}-${selectedColor.id}-${selectedKit?.name || "matriz"}.png`;
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
                  {MOCKUP_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                        selectedTemplate.id === tpl.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/40 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <img
                        src={getMockupSrc(tpl.id, "branco")}
                        alt={tpl.label}
                        className="w-12 h-12 rounded-md object-cover bg-muted/50"
                      />
                      <span className="text-sm font-medium">{tpl.label}</span>
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
                <div
                  className="aspect-square flex items-center justify-center relative"
                  style={{ backgroundColor: CANVAS_BG }}
                >
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
                  <p className="text-sm font-medium">{selectedKit.name} × {selectedTemplate.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Cor: {selectedColor.label} · Canvas: {CANVAS_SIZE}×{CANVAS_SIZE}px
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
