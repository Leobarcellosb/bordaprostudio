import { useEffect, useState, useRef, useCallback } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Image as ImageIcon, Layers, Palette } from "lucide-react";
import {
  MOCKUP_TEMPLATES,
  FABRIC_COLORS,
  CANVAS_SIZE,
  CANVAS_BG,
  getMockupBaseSrc,
  loadImage,
  renderMockup,
  type FabricColor,
  type MockupTemplate,
} from "@/lib/mockupEngine";

const MockupSimulator = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MockupTemplate>(MOCKUP_TEMPLATES[0]);
  const [selectedColor, setSelectedColor] = useState<FabricColor>(FABRIC_COLORS[0]);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load published designs
  useEffect(() => {
    db.from("designs")
      .select("id, name, cover_image, categories(name)")
      .eq("is_published", true)
      .order("name")
      .then(({ data }: any) => setDesigns(data || []));
  }, []);

  // Render canvas whenever inputs change
  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const baseImg = await loadImage(getMockupBaseSrc(selectedTemplate.id));
      let designImg: HTMLImageElement | null = null;

      if (selectedDesign?.cover_image) {
        try {
          designImg = await loadImage(selectedDesign.cover_image);
        } catch {
          // Design image failed to load — render without it
        }
      }

      renderMockup(ctx, baseImg, designImg, selectedTemplate, 100, 0, 0, selectedColor.hex);
    } catch {
      // Base mockup image failed — show blank canvas
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
  }, [selectedDesign, selectedTemplate, selectedColor]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendering(true);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const link = document.createElement("a");
      link.download = `mockup-${selectedTemplate.id}-${selectedColor.id}-${selectedDesign?.name || "produto"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Mockup baixado com sucesso!");
    } catch {
      toast.error("Erro ao baixar mockup");
    }
    setRendering(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
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
          {/* ─── Left: Controls ─── */}
          <div className="space-y-5">
            {/* Step 1: Select design */}
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  1. Selecione o Bordado
                </p>
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {designs.map((d: any) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDesign(d)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedDesign?.id === d.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border/40 hover:border-border"
                      }`}
                    >
                      {d.cover_image ? (
                        <img src={d.cover_image} alt={d.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-2xl">🧵</div>
                      )}
                    </button>
                  ))}
                  {designs.length === 0 && (
                    <p className="col-span-3 text-sm text-muted-foreground text-center py-4">
                      Nenhuma matriz disponível
                    </p>
                  )}
                </div>
                {selectedDesign && (
                  <div className="pt-1">
                    <p className="text-sm font-medium truncate">{selectedDesign.name}</p>
                    {selectedDesign.categories?.name && (
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        {selectedDesign.categories.name}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Select product */}
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  2. Selecione o Produto
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
                        src={getMockupBaseSrc(tpl.id)}
                        alt={tpl.label}
                        className="w-12 h-12 rounded-md object-cover bg-muted/50"
                      />
                      <span className="text-sm font-medium">{tpl.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Select color */}
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  3. Cor do Produto
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
                        <span
                          className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
                            ["preto", "marinho", "vermelho"].includes(color.id)
                              ? "text-white"
                              : "text-foreground"
                          }`}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{selectedColor.label}</p>
              </CardContent>
            </Card>
          </div>

          {/* ─── Right: Preview + Download ─── */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border/60 overflow-hidden">
              <CardContent className="p-0">
                <div
                  className="aspect-square flex items-center justify-center relative"
                  style={{ backgroundColor: CANVAS_BG }}
                >
                  {!selectedDesign ? (
                    <div className="text-center space-y-3 p-8">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                        <Layers className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Selecione um bordado</p>
                        <p className="text-sm text-muted-foreground/60">
                          Escolha um bordado e um produto para gerar o mockup
                        </p>
                      </div>
                    </div>
                  ) : (
                    <canvas ref={canvasRef} className="w-full h-full object-contain" />
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedDesign && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {selectedDesign.name} × {selectedTemplate.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cor: {selectedColor.label} · {CANVAS_SIZE}×{CANVAS_SIZE}px
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
