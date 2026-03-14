import { useEffect, useState, useRef, useCallback } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Download, Image as ImageIcon, Layers, RotateCcw, ZoomIn, Move, Palette,
  Camera, MessageCircle, Instagram, BookOpen, Check,
} from "lucide-react";
import {
  MOCKUP_TEMPLATES,
  FABRIC_COLORS,
  CANVAS_SIZE,
  CANVAS_BG,
  getMockupBaseSrc,
  getMockupSrc,
  renderMockup,
  type ColorId,
  type MockupTemplate,
} from "@/lib/mockupTemplates";
import { useSearchParams } from "react-router-dom";

// Only show products relevant for embroidery sales
const SALES_PRODUCTS = ["baby-bib", "baby-towel", "dish-towel", "baby-clothes"];

const EXPORT_TEMPLATES = [
  {
    id: "product",
    label: "Foto de Produto",
    description: "Fundo branco limpo, pronto para catálogo",
    icon: Camera,
    bg: "#FFFFFF",
    size: 1400,
    padding: 0,
  },
  {
    id: "whatsapp",
    label: "Imagem para WhatsApp",
    description: "Quadrada, otimizada para envio rápido",
    icon: MessageCircle,
    bg: "#F0F0F0",
    size: 1080,
    padding: 40,
  },
  {
    id: "instagram",
    label: "Imagem para Instagram",
    description: "1080×1080, pronta para o feed",
    icon: Instagram,
    bg: "#FAFAFA",
    size: 1080,
    padding: 60,
  },
  {
    id: "catalog",
    label: "Catálogo",
    description: "Apresentação minimalista do produto",
    icon: BookOpen,
    bg: "#F8F6F3",
    size: 1400,
    padding: 80,
  },
] as const;

type ExportId = (typeof EXPORT_TEMPLATES)[number]["id"];

