import { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { generateTagsFromName, suggestCategoryFromName } from "@/lib/generateTags";
import { supabase } from "@/integrations/supabase/client";
import { generateEmbroideryPreview, isPreviewSupported } from "@/lib/embroideryPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  FileArchive,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Sparkles,
  FileUp,
  ChevronDown,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const EMBROIDERY_EXTENSIONS = ["pes", "exp", "dst", "jef", "xxx", "vp3"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

function getExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function getBaseName(name: string) {
  return name.replace(/\.[^.]+$/, "").trim();
}

function cleanTitle(name: string) {
  return name
    .replace(/[-_]+/g, " ")
    // Remove full UUIDs (8-4-4-4-12)
    .replace(/\b[0-9a-fA-F]{8}[- ]?[0-9a-fA-F]{4}[- ]?[0-9a-fA-F]{4}[- ]?[0-9a-fA-F]{4}[- ]?[0-9a-fA-F]{12}\b/g, " ")
    // Remove hex hashes (6+ hex chars that contain at least one digit AND one letter, so real words aren't removed)
    .replace(/\b(?=[0-9a-fA-F]*[0-9])(?=[0-9a-fA-F]*[a-fA-F])[0-9a-fA-F]{6,}\b/g, " ")
    // Remove pure numeric IDs (5+ digits)
    .replace(/\b\d{5,}\b/g, " ")
    // Remove common file suffixes like "(1)", "_v2", "_copy"
    .replace(/\s*\(\d+\)\s*/g, " ")
    .replace(/\b(v\d+|copy|copia|final|rev\d*)\b/gi, " ")
    // Remove leading/trailing format hints
    .replace(/\b(pes|dst|jef|exp|xxx|vp3)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function suggestCategory(name: string, categories: any[]): string | null {
  const lower = name.toLowerCase();
  // Direct match on category name
  for (const cat of categories) {
    if (lower.includes(cat.name.toLowerCase())) return cat.id;
  }
  // Use the smart suggestion from generateTags
  const suggested = suggestCategoryFromName(name);
  if (suggested) {
    const match = categories.find(
      (c: any) => c.name.toLowerCase() === suggested.toLowerCase()
    );
    if (match) return match.id;
  }
  return null;
}

interface PipelineStep {
  step: string;
  detail?: string;
  timestamp: Date;
  level: "info" | "success" | "warn" | "error";
}

interface ImportResult {
  previewStatus: "generated" | "failed" | "skipped" | null;
  designRecord: "created" | "existing" | null;
  filesUploaded: number;
  filesSkipped: number;
}

interface DesignGroup {
  id: string;
  baseName: string;
  rawFilename: string;
  title: string;
  generatedTitle: string | null;
  titleSource: "ai" | "filename";
  tags: string;
  categoryId: string;
  files: { name: string; blob: Blob; format: string }[];
  previewFile: { name: string; blob: Blob } | null;
  autoPreview: boolean;
  isZip: boolean;
  status: "pending" | "editing" | "uploading" | "done" | "duplicate" | "error";
  error?: string;
  metadata?: { widthMm: number; heightMm: number; stitchCount: number; colorChanges: number };
  generatingTitle: boolean;
  pipelineLog: PipelineStep[];
  importResult: ImportResult | null;
}

export const AdminSmartUpload = () => {
  const [groups, setGroups] = useState<DesignGroup[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.from("categories").select("*").order("name").then(({ data }: any) => {
      setCategories(data || []);
    });
  }, []);

  const processFiles = useCallback(
    async (fileList: FileList) => {
      const filesArr = Array.from(fileList);
      const newGroups = new Map<string, DesignGroup>();

      for (const file of filesArr) {
        const ext = getExtension(file.name);
        const baseName = getBaseName(file.name);

        if (ext === "zip") {
          // ZIP upload — try to extract embroidery files inside
          try {
            const zip = await JSZip.loadAsync(file);
            const innerFiles: { name: string; blob: Blob; format: string }[] = [];
            let previewFile: { name: string; blob: Blob } | null = null;

            for (const [path, entryRaw] of Object.entries(zip.files)) {
              const entry = entryRaw as JSZip.JSZipObject;
              if (entry.dir) continue;
              const innerName = path.split("/").pop() || path;
              const innerExt = getExtension(innerName);

              if (EMBROIDERY_EXTENSIONS.includes(innerExt)) {
                innerFiles.push({
                  name: innerName,
                  blob: await entry.async("blob"),
                  format: innerExt.toUpperCase(),
                });
              } else if (IMAGE_EXTENSIONS.includes(innerExt) && !previewFile) {
                previewFile = { name: innerName, blob: await entry.async("blob") };
              }
            }

            const title = cleanTitle(baseName);
            const tags = generateTagsFromName(title);
            const categoryId = suggestCategory(baseName, categories) || "";

            if (innerFiles.length > 0) {
              const groupId = crypto.randomUUID();
              newGroups.set(groupId, {
                id: groupId,
                baseName,
                rawFilename: file.name,
                title,
                generatedTitle: null,
                titleSource: "filename",
                tags: tags.join(", "),
                categoryId,
                files: innerFiles,
                previewFile,
                autoPreview: false,
                isZip: false,
                status: "pending",
                generatingTitle: false,
                pipelineLog: [],
                importResult: null,
              });
            } else {
              const groupId = crypto.randomUUID();
              newGroups.set(groupId, {
                id: groupId,
                baseName,
                rawFilename: file.name,
                title,
                generatedTitle: null,
                titleSource: "filename",
                tags: tags.join(", "),
                categoryId,
                files: [{ name: file.name, blob: file, format: "ZIP" }],
                previewFile,
                autoPreview: false,
                isZip: true,
                status: "pending",
                generatingTitle: false,
                pipelineLog: [],
                importResult: null,
              });
            }
          } catch {
            toast.error(`Erro ao processar ZIP: ${file.name}`);
          }
          continue;
        }

        if (EMBROIDERY_EXTENSIONS.includes(ext)) {
          // Group by base name
          const key = baseName.toLowerCase();
          if (!newGroups.has(key)) {
            const title = cleanTitle(baseName);
            const tags = generateTagsFromName(title);
            const categoryId = suggestCategory(baseName, categories) || "";
            newGroups.set(key, {
              id: crypto.randomUUID(),
              baseName,
              rawFilename: file.name,
              title,
              generatedTitle: null,
              titleSource: "filename",
              tags: tags.join(", "),
              categoryId,
              files: [],
              previewFile: null,
              autoPreview: false,
              isZip: false,
              status: "pending",
              generatingTitle: false,
              pipelineLog: [],
              importResult: null,
            });
          }
          newGroups.get(key)!.files.push({
            name: file.name,
            blob: file,
            format: ext.toUpperCase(),
          });
          continue;
        }

        if (IMAGE_EXTENSIONS.includes(ext)) {
          // Try to attach to matching group
          const key = baseName.toLowerCase();
          if (newGroups.has(key)) {
            newGroups.get(key)!.previewFile = { name: file.name, blob: file };
          }
          continue;
        }
      }

      // Second pass: match orphan images to groups by base name
      const orphanImages: { baseName: string; file: File }[] = [];
      for (const file of filesArr) {
        const ext = getExtension(file.name);
        if (IMAGE_EXTENSIONS.includes(ext)) {
          const key = getBaseName(file.name).toLowerCase();
          if (newGroups.has(key) && !newGroups.get(key)!.previewFile) {
            newGroups.get(key)!.previewFile = { name: file.name, blob: file };
          }
        }
      }

      // Third pass: auto-generate previews from embroidery files for groups without images
      const entries = Array.from(newGroups.values());
      let previewFailures = 0;

      for (const group of entries) {
        if (!group.previewFile && group.files.length > 0) {
          const supportedFile = group.files.find(f => isPreviewSupported(f.format));
          if (supportedFile) {
            try {
              console.log(`[UPLOAD] [${group.baseName}] PARSE_START`, { format: supportedFile.format, size: supportedFile.blob.size });
              const result = await generateEmbroideryPreview(supportedFile.blob, supportedFile.format);
              if (result) {
                group.previewFile = { name: "auto-preview.png", blob: result.blob };
                group.autoPreview = true;
                group.metadata = result.metadata;
                console.log(`[UPLOAD] [${group.baseName}] PARSE_COMPLETE`, { metadata: result.metadata, previewSize: result.blob.size });
              } else {
                console.warn(`[UPLOAD] [${group.baseName}] PARSE_COMPLETE — no preview generated (null result)`);
                previewFailures++;
              }
            } catch (err) {
              console.error(`[UPLOAD] [${group.baseName}] PARSE_ERROR`, err);
              previewFailures++;
            }
          }
        }
      }

      if (entries.length === 0) {
        toast.error("Nenhum arquivo de bordado reconhecido. Formatos suportados: PES, EXP, JEF, DST, XXX, VP3");
        return;
      }

      if (previewFailures > 0) {
        toast.info("Não foi possível gerar uma visualização legível desta matriz. Envie uma imagem manualmente.");
      }

      setGroups((prev) => [...prev, ...entries]);
      const autoCount = entries.filter(e => e.autoPreview).length;
      const msg = `${entries.length} design${entries.length !== 1 ? "s" : ""} detectado${entries.length !== 1 ? "s" : ""}!`;
      toast.success(autoCount > 0 ? `${msg} ${autoCount} preview${autoCount !== 1 ? "s" : ""} gerado${autoCount !== 1 ? "s" : ""} automaticamente.` : msg);

      // Trigger AI title generation for entries with previews
      for (const entry of entries) {
        if (entry.previewFile) {
          generateAITitle(entry);
        }
      }
    },
    [categories]
  );

  const generateAITitle = useCallback(async (group: DesignGroup) => {
    setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, generatingTitle: true } : g));

    try {
      let imageUrl: string | null = null;
      if (group.previewFile) {
        imageUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(group.previewFile!.blob);
        });
      }

      const { data, error } = await supabase.functions.invoke("generate-design-title", {
        body: {
          image_url: imageUrl,
          tags: group.tags,
          metadata: group.metadata,
          raw_filename: group.rawFilename,
        },
      });

      if (error) throw error;

      const aiTitle = data?.title;
      if (aiTitle && typeof aiTitle === "string" && aiTitle.length > 0) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id
              ? { ...g, title: aiTitle, generatedTitle: aiTitle, titleSource: "ai" as const, generatingTitle: false }
              : g
          )
        );
      } else {
        setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, generatingTitle: false } : g));
      }
    } catch (err) {
      console.warn("AI title generation failed for", group.baseName, err);
      setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, generatingTitle: false } : g));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const updateGroup = (id: string, updates: Partial<DesignGroup>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const removeGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const uploadWithRetry = async (
    bucket: string,
    filePath: string,
    blob: Blob,
    maxRetries = 3
  ): Promise<{ path: string } | null> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = Math.min(2000 * Math.pow(2, attempt), 10000);
        console.log(`Retry ${attempt}/${maxRetries} for ${filePath}, waiting ${backoff}ms...`);
        await delay(backoff);
      }
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, { upsert: false });
      if (!error && data?.path) return data;
      console.warn(`Upload attempt ${attempt + 1} failed:`, error?.message);
      if (error && !error.message?.includes("timeout") && !error.message?.includes("Timeout")) {
        return null; // Non-timeout error, don't retry
      }
    }
    return null;
  };

  const addPipelineStep = (groupId: string, step: string, level: PipelineStep["level"] = "info", detail?: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, pipelineLog: [...g.pipelineLog, { step, detail, timestamp: new Date(), level }] }
          : g
      )
    );
    console.log(`[UPLOAD] [${groupId}] ${step}`, detail ?? "");
  };

  const importAll = async () => {
    const pending = groups.filter((g) => g.status === "pending" || g.status === "editing");
    if (pending.length === 0) return;

    setImporting(true);
    let completed = 0;
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const group of pending) {
      updateGroup(group.id, { status: "uploading", pipelineLog: [], importResult: null });
      const gid = group.id;
      const plog = (step: string, level: PipelineStep["level"] = "info", detail?: string) => addPipelineStep(gid, step, level, detail);

      try {
        if (completed > 0) await delay(2000);

        plog("UPLOAD_START", "info", `${group.files.length} arquivo(s), preview: ${group.previewFile ? "sim" : "não"}`);

        // Step 1: Upload preview image if present
        let previewUrl: string | null = null;
        let previewStatus: ImportResult["previewStatus"] = null;
        if (group.previewFile) {
          plog("PREVIEW_UPLOAD_START", "info");
          const ext = getExtension(group.previewFile.name);
          const path = `smart/${crypto.randomUUID()}.${ext}`;
          const uploadResult = await uploadWithRetry(
            "design-covers",
            path,
            group.previewFile.blob
          );
          if (uploadResult) {
            const { data } = supabase.storage.from("design-covers").getPublicUrl(uploadResult.path);
            previewUrl = data.publicUrl;
            previewStatus = "generated";
            plog("PREVIEW_UPLOAD_COMPLETE", "success");
          } else {
            previewStatus = "failed";
            plog("PREVIEW_UPLOAD_FAILED", "warn", "Storage upload retornou null");
          }
          await delay(1000);
        } else {
          previewStatus = "skipped";
          plog("PREVIEW_SKIPPED", "warn", "Nenhuma imagem de preview disponível");
        }

        // Step 2: Find or create design
        plog("DB_LOOKUP_START", "info", group.title);
        const normalizedTitle = group.title.trim().toLowerCase();
        const { data: existingDesigns, error: lookupError } = await db
          .from("designs")
          .select("id, name")
          .ilike("name", normalizedTitle);

        if (lookupError) {
          plog("DB_LOOKUP_ERROR", "error", lookupError.message);
          throw new Error(`Erro ao buscar designs: ${lookupError.message}`);
        }

        await delay(500);

        let designId: string;
        let isNewDesign = false;
        let designRecord: ImportResult["designRecord"] = null;
        const existingDesign = existingDesigns?.find(
          (d: any) => d.name.trim().toLowerCase() === normalizedTitle
        );

        if (existingDesign) {
          designId = existingDesign.id;
          designRecord = "existing";
          plog("DB_DESIGN_EXISTS", "warn", `ID: ${designId}`);
          if (previewUrl) {
            await db.from("designs").update({ cover_image: previewUrl }).eq("id", designId).is("cover_image", null);
            await delay(500);
          }
        } else {
          plog("DB_INSERT_START", "info");
          const meta = group.metadata;
          const { data: designData, error: designError } = await db
            .from("designs")
            .insert({
              name: group.title,
              raw_filename: group.rawFilename,
              generated_title: group.generatedTitle,
              cover_image: previewUrl,
              category_id: group.categoryId || null,
              tags_text: group.tags,
              is_published: true,
              ...(meta ? {
                width_mm: meta.widthMm,
                height_mm: meta.heightMm,
                stitch_count: meta.stitchCount,
                colors_count: meta.colorChanges,
              } : {}),
            })
            .select("id")
            .single();

          if (designError) {
            plog("DB_INSERT_ERROR", "error", designError.message);
            throw new Error(`Erro ao criar design: ${designError.message}`);
          }
          designId = designData.id;
          isNewDesign = true;
          designRecord = "created";
          plog("DB_INSERT_SUCCESS", "success", `ID: ${designId}`);
          await delay(1000);
        }

        // Step 3: Upload files ONE BY ONE
        let filesUploaded = 0;
        let filesSkipped = 0;

        for (let fi = 0; fi < group.files.length; fi++) {
          const file = group.files[fi];
          const fileFormat = file.format.toUpperCase();

          if (fileFormat !== "ZIP" && !EMBROIDERY_EXTENSIONS.includes(fileFormat.toLowerCase())) {
            plog("FILE_SKIP_UNSUPPORTED", "warn", `${file.name} (${fileFormat})`);
            continue;
          }

          // Check duplicate
          const { data: existingFile } = await db
            .from("kit_arquivos")
            .select("id")
            .eq("design_id", designId)
            .eq("format", fileFormat)
            .maybeSingle();

          if (existingFile) {
            plog("FILE_SKIP_DUPLICATE", "warn", `${file.name} (${fileFormat})`);
            filesSkipped++;
            continue;
          }

          await delay(1000);

          plog("FILE_UPLOAD_START", "info", `${file.name} (${fileFormat})`);
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const filePath = `${designId}/${crypto.randomUUID()}-${sanitizedFileName}`;
          const bucket = fileFormat === "ZIP" ? "kit-zips" : "kit-files";

          const uploadResult = await uploadWithRetry(bucket, filePath, file.blob);

          if (!uploadResult) {
            plog("FILE_UPLOAD_FAILED", "error", file.name);
            updateGroup(group.id, { status: "error", error: `Falha ao enviar arquivo: ${file.name}` });
            failCount++;
            continue;
          }

          plog("FILE_UPLOAD_COMPLETE", "success", file.name);
          await delay(1000);

          // Insert record
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploadResult.path);
          const { error: fileRecordError } = await db.from("kit_arquivos").insert({
            design_id: designId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            format: fileFormat,
          });

          if (fileRecordError) {
            plog("FILE_RECORD_ERROR", "error", `${file.name}: ${fileRecordError.message}`);
            continue;
          }

          plog("FILE_RECORD_SUCCESS", "success", `${file.name} (${fileFormat})`);
          filesUploaded++;
          await delay(500);
        }

        plog("UPLOAD_COMPLETE", "success", `Novos: ${filesUploaded}, Ignorados: ${filesSkipped}`);

        const result: ImportResult = { previewStatus, designRecord, filesUploaded, filesSkipped };

        if (filesUploaded === 0 && filesSkipped > 0 && !isNewDesign) {
          updateGroup(group.id, { status: "duplicate", error: "Design já existente, arquivos duplicados ignorados", importResult: result });
          skippedCount++;
        } else {
          updateGroup(group.id, { status: "done", importResult: result });
          successCount++;
        }
      } catch (err: any) {
        plog("PIPELINE_ERROR", "error", err.message);
        console.error(`Import error for ${group.baseName}:`, err);
        updateGroup(group.id, { status: "error", error: err.message });
        failCount++;
      }

      completed++;
      setProgress(Math.round((completed / pending.length) * 100));
    }

    setImporting(false);
    const parts = [];
    if (successCount > 0) parts.push(`${successCount} importado${successCount !== 1 ? "s" : ""}`);
    if (skippedCount > 0) parts.push(`${skippedCount} duplicado${skippedCount !== 1 ? "s" : ""}`);
    if (failCount > 0) parts.push(`${failCount} erro${failCount !== 1 ? "s" : ""}`);
    toast[failCount > 0 ? "warning" : "success"](`Importação concluída: ${parts.join(", ")}`);
  };

  const reset = () => {
    setGroups([]);
    setProgress(0);
  };

  const pendingCount = groups.filter((g) => g.status === "pending" || g.status === "editing").length;
  const doneCount = groups.filter((g) => g.status === "done").length;
  const duplicateCount = groups.filter((g) => g.status === "duplicate").length;
  const errorCount = groups.filter((g) => g.status === "error").length;

  return (
    <div className="space-y-6 mt-4">
      {/* Upload area */}
      <Card className="border-dashed border-2 border-border/60 bg-muted/20">
        <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
          <div className="p-4 rounded-2xl bg-primary/10">
            <FileUp className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">Upload Inteligente</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              Envie arquivos de bordado (PES, EXP, JEF, DST, XXX, VP3), ZIPs ou imagens.
              Previews são gerados automaticamente a partir dos arquivos de bordado.
              Arquivos com o mesmo nome base são agrupados automaticamente como um único design.
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pes,.exp,.dst,.jef,.xxx,.vp3,.zip,.jpg,.jpeg,.png,.webp,.gif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => inputRef.current?.click()}
            className="gap-2"
            size="lg"
          >
            <Upload className="h-4 w-4" /> Selecionar arquivos
          </Button>
          <div className="text-xs text-muted-foreground space-y-1 mt-1">
            <p>
              <strong>Arquivo único:</strong> abelhas.PES → 1 design
            </p>
            <p>
              <strong>Múltiplos formatos:</strong> abelhas.PES + abelhas.EXP + abelhas.JEF → 1 design com 3 formatos
            </p>
            <p>
              <strong>ZIP:</strong> flores.zip → extrai arquivos de bordado internos ou importa como pacote
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grouped designs list */}
      {groups.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                {groups.length} design{groups.length !== 1 ? "s" : ""} para importar
              </h3>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                {pendingCount > 0 && <span>⏳ {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}</span>}
                {doneCount > 0 && <span className="text-green-600">✓ {doneCount} importado{doneCount !== 1 ? "s" : ""}</span>}
                {errorCount > 0 && <span className="text-destructive">✕ {errorCount} erro{errorCount !== 1 ? "s" : ""}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                Limpar tudo
              </Button>
              {pendingCount > 0 && (
                <Button onClick={importAll} disabled={importing} className="gap-1.5">
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

          <div className="space-y-4">
            {groups.map((group) => (
              <DesignGroupCard
                key={group.id}
                group={group}
                categories={categories}
                onUpdate={updateGroup}
                onRemove={removeGroup}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

function DesignGroupCard({
  group,
  categories,
  onUpdate,
  onRemove,
}: {
  group: DesignGroup;
  categories: any[];
  onUpdate: (id: string, updates: Partial<DesignGroup>) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  const isFinished = group.status === "done" || group.status === "error" || group.status === "uploading";

  return (
    <Card
      className={`border-border/60 overflow-hidden transition-all ${
        group.status === "done"
          ? "border-green-500/40 bg-green-500/5"
          : group.status === "error"
          ? "border-destructive/40 bg-destructive/5"
          : group.status === "uploading"
          ? "border-primary/40 bg-primary/5"
          : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Preview thumbnail */}
          <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center border border-border/40 relative">
            {group.previewFile ? (
              <>
                <img
                  src={URL.createObjectURL(group.previewFile.blob)}
                  alt={group.title}
                  className="w-full h-full object-cover"
                />
                {group.autoPreview && (
                  <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-[8px] text-center py-0.5 font-medium">
                    Auto
                  </span>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                <ImageIcon className="h-6 w-6" />
                <span className="text-[9px]">Sem imagem</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {editing && !isFinished ? (
                  <Input
                    value={group.title}
                    onChange={(e) => onUpdate(group.id, { title: e.target.value })}
                    className="h-8 text-sm font-medium"
                  />
                ) : (
                  <p className="font-medium text-sm truncate">{group.title}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {group.status === "done" && (
                  <div className="p-1 rounded-full bg-green-500 text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                )}
                {group.status === "error" && (
                  <div className="p-1 rounded-full bg-destructive text-destructive-foreground">
                    <XCircle className="h-3.5 w-3.5" />
                  </div>
                )}
                {group.status === "uploading" && (
                  <div className="p-1 rounded-full bg-primary text-primary-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </div>
                )}
                {!isFinished && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditing(!editing)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onRemove(group.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>


            {/* File format badges */}
            <div className="flex flex-wrap gap-1.5">
              {group.files.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {group.isZip ? <FileArchive className="h-3 w-3 mr-1" /> : null}
                  {f.format}
                </Badge>
              ))}
              {group.files.length > 1 && (
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                  {group.files.length} formatos
                </Badge>
              )}
            </div>

            {/* Metadata from auto-preview */}
            {group.metadata && (
              <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                <span>{group.metadata.widthMm}×{group.metadata.heightMm}mm</span>
                <span>•</span>
                <span>{group.metadata.stitchCount.toLocaleString()} pontos</span>
                <span>•</span>
                <span>{group.metadata.colorChanges} cores</span>
              </div>
            )}

            {editing && !isFinished && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                  <Select
                    value={group.categoryId}
                    onValueChange={(v) => onUpdate(group.id, { categoryId: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Auto-detectar ou selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tags</label>
                  <div className="flex gap-2">
                    <Input
                      value={group.tags}
                      onChange={(e) => onUpdate(group.id, { tags: e.target.value })}
                      className="h-8 text-xs flex-1"
                      placeholder="tag1, tag2, tag3"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] gap-1 shrink-0"
                      onClick={() => {
                        const suggested = generateTagsFromName(group.title);
                        const existing = group.tags.split(",").map((t) => t.trim()).filter(Boolean);
                        const merged = Array.from(new Set([...existing, ...suggested]));
                        onUpdate(group.id, { tags: merged.join(", ") });
                      }}
                    >
                      <Sparkles className="h-3 w-3" /> Gerar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Category & tags summary when not editing */}
            {!editing && !isFinished && (
              <div className="flex flex-wrap gap-1">
                {group.categoryId && (
                  <Badge variant="outline" className="text-[10px]">
                    {categories.find((c: any) => c.id === group.categoryId)?.name || "Categoria"}
                  </Badge>
                )}
                {group.tags &&
                  group.tags
                    .split(",")
                    .slice(0, 4)
                    .map((tag) => (
                      <Badge key={tag.trim()} variant="outline" className="text-[9px] text-muted-foreground">
                        {tag.trim()}
                      </Badge>
                    ))}
              </div>
            )}

            {group.status === "error" && (
              <p className="text-xs text-destructive">{group.error}</p>
            )}
            {group.status === "done" && (
              <p className="text-xs text-green-600 font-medium">✓ Importado como rascunho</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
