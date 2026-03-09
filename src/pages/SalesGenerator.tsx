import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, MessageCircle, Instagram, Sparkles, ChevronRight, Check, RotateCcw, DollarSign, Lightbulb } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

const PRODUCT_TYPES = [
  { id: "toalha", label: "Toalha", emoji: "🏖️" },
  { id: "body-bebe", label: "Body Bebê", emoji: "👶" },
  { id: "almofada", label: "Almofada", emoji: "🛋️" },
  { id: "mochila", label: "Mochila", emoji: "🎒" },
  { id: "camiseta", label: "Camiseta", emoji: "👕" },
  { id: "caminho-mesa", label: "Caminho de Mesa", emoji: "🍽️" },
  { id: "avental", label: "Avental", emoji: "🧑‍🍳" },
  { id: "porta-panela", label: "Porta-panela", emoji: "🫕" },
  { id: "babador", label: "Babador", emoji: "🍼" },
  { id: "pano-prato", label: "Pano de Prato", emoji: "🧽" },
];

interface Generated {
  title: string;
  description: string;
  whatsapp: string;
  instagram: string;
  priceMin: number;
  priceMax: number;
  productIdea: string;
  productIdeaDescription: string;
}

const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={copy} className="gap-1.5 shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado!" : "Copiar"}
    </Button>
  );
};

