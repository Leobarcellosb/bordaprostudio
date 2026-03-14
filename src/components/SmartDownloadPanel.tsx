import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, Filter, AlertCircle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { db } from "@/lib/db";
import JSZip from "jszip";

const FORMAT_OPTIONS = ["PES", "JEF", "DST", "EXP", "VP3", "HUS"] as const;

const HOOP_OPTIONS = [
  { value: "10x10", label: "10×10 cm" },
  { value: "13x18", label: "13×18 cm" },
  { value: "14cm", label: "14 cm" },
  { value: "16cm", label: "16 cm" },
  { value: "18cm", label: "18 cm" },
] as const;

interface SmartDownloadPanelProps {
  /** Array of design IDs to download from */
  designIds: string[];
  /** Optional title for the panel */
  title?: string;
}

export const SmartDownloadPanel = ({ designIds, title }: SmartDownloadPanelProps) => {
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedHoop, setSelectedHoop] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  const hasFilters = selectedFormats.length > 0 || selectedHoop !== "";

  const handleDownload = async () => {
    if (!hasFilters) {
      toast.error("Selecione pelo menos um formato ou tamanho de bastidor.");
      return;
    }

    if (designIds.length === 0) {
      toast.error("Nenhuma matriz disponível para download.");
      return;
    }

    setDownloading(true);
    try {
      // Build query for kit_arquivos filtered by designIds and formats
      let query = db
        .from("kit_arquivos")
        .select("id, design_id, file_name, file_url, format")
        .in("design_id", designIds);

      if (selectedFormats.length > 0) {
        query = query.in("format", selectedFormats.map((f) => f.toLowerCase()));
      }

      const { data: files, error } = await query;
      if (error) throw error;

      // If hoop filter is selected, also filter by design hoop_size
      let filteredFiles = files || [];

      if (selectedHoop && filteredFiles.length > 0) {
        const uniqueDesignIds = [...new Set(filteredFiles.map((f) => f.design_id))];
        const { data: designs } = await db
          .from("designs")
          .select("id, hoop_size")
          .in("id", uniqueDesignIds)
          .eq("hoop_size", selectedHoop);

        const validDesignIds = new Set((designs || []).map((d) => d.id));
        filteredFiles = filteredFiles.filter((f) => validDesignIds.has(f.design_id));
      }

      setMatchCount(filteredFiles.length);

      if (filteredFiles.length === 0) {
        toast.error("Nenhuma matriz encontrada com os filtros selecionados.");
        setDownloading(false);
        return;
      }

      // Generate ZIP
      const zip = new JSZip();
      const fetchPromises = filteredFiles.map(async (file) => {
        try {
          const response = await fetch(file.file_url);
          if (!response.ok) return;
          const blob = await response.blob();
          zip.file(file.file_name, blob);
        } catch {
          console.warn(`Failed to fetch: ${file.file_name}`);
        }
      });

      await Promise.all(fetchPromises);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");

      const filterLabel = [
        ...selectedFormats,
        selectedHoop ? selectedHoop : "",
      ].filter(Boolean).join("_");

      a.href = url;
      a.download = `matrizes_${filterLabel || "filtrado"}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Download de ${filteredFiles.length} arquivo(s) iniciado!`);
    } catch (err) {
      console.error("[SmartDownload] error:", err);
      toast.error("Erro ao preparar o download.");
    } finally {
      setDownloading(false);
    }
  };

  const clearFilters = () => {
    setSelectedFormats([]);
    setSelectedHoop("");
    setMatchCount(null);
  };

  return (
    <Card className="border-border/40 bg-gradient-to-br from-muted/20 via-background to-accent/10 rounded-2xl overflow-hidden">
      <CardContent className="p-5 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm">
              {title || "Download Inteligente"}
            </h3>
            <p className="text-[12px] text-muted-foreground leading-snug">
              Selecione o formato da sua máquina e o tamanho do bastidor.
            </p>
          </div>
        </div>

        {/* Format filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Formato da Máquina
          </label>
          <ToggleGroup
            type="multiple"
            value={selectedFormats}
            onValueChange={setSelectedFormats}
            className="flex flex-wrap gap-1.5 justify-start"
          >
            {FORMAT_OPTIONS.map((fmt) => (
              <ToggleGroupItem
                key={fmt}
                value={fmt}
                className="rounded-lg px-3 h-9 text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border/50 bg-muted/30"
              >
                .{fmt}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Hoop filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Tamanho do Bastidor
          </label>
          <ToggleGroup
            type="single"
            value={selectedHoop}
            onValueChange={(v) => setSelectedHoop(v || "")}
            className="flex flex-wrap gap-1.5 justify-start"
          >
            {HOOP_OPTIONS.map((h) => (
              <ToggleGroupItem
                key={h.value}
                value={h.value}
                className="rounded-lg px-3 h-9 text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-border/50 bg-muted/30"
              >
                {h.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* No match message */}
        {matchCount === 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Nenhuma matriz encontrada com os filtros selecionados.</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleDownload}
            disabled={!hasFilters || downloading || designIds.length === 0}
            className="gap-2 rounded-xl"
            size="lg"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? "Preparando ZIP..." : "Baixar Matrizes"}
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground">
              Limpar filtros
            </Button>
          )}

          {hasFilters && (
            <div className="flex gap-1.5 flex-wrap ml-auto">
              {selectedFormats.map((f) => (
                <Badge key={f} variant="secondary" className="text-[10px]">.{f}</Badge>
              ))}
              {selectedHoop && (
                <Badge variant="secondary" className="text-[10px]">{selectedHoop}</Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
