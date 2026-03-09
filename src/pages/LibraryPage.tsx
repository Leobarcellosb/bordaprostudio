import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { useFavorites } from "@/hooks/useFavorites";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DesignCard } from "@/components/cards/DesignCard";
import { useNavigate } from "react-router-dom";
import { Search, Library, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const { favoriteIds, toggle: toggleFavorite } = useFavorites();

  useEffect(() => {
    const fetchData = async () => {
      const [
        { data: kitsData },
        { data: catsData },
        { data: filesData },
        { data: downloadsData },
      ] = await Promise.all([
        db.from("designs").select("*, categories(name)").eq("is_published", true).order("created_at", { ascending: false }),
        db.from("categories").select("*").order("name"),
        db.from("kit_arquivos").select("design_id, format"),
        db.from("downloads").select("kit_id"),
      ]);

      setDesigns(kitsData || []);
      setCategories(catsData || []);

      const fileMap: Record<string, string[]> = {};
      (filesData || []).forEach((f: any) => {
        if (!fileMap[f.design_id]) fileMap[f.design_id] = [];
        if (!fileMap[f.design_id].includes(f.format)) fileMap[f.design_id].push(f.format);
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

  const hasActiveFilters = search || categoryFilter !== "all" || formatFilter !== "all";

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Premium header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-accent/30 to-secondary/8 p-8 md:p-10">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Library className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold tracking-wide uppercase">
                {designs.length} matrizes
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight">
              Biblioteca de Matrizes
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed">
              Explore nossa biblioteca de matrizes de bordado profissionais, prontas para usar.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 opacity-10 blur-3xl bg-primary rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 opacity-8 blur-3xl bg-secondary rounded-full translate-y-1/2" />
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Buscar por título, descrição ou tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-muted/30 border-border/40 focus:bg-background focus:border-primary/30 transition-colors rounded-xl"
            />
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44 h-11 bg-muted/30 border-border/40 rounded-xl">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as as categorias</SelectItem>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-full sm:w-40 h-11 bg-muted/30 border-border/40 rounded-xl">
                <SelectValue placeholder="Formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os formatos</SelectItem>
                {formats.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        {hasActiveFilters && filtered.length > 0 && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> {filtered.length === 1 ? "matriz encontrada" : "matrizes encontradas"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
              onClick={() => { setSearch(""); setCategoryFilter("all"); setFormatFilter("all"); }}
            >
              Limpar filtros
            </Button>
          </div>
        )}

        {/* Results grid */}
        {filtered.length === 0 ? (
          <Card className="border-border/30 bg-gradient-to-br from-muted/30 to-accent/20 rounded-2xl">
            <CardContent className="py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="h-8 w-8 text-primary/40" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Nenhuma matriz encontrada</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Tente usar outras palavras-chave ou ajustar os filtros para encontrar o que procura.
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="mt-5 rounded-xl"
                  onClick={() => { setSearch(""); setCategoryFilter("all"); setFormatFilter("all"); }}
                >
                  Limpar todos os filtros
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((design: any) => (
              <DesignCard
                key={design.id}
                id={design.id}
                name={design.name}
                coverImage={design.cover_image}
                category={design.categories?.name}
                tags={(design.tags_text || "").split(",").map((t: string) => t.trim()).filter(Boolean)}
                downloadCount={downloadCounts[design.id]}
                isFavorite={favoriteIds.has(design.id)}
                onToggleFavorite={() => toggleFavorite(design.id)}
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
