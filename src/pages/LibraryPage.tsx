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
      const [
        { data: kitsData },
        { data: catsData },
        { data: filesData },
        { data: ideasData },
      ] = await Promise.all([
        db.from("kits").select("*, categories(name)").eq("is_published", true).order("created_at", { ascending: false }),
        db.from("categories").select("*").order("name"),
        db.from("kit_files").select("kit_id, file_format"),
        db.from("product_ideas").select("*, kits(id, name, cover_image, categories(name))"),
      ]);

      setDesigns(kitsData || []);
      setCategories(catsData || []);
      setProductIdeas(ideasData || []);

      const fileMap: Record<string, string[]> = {};
      (filesData || []).forEach((f: any) => {
        if (!fileMap[f.kit_id]) fileMap[f.kit_id] = [];
        if (!fileMap[f.kit_id].includes(f.file_format)) fileMap[f.kit_id].push(f.file_format);
      });
      setDesignFiles(fileMap);
    };
    fetchData();
  }, []);

  // Intelligent search algorithm
  const searchResults: SearchResult = useMemo(() => {
    if (!search.trim()) {
      return {
        designs: designs,
        relatedDesigns: [],
        productIdeas: [],
        matchedTerms: [],
      };
    }

    const query = search.toLowerCase().trim();
    const queryTerms = query.split(/\s+/);

    // Score-based matching for designs
    const scoredDesigns = designs.map((design: any) => {
      let score = 0;
      const matchedTerms = new Set<string>();

      const name = (design.name || "").toLowerCase();
      const description = (design.description || "").toLowerCase();
      const category = (design.categories?.name || "").toLowerCase();
      const tags = (design.tags || []).map((t: string) => t.toLowerCase());

      // Exact match in name (highest score)
      if (name.includes(query)) {
        score += 100;
        matchedTerms.add("name");
      }

      // Word-by-word matching in name
      queryTerms.forEach((term) => {
        if (name.includes(term)) {
          score += 50;
          matchedTerms.add("name");
        }
        if (description.includes(term)) {
          score += 20;
          matchedTerms.add("description");
        }
        if (category.includes(term)) {
          score += 30;
          matchedTerms.add("category");
        }
        tags.forEach((tag) => {
          if (tag.includes(term)) {
            score += 40;
            matchedTerms.add("tag");
          }
        });
      });

      // Bonus for category exact match
      if (category === query) {
        score += 80;
      }

      return { design, score, matchedTerms: Array.from(matchedTerms) };
    });

    // Score-based matching for product ideas
    const scoredIdeas = productIdeas.map((idea: any) => {
      let score = 0;
      const matchedTerms = new Set<string>();

      const name = (idea.product_name || "").toLowerCase();
      const description = (idea.description || "").toLowerCase();
      const kitName = (idea.kits?.name || "").toLowerCase();
      const kitCategory = (idea.kits?.categories?.name || "").toLowerCase();

      if (name.includes(query)) {
        score += 80;
        matchedTerms.add("product");
      }

      queryTerms.forEach((term) => {
        if (name.includes(term)) {
          score += 40;
          matchedTerms.add("product");
        }
        if (description.includes(term)) {
          score += 15;
          matchedTerms.add("description");
        }
        if (kitName.includes(term)) {
          score += 25;
          matchedTerms.add("design");
        }
        if (kitCategory.includes(term)) {
          score += 20;
          matchedTerms.add("category");
        }
      });

      return { idea, score, matchedTerms: Array.from(matchedTerms) };
    });

    // Primary matches (score > 0)
    const primaryDesigns = scoredDesigns
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.design);

    // Related designs (lower score or keyword related)
    const relatedDesigns = scoredDesigns
      .filter((s) => s.score > 0 && s.score < 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.design);

    // Matched product ideas
    const matchedIdeas = scoredIdeas
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.idea);

    // Collect all matched terms for display
    const allMatchedTerms = new Set<string>();
    scoredDesigns.forEach((s) => {
      if (s.score > 0) s.matchedTerms.forEach((t) => allMatchedTerms.add(t));
    });
    scoredIdeas.forEach((s) => {
      if (s.score > 0) s.matchedTerms.forEach((t) => allMatchedTerms.add(t));
    });

    return {
      designs: primaryDesigns,
      relatedDesigns: relatedDesigns,
      productIdeas: matchedIdeas,
      matchedTerms: Array.from(allMatchedTerms),
    };
  }, [search, designs, productIdeas]);

  // Apply filters on top of search results
  const filtered = searchResults.designs.filter((d: any) => {
    const matchCat = categoryFilter === "all" || d.category_id === categoryFilter;
    const matchFormat = formatFilter === "all" || (designFiles[d.id] || []).some((f: string) => f.toUpperCase() === formatFilter);
    return matchCat && matchFormat;
  });

  const hasSearchQuery = search.trim().length > 0;
  const totalResults = filtered.length + searchResults.productIdeas.length;

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
              placeholder='Buscar designs... (ex: "baby bear", "floral", "christmas")'
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

        {/* Search results summary */}
        {hasSearchQuery && (
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1.5">
              <Search className="h-3 w-3" />
              {totalResults} resultado{totalResults !== 1 ? "s" : ""}
            </Badge>
            {searchResults.matchedTerms.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Buscando em:</span>
                {searchResults.matchedTerms.map((term) => (
                  <Badge key={term} variant="outline" className="text-[10px]">
                    {term === "name" && "Nome"}
                    {term === "description" && "Descrição"}
                    {term === "category" && "Categoria"}
                    {term === "tag" && "Tags"}
                    {term === "product" && "Produto"}
                    {term === "design" && "Design"}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {totalResults === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center text-muted-foreground">
              <SlidersHorizontal className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum resultado encontrado.</p>
              <p className="text-sm mt-1">
                {hasSearchQuery
                  ? "Tente usar outras palavras-chave ou ajustar os filtros."
                  : "Tente ajustar os filtros."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="designs" className="w-full">
            <TabsList>
              <TabsTrigger value="designs" className="gap-1.5">
                Designs {filtered.length > 0 && <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>}
              </TabsTrigger>
              {searchResults.productIdeas.length > 0 && (
                <TabsTrigger value="ideas" className="gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Ideias de Produto
                  <Badge variant="secondary" className="text-[10px]">{searchResults.productIdeas.length}</Badge>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="designs" className="mt-6">
              <div className="space-y-8">
                {/* Main results */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map((design: any) => (
                    <DesignCard
                      key={design.id}
                      name={design.name}
                      coverImage={design.cover_image}
                      category={design.categories?.name}
                      tags={design.tags || []}
                      onClick={() => navigate(`/library/${design.id}`)}
                    />
                  ))}
                </div>

                {/* Related designs section */}
                {hasSearchQuery && searchResults.relatedDesigns.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-display font-semibold text-sm text-muted-foreground">
                        Designs Relacionados
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {searchResults.relatedDesigns.map((design: any) => (
                        <Card
                          key={design.id}
                          className="group cursor-pointer border-border/60 overflow-hidden hover:shadow-md transition-all"
                          onClick={() => navigate(`/library/${design.id}`)}
                        >
                          <div className="aspect-square bg-muted overflow-hidden">
                            {design.cover_image ? (
                              <img
                                src={design.cover_image}
                                alt={design.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">🧵</div>
                            )}
                          </div>
                          <CardContent className="p-2">
                            <p className="font-medium text-xs truncate">{design.name}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {searchResults.productIdeas.length > 0 && (
              <TabsContent value="ideas" className="mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.productIdeas.map((idea: any) => (
                    <ProductIdeaCard
                      key={idea.id}
                      name={idea.product_name}
                      description={idea.description}
                      imageUrl={idea.image_url}
                      onGenerate={() => navigate(`/sales-generator?design=${idea.kit_id}&product=${idea.id}`)}
                    />
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default LibraryPage;
