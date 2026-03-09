import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DesignCard } from "@/components/cards/DesignCard";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formats = ["PES", "EXP", "DST", "JEF", "XXX"];

const LibraryPage = () => {
  const [designs, setDesigns] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [designFiles, setDesignFiles] = useState<Record<string, string[]>>({});
  const [downloadCounts, setDownloadCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const [
        { data: kitsData },
        { data: catsData },
        { data: filesData },
        { data: downloadsData },
      ] = await Promise.all([
        db.from("kits").select("*, categories(name)").eq("is_published", true).order("created_at", { ascending: false }),
        db.from("categories").select("*").order("name"),
        db.from("kit_files").select("kit_id, file_format"),
        db.from("downloads").select("kit_id"),
      ]);

      setDesigns(kitsData || []);
      setCategories(catsData || []);

      const fileMap: Record<string, string[]> = {};
      (filesData || []).forEach((f: any) => {
        if (!fileMap[f.kit_id]) fileMap[f.kit_id] = [];
        if (!fileMap[f.kit_id].includes(f.file_format)) fileMap[f.kit_id].push(f.file_format);
      });
      setDesignFiles(fileMap);

      const countMap: Record<string, number> = {};
      (downloadsData || []).forEach((d: any) => {
        countMap[d.kit_id] = (countMap[d.kit_id] || 0) + 1;
      });
      setDownloadCounts(countMap);
    };
    fetchData();
  }, []);

  // Simple search by title and description only
  const filtered = designs.filter((d: any) => {
    const query = search.toLowerCase().trim();
    const matchSearch = !query || 
      (d.name || "").toLowerCase().includes(query) || 
      (d.description || "").toLowerCase().includes(query) ||
      (d.tags_text || "").toLowerCase().includes(query);
    const matchCat = categoryFilter === "all" || d.category_id === categoryFilter;
    const matchFormat = formatFilter === "all" || (designFiles[d.id] || []).some((f: string) => f.toUpperCase() === formatFilter);
    return matchSearch && matchCat && matchFormat;
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Biblioteca de Designs</h1>
          <p className="text-muted-foreground mt-1">Explore nossa coleção de bordados profissionais</p>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar designs por título ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos formatos</SelectItem>
                {formats.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center text-muted-foreground">
              <SlidersHorizontal className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum resultado encontrado.</p>
              <p className="text-sm mt-1">Tente usar outras palavras-chave ou ajustar os filtros.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((design: any) => (
              <DesignCard
                key={design.id}
                name={design.name}
                coverImage={design.cover_image}
                category={design.categories?.name}
                tags={(design.tags_text || "").split(",").map((t: string) => t.trim()).filter(Boolean)}
                downloadCount={downloadCounts[design.id]}
                onClick={() => navigate(`/library/${design.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LibraryPage;
