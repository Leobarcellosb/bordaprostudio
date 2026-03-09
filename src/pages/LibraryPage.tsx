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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: designsData }, { data: catsData }, { data: filesData }] = await Promise.all([
        db.from("designs").select("*, categories(name)").eq("is_published", true).order("created_at", { ascending: false }),
        db.from("categories").select("*").order("name"),
        db.from("files").select("design_id, format"),
      ]);
      setDesigns(designsData || []);
      setCategories(catsData || []);
      const fileMap: Record<string, string[]> = {};
      (filesData || []).forEach((f: any) => {
        if (!fileMap[f.design_id]) fileMap[f.design_id] = [];
        if (!fileMap[f.design_id].includes(f.format)) fileMap[f.design_id].push(f.format);
      });
      setDesignFiles(fileMap);
    };
    fetchData();
  }, []);

  const filtered = designs.filter((d: any) => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase()) || (d.tags || []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = categoryFilter === "all" || d.category_id === categoryFilter;
    const matchFormat = formatFilter === "all" || (designFiles[d.id] || []).some((f: string) => f.toUpperCase() === formatFilter);
    return matchSearch && matchCat && matchFormat;
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Biblioteca de Designs</h1>
          <p className="text-muted-foreground mt-1">Explore nossa coleção de bordados profissionais</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar designs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas categorias</SelectItem>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Formato" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos formatos</SelectItem>{formats.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="border-border/60"><CardContent className="py-16 text-center text-muted-foreground">
            <SlidersHorizontal className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum design encontrado.</p>
            <p className="text-sm mt-1">Tente ajustar os filtros.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((design: any) => (
              <DesignCard
                key={design.id}
                name={design.title}
                coverImage={design.preview_image_url}
                category={design.categories?.name}
                tags={design.tags || []}
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
