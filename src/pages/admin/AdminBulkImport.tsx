import { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload,
  PackageOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  FileArchive,
  Image as ImageIcon,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

interface DesignEntry {
  folderName: string;
  previewFile: { name: string; blob: Blob } | null;
  zipFile: { name: string; blob: Blob } | null;
  metadata: { title?: string; tags?: string; category?: string; description?: string } | null;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  kitId?: string;
  coverUrl?: string;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const ZIP_EXTENSION = "zip";

function getExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

export const AdminBulkImport = () => {
  const [designs, setDesigns] = useState<DesignEntry[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.from("categories").select("*").order("name").then(({ data }: any) => {
      setCategories(data || []);
    });
  }, []);

  const parseZip = useCallback(async (file: File) => {
    setParsing(true);
    setDesigns([]);
    setProgress(0);

    try {
      const zip = await JSZip.loadAsync(file);
      const folders = new Map<string, DesignEntry>();

      // Group files by top-level folder
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;

        const parts = path.split("/").filter(Boolean);
        if (parts.length < 2) {
          // Root-level file — treat the file name (without extension) as folder
          const folderName = parts[0].replace(/\.[^.]+$/, "");
          if (!folders.has(folderName)) {
            folders.set(folderName, {
              folderName,
              previewFile: null,
              zipFile: null,
              metadata: null,
              status: "pending",
            });
          }
          const entry = folders.get(folderName)!;
          const ext = getExtension(parts[0]);
          if (IMAGE_EXTENSIONS.includes(ext)) {
            entry.previewFile = { name: parts[0], blob: await zipEntry.async("blob") };
          } else if (ext === ZIP_EXTENSION) {
            entry.zipFile = { name: parts[0], blob: await zipEntry.async("blob") };
          } else if (ext === "json") {
            try {
              const text = await zipEntry.async("text");
              entry.metadata = JSON.parse(text);
            } catch {}
          }
          continue;
        }

        const folderName = parts[0];
        if (!folders.has(folderName)) {
          folders.set(folderName, {
            folderName,
            previewFile: null,
            zipFile: null,
            metadata: null,
            status: "pending",
          });
        }

        const entry = folders.get(folderName)!;
        const fileName = parts[parts.length - 1];
        const ext = getExtension(fileName);

        if (IMAGE_EXTENSIONS.includes(ext) && !entry.previewFile) {
          entry.previewFile = { name: fileName, blob: await zipEntry.async("blob") };
        } else if (ext === ZIP_EXTENSION && !entry.zipFile) {
          entry.zipFile = { name: fileName, blob: await zipEntry.async("blob") };
        } else if (fileName.toLowerCase() === "metadata.json") {
          try {
            const text = await zipEntry.async("text");
            entry.metadata = JSON.parse(text);
          } catch {}
        }
      }

      const entries = Array.from(folders.values()).filter(
        (e) => e.previewFile || e.zipFile
      );

      if (entries.length === 0) {
        toast.error("Nenhum design encontrado no ZIP. Certifique-se de que cada pasta contenha uma imagem ou arquivo ZIP.");
      }

      setDesigns(entries);
    } catch (err) {
      console.error("ZIP parse error:", err);
      toast.error("Erro ao ler o arquivo ZIP.");
    }
    setParsing(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (getExtension(file.name) !== "zip") {
      toast.error("Por favor, selecione um arquivo .zip");
      return;
    }
    parseZip(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const importDesigns = async () => {
    setImporting(true);
    let completed = 0;

    for (let i = 0; i < designs.length; i++) {
      const design = designs[i];
      setDesigns((prev) =>
        prev.map((d, idx) => (idx === i ? { ...d, status: "uploading" } : d))
      );

      try {
        let coverUrl: string | null = null;
        let zipUrl: string | null = null;

        // Upload preview image
        if (design.previewFile) {
          const ext = getExtension(design.previewFile.name);
          const path = `bulk/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage
            .from("kit-covers")
            .upload(path, design.previewFile.blob, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}` });
          if (error) throw new Error("Upload de imagem falhou: " + error.message);
          const { data: urlData } = supabase.storage.from("kit-covers").getPublicUrl(path);
          coverUrl = urlData.publicUrl;
        }

        // Upload zip file
        if (design.zipFile) {
          const path = `bulk/${crypto.randomUUID()}.zip`;
          const { error } = await supabase.storage
            .from("kit-zips")
            .upload(path, design.zipFile.blob, { contentType: "application/zip" });
          if (error) throw new Error("Upload de ZIP falhou: " + error.message);
          const { data: urlData } = supabase.storage.from("kit-zips").getPublicUrl(path);
          zipUrl = urlData.publicUrl;
        }

        // Resolve category
        let categoryId: string | null = null;
        if (design.metadata?.category) {
          const match = categories.find(
            (c: any) => c.name.toLowerCase() === design.metadata!.category!.toLowerCase()
          );
          if (match) categoryId = match.id;
        }

        const title = design.metadata?.title || design.folderName;
        const tags = design.metadata?.tags
          ? design.metadata.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];

        // Create kit entry
        const { data: kitData, error: kitError } = await db
          .from("kits")
          .insert({
            name: title,
            description: design.metadata?.description || null,
            cover_image: coverUrl,
            zip_url: zipUrl,
            category_id: categoryId,
            tags,
            tags_text: tags.join(", "),
            is_published: false,
          })
          .select("id")
          .single();

        if (kitError) throw new Error(kitError.message);

        setDesigns((prev) =>
          prev.map((d, idx) =>
            idx === i
              ? { ...d, status: "done", kitId: kitData.id, coverUrl: coverUrl || undefined }
              : d
          )
        );
      } catch (err: any) {
        console.error(`Import error for ${design.folderName}:`, err);
        setDesigns((prev) =>
          prev.map((d, idx) =>
            idx === i ? { ...d, status: "error", error: err.message } : d
          )
        );
      }

      completed++;
      setProgress(Math.round((completed / designs.length) * 100));
    }

    setImporting(false);
    const doneCount = designs.filter((d) => d.status !== "error").length;
    toast.success(`Importação concluída: ${doneCount}/${designs.length} designs importados.`);
  };

  const reset = () => {
    setDesigns([]);
    setProgress(0);
  };

  const pendingCount = designs.filter((d) => d.status === "pending").length;
  const doneCount = designs.filter((d) => d.status === "done").length;
  const errorCount = designs.filter((d) => d.status === "error").length;

  return (
    <div className="space-y-6 mt-4">
      {/* Upload area */}
      {designs.length === 0 && (
        <Card className="border-dashed border-2 border-border/60 bg-muted/20">
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <div className="p-4 rounded-2xl bg-primary/10">
              <PackageOpen className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Importação em Massa</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Envie um arquivo ZIP contendo pastas de designs. Cada pasta pode ter:
                imagem de preview, arquivo ZIP com formatos de bordado e um{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">metadata.json</code>.
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={parsing}
              className="gap-2"
              size="lg"
            >
              {parsing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Lendo ZIP...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Selecionar arquivo ZIP
                </>
              )}
            </Button>
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              <p className="font-medium">Estrutura esperada:</p>
              <pre className="text-left bg-muted/50 p-3 rounded-lg text-[11px] leading-relaxed">
{`designs.zip
├── Design Flores/
│   ├── preview.jpg
│   ├── flores.zip
│   └── metadata.json
├── Design Baby/
│   ├── preview.png
│   └── baby.zip
└── ...`}
              </pre>
              <p className="mt-2">
                <strong>metadata.json</strong> (opcional):{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  {`{"title":"...", "tags":"...", "category":"...", "description":"..."}`}
                </code>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parsed designs list */}
      {designs.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                {doneCount > 0 || errorCount > 0
                  ? "Resultado da Importação"
                  : `${designs.length} design${designs.length !== 1 ? "s" : ""} encontrado${designs.length !== 1 ? "s" : ""}`}
              </h3>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                {pendingCount > 0 && <span>⏳ {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}</span>}
                {doneCount > 0 && <span className="text-green-600">✓ {doneCount} importado{doneCount !== 1 ? "s" : ""}</span>}
                {errorCount > 0 && <span className="text-destructive">✕ {errorCount} erro{errorCount !== 1 ? "s" : ""}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Recomeçar
              </Button>
              {pendingCount > 0 && (
                <Button onClick={importDesigns} disabled={importing} className="gap-1.5">
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Importar {pendingCount} design{pendingCount !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {importing && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{progress}%</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {designs.map((design, index) => (
              <Card
                key={index}
                className={`border-border/60 overflow-hidden transition-all ${
                  design.status === "done"
                    ? "border-green-500/40 bg-green-500/5"
                    : design.status === "error"
                    ? "border-destructive/40 bg-destructive/5"
                    : design.status === "uploading"
                    ? "border-primary/40 bg-primary/5"
                    : ""
                }`}
              >
                {/* Preview thumbnail */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {design.previewFile ? (
                    <img
                      src={
                        design.coverUrl || URL.createObjectURL(design.previewFile.blob)
                      }
                      alt={design.folderName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  {/* Status overlay */}
                  <div className="absolute top-2 right-2">
                    {design.status === "done" && (
                      <div className="p-1.5 rounded-full bg-green-500 text-white">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    )}
                    {design.status === "error" && (
                      <div className="p-1.5 rounded-full bg-destructive text-destructive-foreground">
                        <XCircle className="h-4 w-4" />
                      </div>
                    )}
                    {design.status === "uploading" && (
                      <div className="p-1.5 rounded-full bg-primary text-primary-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <CardContent className="p-4 space-y-2">
                  <p className="font-medium text-sm truncate">
                    {design.metadata?.title || design.folderName}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {design.previewFile && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <ImageIcon className="h-3 w-3" /> Imagem
                      </Badge>
                    )}
                    {design.zipFile && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <FileArchive className="h-3 w-3" /> ZIP
                      </Badge>
                    )}
                    {design.metadata && (
                      <Badge variant="secondary" className="text-[10px]">
                        Metadata
                      </Badge>
                    )}
                    {!design.previewFile && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 gap-1">
                        <AlertTriangle className="h-3 w-3" /> Sem imagem
                      </Badge>
                    )}
                  </div>

                  {design.metadata?.category && (
                    <p className="text-xs text-muted-foreground">
                      Categoria: {design.metadata.category}
                    </p>
                  )}

                  {design.metadata?.tags && (
                    <div className="flex flex-wrap gap-1">
                      {design.metadata.tags.split(",").slice(0, 4).map((tag) => (
                        <Badge key={tag.trim()} variant="outline" className="text-[9px]">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {design.status === "error" && (
                    <p className="text-xs text-destructive mt-1">{design.error}</p>
                  )}

                  {design.status === "done" && (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ Importado como rascunho
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
