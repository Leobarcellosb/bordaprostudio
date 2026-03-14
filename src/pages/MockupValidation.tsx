import { useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  MOCKUP_TEMPLATES,
  FABRIC_COLORS,
  CANVAS_SIZE,
  CANVAS_BG,
  getMockupBaseSrc,
  loadImage,
  renderMockup,
  type FabricColor,
} from "@/lib/mockupEngine";

const PILLOW = MOCKUP_TEMPLATES.find((t) => t.id === "pillow-cover")!;

const VALIDATION_COLORS: FabricColor[] = FABRIC_COLORS.filter((c) =>
  ["branco", "bege", "rosa", "azul-bebe", "preto", "marinho"].includes(c.id)
);

const MockupValidation = () => {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const renderAll = useCallback(async () => {
    try {
      const baseImg = await loadImage(getMockupBaseSrc(PILLOW.id));

      for (let i = 0; i < VALIDATION_COLORS.length; i++) {
        const canvas = canvasRefs.current[i];
        if (!canvas) continue;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        renderMockup(ctx, baseImg, null, PILLOW, 100, 0, 0, VALIDATION_COLORS[i].hex);
      }
    } catch (err) {
      console.error("Mockup validation render failed:", err);
    }
  }, []);

  useEffect(() => {
    renderAll();
  }, [renderAll]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold">Validação de Mockup — Almofada</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as 6 variantes devem ter a mesma pose, enquadramento, dobras e iluminação. Apenas a cor do tecido muda.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {VALIDATION_COLORS.map((color, i) => (
            <Card key={color.id} className="border-border/60 overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-square relative" style={{ backgroundColor: CANVAS_BG }}>
                  <canvas
                    ref={(el) => { canvasRefs.current[i] = el; }}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-3 flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full border border-border/50 shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-sm font-medium">{color.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{color.hex}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default MockupValidation;
