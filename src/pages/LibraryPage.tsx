import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Biblioteca de Designs</h1>
          <p className="text-muted-foreground mt-1">Explore nossa coleção de bordados profissionais</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar designs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
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
        {filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">Nenhum design encontrado.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((kit: any) => (
              <Card key={kit.id} className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5" onClick={() => navigate(`/library/${kit.id}`)}>
                <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                  {kit.cover_image ? <img src={kit.cover_image} alt={kit.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl">🧵</div>}
                </div>
                <CardContent className="pt-3 space-y-2">
                  <h3 className="font-medium truncate">{kit.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{kit.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {(kitTags[kit.id] || []).slice(0, 3).map((t: any) => <Badge key={t?.id} variant="secondary" className="text-xs">{t?.name}</Badge>)}
                    {(kitFiles[kit.id] || []).slice(0, 2).map((f: string) => <Badge key={f} variant="outline" className="text-xs">{f}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LibraryPage;