const SalesGenerator = () => {
  const [searchParams] = useSearchParams();
  const [designs, setDesigns] = useState<any[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [selectedProductType, setSelectedProductType] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    db.from("designs").select("*, categories(name)").eq("is_published", true).order("name")
      .then(({ data }: any) => {
        setDesigns(data || []);
        const designId = searchParams.get("design");
        if (designId && data) {
          const found = data.find((d: any) => d.id === designId);
          if (found) { setSelectedDesign(found); setStep(2); }
        }
      });
  }, []);

  const handleSelectDesign = (design: any) => {
    setSelectedDesign(design);
    setGenerated(null);
    setStep(2);
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductType(productId);
    setGenerated(null);
  };

  const generate = async () => {
    if (!selectedDesign || !selectedProductType) {
      toast.error("Selecione um design e um tipo de produto.");
      return;
    }
    setLoading(true);
    setGenerated(null);
    setStep(3);

    const productLabel = PRODUCT_TYPES.find(p => p.id === selectedProductType)?.label || selectedProductType;

    try {
      const { data, error } = await supabase.functions.invoke("generate-sales-text", {
        body: {
          designName: selectedDesign.name,
          designDescription: selectedDesign.description || "",
          designTags: selectedDesign.tags_text || "",
          category: selectedDesign.categories?.name || "",
          productType: productLabel,
          price: customPrice || null,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setStep(2);
        return;
      }

      setGenerated(data as Generated);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao gerar texto. Tente novamente.");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedDesign(null);
    setSelectedProductType("");
    setCustomPrice("");
    setGenerated(null);
    setStep(1);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Gerador de Vendas</h1>
            <p className="text-muted-foreground mt-1">Textos prontos para WhatsApp e Instagram com IA</p>
          </div>
          {(selectedDesign || generated) && (
            <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Recomeçar
            </Button>
          )}
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-sm">
          {[
            { n: 1, label: "Design" },
            { n: 2, label: "Produto" },
            { n: 3, label: "Resultado" },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors",
                step === n ? "bg-primary text-primary-foreground" :
                step > n ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {step > n ? <Check className="h-3 w-3" /> : <span className="text-xs">{n}</span>}
                {label}
              </div>
              {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
            </div>
          ))}
        </div>

        {/* STEP 1: Design selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</div>
            <h2 className="font-display font-semibold">Selecione o design</h2>
            {selectedDesign && <Badge variant="secondary" className="ml-auto text-xs">{selectedDesign.name}</Badge>}
          </div>

          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {designs.map((d: any) => (
                <button
                  key={d.id}
                  onClick={() => handleSelectDesign(d)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-background hover:border-primary/40 hover:shadow-sm transition-all text-left group"
                >
                  {d.cover_image ? (
                    <img src={d.cover_image} alt={d.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center text-xl shrink-0">🧵</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{d.name}</p>
                    {d.categories?.name && <p className="text-xs text-muted-foreground">{d.categories.name}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0 ml-auto transition-colors" />
                </button>
              ))}
              {designs.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2 py-4 text-center">Nenhum design publicado ainda.</p>
              )}
            </div>
          )}
        </div>

        {/* STEP 2: Product type + price */}
        {step >= 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</div>
              <h2 className="font-display font-semibold">Tipo de produto</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRODUCT_TYPES.map(pt => (
                <button
                  key={pt.id}
                  onClick={() => handleSelectProduct(pt.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                    selectedProductType === pt.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 hover:border-primary/30 hover:shadow-sm"
                  )}
                >
                  <span className="text-2xl">{pt.emoji}</span>
                  <span className="text-xs font-medium">{pt.label}</span>
                  {selectedProductType === pt.id && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Preço (opcional)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                  placeholder="Ex: 49.90"
                />
              </div>
              <div className="pt-5">
                <Button
                  onClick={generate}
                  disabled={!selectedProductType || loading}
                  className="gap-2 px-6"
                >
                  <Sparkles className="h-4 w-4" />
                  {loading ? "Gerando..." : "Gerar com IA"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <Card className="border-border/60">
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <Sparkles className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-medium">A IA está criando seus textos...</p>
              <p className="text-xs text-muted-foreground">Isso leva alguns segundos</p>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Results */}
        {generated && !loading && (
          <div className="space-y-4 animate-fade-in">
            {/* Title + Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-border/60">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Título do Produto</p>
                      <p className="font-display font-semibold text-sm leading-snug">{generated.title}</p>
                    </div>
                    <CopyButton text={generated.title} label="Título" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Descrição</p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{generated.description}</p>
                    </div>
                    <CopyButton text={generated.description} label="Descrição" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price range + Product idea */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-border/60 border-l-4 border-l-primary">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Faixa de Preço Sugerida</p>
                  </div>
                  <p className="font-display font-bold text-xl text-primary">
                    R$ {generated.priceMin?.toFixed(2)} — R$ {generated.priceMax?.toFixed(2)}
                  </p>
                  <CopyButton text={`R$ ${generated.priceMin?.toFixed(2)} a R$ ${generated.priceMax?.toFixed(2)}`} label="Faixa de preço" />
                </CardContent>
              </Card>
              <Card className="border-border/60 border-l-4 border-l-secondary">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-secondary" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ideia de Produto</p>
                  </div>
                  <p className="font-display font-semibold text-sm">{generated.productIdea}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{generated.productIdeaDescription}</p>
                </CardContent>
              </Card>
            </div>

            {/* Instagram */}
            <Card className="border-border/60 border-l-4 border-l-secondary">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-display">
                    <Instagram className="h-4 w-4 text-secondary" /> Caption Instagram
                  </span>
                  <CopyButton text={generated.instagram} label="Caption Instagram" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={generated.instagram} readOnly className="min-h-[160px] resize-none bg-muted/30 text-sm leading-relaxed" />
              </CardContent>
            </Card>

            {/* WhatsApp */}
            <Card className="border-border/60 border-l-4 border-l-green-500">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-display">
                    <MessageCircle className="h-4 w-4 text-green-500" /> Mensagem WhatsApp
                  </span>
                  <CopyButton text={generated.whatsapp} label="Texto WhatsApp" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={generated.whatsapp} readOnly className="min-h-[160px] resize-none bg-muted/30 text-sm leading-relaxed" />
              </CardContent>
            </Card>

            {/* Regenerate */}
            <Button variant="outline" onClick={generate} className="w-full gap-2">
              <RotateCcw className="h-3.5 w-3.5" /> Gerar nova versão
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SalesGenerator;
