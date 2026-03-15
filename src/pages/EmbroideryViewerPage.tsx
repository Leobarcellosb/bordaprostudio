import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { EmbroideryViewer } from "@/components/EmbroideryViewer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileType, Eye } from "lucide-react";
import { toast } from "sonner";
import type { EmbroideryPattern } from "@/lib/embroideryPreview";
import { parseEmbroideryFile } from "@/lib/embroideryPreview";

const SUPPORTED_EXTENSIONS = ["pes", "dst", "jef", "exp", "xxx", "vp3"];

export default function EmbroideryViewerPage() {
  const [pattern, setPattern] = useState<EmbroideryPattern | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      toast.error(`Formato .${ext} não suportado. Use: ${SUPPORTED_EXTENSIONS.join(", ").toUpperCase()}`);
      return;
    }

    setLoading(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseEmbroideryFile(buffer, ext);
      if (!parsed || parsed.stitches.length < 5) {
        toast.error("Não foi possível interpretar o arquivo de bordado.");
        setPattern(null);
      } else {
        setPattern(parsed);
        toast.success("Matriz carregada com sucesso!");
      }
    } catch (err) {
      console.error("Parse error:", err);
      toast.error("Erro ao processar o arquivo.");
      setPattern(null);
    }
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            Visualizar Minha Matriz
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Faça upload de um arquivo de bordado para visualizar os pontos, cores e dimensões.
          </p>
        </div>

        {!pattern ? (
          <Card
            className="border-dashed border-2 border-border hover:border-primary/40 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              {loading ? (
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-primary/10">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium">Arraste um arquivo de bordado aqui</p>
                    <p className="text-sm text-muted-foreground">
                      ou clique para selecionar
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {SUPPORTED_EXTENSIONS.map(ext => (
                      <span key={ext} className="px-2 py-0.5 rounded-md bg-muted text-xs font-mono uppercase">
                        .{ext}
                      </span>
                    ))}
                  </div>
                  <label>
                    <input
                      type="file"
                      accept={SUPPORTED_EXTENSIONS.map(e => `.${e}`).join(",")}
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    <Button variant="outline" className="gap-2 cursor-pointer" asChild>
                      <span>
                        <FileType className="h-4 w-4" />
                        Selecionar arquivo
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileType className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <label>
                <input
                  type="file"
                  accept={SUPPORTED_EXTENSIONS.map(e => `.${e}`).join(",")}
                  onChange={handleInputChange}
                  className="hidden"
                />
                <Button variant="outline" size="sm" className="gap-2 cursor-pointer" asChild>
                  <span>
                    <Upload className="h-3.5 w-3.5" />
                    Trocar arquivo
                  </span>
                </Button>
              </label>
            </div>

            <EmbroideryViewer pattern={pattern} className="h-[600px]" />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
