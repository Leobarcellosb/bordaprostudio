import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DesignCard } from "@/components/cards/DesignCard";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formats = ["PES", "EXP", "DST", "JEF"];

const LibraryPage = () => {
  const [kits, setKits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [kitTags, setKitTags] = useState<Record<string, any[]>>({});
  const [kitFiles, setKitFiles] = useState<Record<string, any[]>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: kitsData }, { data: catsData }, { data: tagsData }, { data: ktData }, { data: kfData }] = await Promise.all([
        db.from("kits").select("*").eq("is_published", true).order("created_at", { ascending: false }),
        db.from("categories").select("*").order("name"),
        db.from("tags").select("*").order("name"),
        db.from("kit_tags").select("*, tags(*)"),
        db.from("kit_files").select("kit_id, file_format"),
      ]);
      setKits(kitsData || []);
      setCategories(catsData || []);
      setTags(tagsData || []);
      const tagMap: Record<string, any[]> = {};
      (ktData || []).forEach((kt: any) => { if (!tagMap[kt.kit_id]) tagMap[kt.kit_id] = []; tagMap[kt.kit_id].push(kt.tags); });
      setKitTags(tagMap);
      const fileMap: Record<string, any[]> = {};
      (kfData || []).forEach((kf: any) => { if (!fileMap[kf.kit_id]) fileMap[kf.kit_id] = []; if (!fileMap[kf.kit_id].includes(kf.file_format)) fileMap[kf.kit_id].push(kf.file_format); });
      setKitFiles(fileMap);
    };
    fetchData();
  }, []);

  const filtered = kits.filter((kit: any) => {
    const matchSearch = !search || kit.name.toLowerCase().includes(search.toLowerCase()) || kit.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || kit.category_id === categoryFilter;
    const matchFormat = formatFilter === "all" || (kitFiles[kit.id] || []).some((f: string) => f.toUpperCase() === formatFilter);
    const matchTag = tagFilter === "all" || (kitTags[kit.id] || []).some((t: any) => t?.id === tagFilter);
    return matchSearch && matchCat && matchFormat && matchTag;
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
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas tags</SelectItem>{tags.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
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
            {filtered.map((kit: any) => (
              <DesignCard
                key={kit.id}
                name={kit.name}
                coverImage={kit.cover_image}
                category={categories.find((c: any) => c.id === kit.category_id)?.name}
                tags={(kitTags[kit.id] || []).map((t: any) => t?.name).filter(Boolean)}
                onClick={() => navigate(`/library/${kit.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LibraryPage;