const SalesImageGenerator = () => {
  const [searchParams] = useSearchParams();
  const [designs, setDesigns] = useState<any[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MockupTemplate>(
    MOCKUP_TEMPLATES.find((t) => SALES_PRODUCTS.includes(t.id)) || MOCKUP_TEMPLATES[0]
  );
  const [selectedColor, setSelectedColor] = useState(FABRIC_COLORS[0]);
  const [scale, setScale] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load designs
  useEffect(() => {
    db.from("designs")
      .select("id, name, cover_image, categories(name)")
      .eq("is_published", true)
      .order("name")
      .then(({ data }: any) => {
        setDesigns(data || []);
        const designId = searchParams.get("design");
        if (designId && data) {
          const found = data.find((d: any) => d.id === designId);
          if (found) {
            setSelectedDesign(found);
            setStep(2);
          }
        }
      });
  }, []);

  // Draw preview canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mockupSrc = getMockupBaseSrc(selectedTemplate.id);
    const mockupImg = new Image();
    mockupImg.crossOrigin = "anonymous";
    mockupImg.onload = () => {
      if (selectedDesign?.cover_image) {
        const designImg = new Image();
        designImg.crossOrigin = "anonymous";
        designImg.onload = () => renderMockup(ctx, mockupImg, designImg, selectedTemplate, scale, offsetX, offsetY, selectedColor.hex);
        designImg.onerror = () => renderMockup(ctx, mockupImg, null, selectedTemplate, scale, offsetX, offsetY, selectedColor.hex);
        designImg.src = selectedDesign.cover_image;
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
  }, [selectedDesign, selectedTemplate, selectedColor, scale, offsetX, offsetY]);

  useEffect(() => {
    if (step >= 2) drawCanvas();
  }, [drawCanvas, step]);

  const resetPosition = () => {
    setScale(100);
    setOffsetX(0);
    setOffsetY(0);
  };

  // Export with template styling
  const handleExport = async (templateId: ExportId, format: "png" | "jpg") => {
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas || !selectedDesign) return;

    setRendering(true);
    await new Promise((r) => setTimeout(r, 100));

    try {
      const exportTpl = EXPORT_TEMPLATES.find((t) => t.id === templateId)!;
      const size = exportTpl.size;
      const pad = exportTpl.padding;

      const exportCanvas = exportCanvasRef.current || document.createElement("canvas");
      exportCanvas.width = size;
      exportCanvas.height = size;
      const ctx = exportCanvas.getContext("2d")!;

      // Background
      ctx.fillStyle = exportTpl.bg;
      ctx.fillRect(0, 0, size, size);

      // Draw the mockup centered with padding
      const drawSize = size - pad * 2;
      ctx.drawImage(sourceCanvas, pad, pad, drawSize, drawSize);

      // Subtle shadow for product template
      if (templateId === "product") {
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(size / 2, size - 30, size * 0.35, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
      const quality = format === "jpg" ? 0.92 : undefined;
      const dataUrl = exportCanvas.toDataURL(mimeType, quality);

      const link = document.createElement("a");
      link.download = `${selectedDesign.name}-${templateId}-${selectedColor.label}.${format}`;
      link.href = dataUrl;
      link.click();

      toast.success("Imagem gerada com sucesso!");
    } catch {
      toast.error("Erro ao gerar imagem.");
    }
    setRendering(false);
  };

  const salesTemplates = MOCKUP_TEMPLATES.filter((t) => SALES_PRODUCTS.includes(t.id));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Gerador de Imagem para Venda</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Crie fotos profissionais dos seus bordados em segundos</p>
          </div>
        </div>

        {/* STEP 1: Select design */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {step > 1 ? <Check className="h-3 w-3" /> : "1"}
            </div>
            <h2 className="font-display font-semibold text-sm">Selecione a Matriz</h2>
            {selectedDesign && (
              <Badge variant="secondary" className="ml-auto text-xs">{selectedDesign.name}</Badge>
            )}
          </div>

          {step === 1 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-80 overflow-y-auto">
              {designs.map((d: any) => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedDesign(d); setStep(2); }}
                  className="group relative aspect-square rounded-xl overflow-hidden border-2 border-border/40 hover:border-primary/40 transition-all"
                >
                  {d.cover_image ? (
                    <img src={d.cover_image} alt={d.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-2xl">🧵</div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-foreground/60 to-transparent p-1.5">
                    <p className="text-[10px] text-background font-medium truncate">{d.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* STEP 2: Product + Color + Preview */}
        {step >= 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controls */}
            <div className="space-y-4">
              {/* Product */}
              <Card className="border-border/40">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" /> Produto
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {salesTemplates.map((tpl) => (
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
                          className="w-10 h-10 rounded-md object-cover bg-muted/50"
                        />
                        <span className="text-sm font-medium">{tpl.label}</span>
                        {selectedTemplate.id === tpl.id && <Check className="h-4 w-4 text-primary ml-auto" />}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Color */}
              <Card className="border-border/40">
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
                        className={`w-9 h-9 rounded-full border-2 transition-all ${
                          selectedColor.id === color.id
                            ? "border-primary ring-2 ring-primary/30 scale-110"
                            : "border-border/50 hover:border-border hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.hex }}
                      >
                        {selectedColor.id === color.id && (
                          <span className={`flex items-center justify-center text-xs font-bold ${
                            ["preto", "marinho", "vermelho"].includes(color.id) ? "text-background" : "text-foreground"
                          }`}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedColor.label}</p>
                </CardContent>
              </Card>

              {/* Adjustments */}
              <Card className="border-border/40">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Move className="h-4 w-4 text-primary" /> Ajustes
                    </p>
                    <Button variant="ghost" size="sm" onClick={resetPosition} className="h-7 text-xs gap-1">
                      <RotateCcw className="h-3 w-3" /> Reset
                    </Button>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-muted-foreground flex items-center gap-1"><ZoomIn className="h-3 w-3" /> Tamanho</label>
                        <span className="text-xs font-mono text-muted-foreground">{scale}%</span>
                      </div>
                      <Slider value={[scale]} onValueChange={([v]) => setScale(v)} min={30} max={200} step={5} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-muted-foreground">Posição X</label>
                        <span className="text-xs font-mono text-muted-foreground">{offsetX}</span>
                      </div>
                      <Slider value={[offsetX]} onValueChange={([v]) => setOffsetX(v)} min={-100} max={100} step={1} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-muted-foreground">Posição Y</label>
                        <span className="text-xs font-mono text-muted-foreground">{offsetY}</span>
                      </div>
                      <Slider value={[offsetY]} onValueChange={([v]) => setOffsetY(v)} min={-100} max={100} step={1} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Change design */}
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={() => setStep(1)}>
                <ImageIcon className="h-3.5 w-3.5" /> Trocar Matriz
              </Button>
            </div>

            {/* Preview + Export */}
            <div className="lg:col-span-2 space-y-4">
              {/* Canvas preview */}
              <Card className="border-border/40 overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-square flex items-center justify-center" style={{ backgroundColor: CANVAS_BG }}>
                    <canvas ref={canvasRef} className="w-full h-full object-contain" />
                  </div>
                </CardContent>
              </Card>

              {/* Hidden export canvas */}
              <canvas ref={exportCanvasRef} className="hidden" />

              {/* Export buttons */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-sm">Gerar Imagem</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EXPORT_TEMPLATES.map((tpl) => {
                    const Icon = tpl.icon;
                    return (
                      <Card key={tpl.id} className="border-border/40 hover:border-primary/30 hover:shadow-sm transition-all">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-primary/8">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{tpl.label}</p>
                              <p className="text-[11px] text-muted-foreground">{tpl.description}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 gap-1.5 rounded-lg"
                              onClick={() => handleExport(tpl.id, "png")}
                              disabled={rendering}
                            >
                              <Download className="h-3.5 w-3.5" /> PNG
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1.5 rounded-lg"
                              onClick={() => handleExport(tpl.id, "jpg")}
                              disabled={rendering}
                            >
                              <Download className="h-3.5 w-3.5" /> JPG
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SalesImageGenerator;
