import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Download, FileText, MessageSquare, Instagram, Loader2, LayoutGrid, List, MessageCircle } from "lucide-react";
import {
  CatalogTemplate,
  getCatalogFormatSize,
  getDesignsPerPage,
  paginateDesigns,
  type CatalogDesign,
  type ExportFormat as CatalogExportFormat,
} from "@/components/catalog/CatalogTemplate";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type ExportFormat = "pdf" | "instagram" | "whatsapp";

// Layout options temporarily reduced to one stable template
const layoutOptions: { value: LayoutType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "compact-list", label: "Lista Compacta", icon: <List className="h-5 w-5" />, desc: "Layout estável e alinhado" },
];

const exportOptions: { value: ExportFormat; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "pdf", label: "PDF", icon: <FileText className="h-4 w-4" />, desc: "Catálogo multipáginas" },
  { value: "whatsapp", label: "WhatsApp", icon: <MessageSquare className="h-4 w-4" />, desc: "Imagem vertical" },
  { value: "instagram", label: "Instagram", icon: <Instagram className="h-4 w-4" />, desc: "Quadrado 1080×1080" },
];

const CatalogGeneratorPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<any>(null);
  const [designs, setDesigns] = useState<CatalogDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [layout, setLayout] = useState<LayoutType>("compact-list");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");

  const canvasRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hiddenContainerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!user || !id) return;
    const [{ data: catData }, { data: itemsData }] = await Promise.all([
      db.from("catalogs").select("*").eq("id", id).eq("user_id", user.id).single(),
      db.from("catalog_items")
        .select("*, designs(id, name, cover_image, hoop_size, width_mm, height_mm, stitch_count, category_id, categories(name))")
        .eq("catalog_id", id)
        .order("order_index", { ascending: true }),
    ]);

    if (catData) {
      setCatalog(catData);
      setTitle(catData.name);
      setSubtitle(catData.subtitle || "");
      setLayout(catData.layout_type || "clean-grid");
    }

    const mapped: CatalogDesign[] = (itemsData || [])
      .filter((i: any) => i.designs)
      .map((i: any) => ({
        id: i.designs.id,
        name: i.designs.name,
        cover_image: i.designs.cover_image,
        hoop_size: i.designs.hoop_size,
        width_mm: i.designs.width_mm,
        height_mm: i.designs.height_mm,
        stitch_count: i.designs.stitch_count,
        category_name: i.designs.categories?.name || null,
      }));

    setDesigns(mapped);
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveSettings = async () => {
    if (!id) return;
    await db.from("catalogs").update({
      name: title,
      subtitle: subtitle || null,
      layout_type: layout,
    }).eq("id", id);
  };

  const perPage = getDesignsPerPage(layout, exportFormat);
  const pages = paginateDesigns(designs, perPage);

  const validateExportBounds = () => {
    const tolerance = 2;
    const issues: string[] = [];

    canvasRefs.current.forEach((root, pageIndex) => {
      if (!root) return;

      const rootRect = root.getBoundingClientRect();
      const checks = root.querySelectorAll<HTMLElement>("[data-export-check]");

      checks.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const outside =
          rect.left < rootRect.left - tolerance ||
          rect.right > rootRect.right + tolerance ||
          rect.top < rootRect.top - tolerance ||
          rect.bottom > rootRect.bottom + tolerance;

        if (outside) {
          issues.push(`page:${pageIndex + 1} node:${node.dataset.exportCheck || "unknown"}`);
        }
      });
    });

    return { valid: issues.length === 0, issues };
  };

  const capturePages = async (): Promise<HTMLCanvasElement[]> => {
    const canvases: HTMLCanvasElement[] = [];

    for (let i = 0; i < canvasRefs.current.length; i++) {
      const el = canvasRefs.current[i];
      if (!el) continue;

      const canvas = await html2canvas(el, {
        scale: exportFormat === "instagram" ? 1 : 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      canvases.push(canvas);
    }

    return canvases;
  };

  const handleExport = async () => {
    if (designs.length === 0) {
      toast.error("Adicione matrizes ao catálogo antes de gerar.");
      return;
    }

    setExporting(true);
    await saveSettings();

    try {
      const headerDebug = getCatalogHeaderDebug({
        title,
        subtitle,
        format: exportFormat,
      });

      console.info("[CatalogExport][HeaderValidation]", {
        ...headerDebug,
        format: exportFormat,
        layout,
        pageCount: pages.length,
      });

      await new Promise((r) => setTimeout(r, 320));

      const boundsValidation = validateExportBounds();
      console.info("[CatalogExport][BoundsValidation]", boundsValidation);

      if (!boundsValidation.valid) {
        toast.error("Layout fora da área segura. Ajuste título/layout antes de exportar.");
        return;
      }

      const canvases = await capturePages();

      if (exportFormat === "pdf") {
        const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = pdf.internal.pageSize.getHeight();

        canvases.forEach((canvas, i) => {
          if (i > 0) pdf.addPage();
          const imgData = canvas.toDataURL("image/jpeg", 0.92);
          pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
        });

        pdf.save(`${title || "catalogo"}.pdf`);
        toast.success("PDF gerado com sucesso!");
      } else {
        if (!canvases.length) {
          toast.error("Nenhuma página foi gerada para exportação.");
          return;
        }

        canvases.forEach((canvas, index) => {
          const link = document.createElement("a");
          const suffix = canvases.length > 1 ? `-${index + 1}` : "";
          link.download = `${title || "catalogo"}-${exportFormat}${suffix}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        });

        toast.success(canvases.length > 1 ? `${canvases.length} imagens geradas com sucesso!` : "Imagem gerada com sucesso!");
      }
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Erro ao gerar catálogo. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!catalog) {
    return (
      <AppLayout>
        <div className="text-center py-20 space-y-4">
          <p className="text-muted-foreground font-medium">Catálogo não encontrado.</p>
          <Button variant="outline" onClick={() => navigate("/catalogs")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const previewDesigns = pages[0] || [];
  const previewSize = getCatalogFormatSize(exportFormat);
  const previewScale = exportFormat === "instagram" ? 0.3 : exportFormat === "whatsapp" ? 0.5 : 0.6;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <button
            onClick={() => navigate(`/catalogs/${id}`)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-4"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Voltar ao catálogo
          </button>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Gerar Catálogo</h1>
          <p className="text-muted-foreground mt-1">
            {designs.length} {designs.length !== 1 ? "matrizes selecionadas" : "matriz selecionada"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
          <div className="space-y-6">
            <Card className="border-border/60">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Título do catálogo</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meu Catálogo de Bordados" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Subtítulo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Matrizes exclusivas para sua máquina" />
                </div>
              </CardContent>
            </Card>

            {/* Layout selection temporarily hidden — using single stable template */}

            <Card className="border-border/60">
              <CardContent className="p-5 space-y-3">
                <Label className="text-sm font-medium">Formato de saída</Label>
                <div className="grid grid-cols-3 gap-3">
                  {exportOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setExportFormat(opt.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                        exportFormat === opt.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/60 hover:border-primary/30 text-muted-foreground"
                      }`}
                    >
                      {opt.icon}
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span className="text-[9px] opacity-60">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleExport}
              disabled={exporting || designs.length === 0}
              className="w-full gap-2 h-12 text-base"
              size="lg"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Gerar e Baixar
                </>
              )}
            </Button>
          </div>

          <div className="lg:sticky lg:top-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pré-visualização</p>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 overflow-auto max-h-[80vh]">
              <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left", width: previewSize.width }}>
                <CatalogCanvas
                  title={title}
                  subtitle={subtitle}
                  designs={previewDesigns}
                  layout={layout}
                  format={exportFormat}
                  pageIndex={0}
                  debug
                />
              </div>
            </div>
            {pages.length > 1 && (
              <p className="text-[11px] text-muted-foreground text-center">
                {pages.length} {pages.length !== 1 ? "páginas" : "página"} no total
              </p>
            )}
          </div>
        </div>

        <div ref={hiddenContainerRef} className="fixed -left-[9999px] top-0" aria-hidden="true">
          {pages.map((pageDesigns, i) => (
            <CatalogCanvas
              key={i}
              ref={(el) => {
                canvasRefs.current[i] = el;
              }}
              title={title}
              subtitle={subtitle}
              designs={pageDesigns}
              layout={layout}
              format={exportFormat}
              pageIndex={i}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default CatalogGeneratorPage;
