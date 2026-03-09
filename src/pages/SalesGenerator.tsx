import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, MessageCircle, Instagram, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const SalesGenerator = () => {
  const [searchParams] = useSearchParams();
  const [designs, setDesigns] = useState<any[]>([]);
  const [productIdeas, setProductIdeas] = useState<any[]>([]);
  const [selectedDesign, setSelectedDesign] = useState(searchParams.get("design") || "");
  const [selectedProduct, setSelectedProduct] = useState(searchParams.get("product") || "");
  const [customPrice, setCustomPrice] = useState("");
  const [generated, setGenerated] = useState<{ title: string; description: string; whatsapp: string; instagram: string } | null>(null);

  useEffect(() => { db.from("designs").select("*").eq("is_published", true).order("title").then(({ data }: any) => setDesigns(data || [])); }, []);

  useEffect(() => {
    if (selectedDesign) db.from("product_ideas").select("*").eq("design_id", selectedDesign).then(({ data }: any) => setProductIdeas(data || []));
    else setProductIdeas([]);
  }, [selectedDesign]);

  const generate = () => {
    const design = designs.find((d: any) => d.id === selectedDesign);
    const product = productIdeas.find((p: any) => p.id === selectedProduct);
    if (!design || !product) { toast.error("Selecione um design e um produto."); return; }
    const priceText = customPrice ? `R$ ${Number(customPrice).toFixed(2)}` : "";
    const title = `${product.title} - ${design.title}`;
    const description = `${product.description || product.title}. Bordado profissional com acabamento de alta qualidade. ${priceText ? `Valor: ${priceText}` : ""}`.trim();
    const whatsapp = `Olá! 😊\n\nTenho novidade para você! ✨\n\n*${title}*\n\n${product.description || "Um produto lindo com bordado exclusivo!"}\n\n${priceText ? `💰 *${priceText}*\n\n` : ""}📦 Pronta entrega!\n\nInteressou? Me chama aqui no WhatsApp! 💬`;
    const instagram = `✨ ${title} ✨\n\n${product.description || "Bordado exclusivo com acabamento profissional!"}\n\n${priceText ? `💰 ${priceText}\n\n` : ""}📩 Encomende pelo link na bio ou pelo WhatsApp!\n\n#bordado #bordadoprofissional #artesanato #feitoamao #bordadolivre #${design.title.replace(/\s+/g, "").toLowerCase()}`;
    setGenerated({ title, description, whatsapp, instagram });
    toast.success("Texto gerado com sucesso!");
  };

  const copyText = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copiado!`); };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Gerador de Vendas</h1>
          <p className="text-muted-foreground mt-1">Crie textos prontos para WhatsApp e Instagram</p>
        </div>

        <Card className="border-border/60">
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Design</label>
              <Select value={selectedDesign} onValueChange={v => { setSelectedDesign(v); setSelectedProduct(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione um design" /></SelectTrigger>
                <SelectContent>{designs.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Produto</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={!selectedDesign}>
                <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                <SelectContent>{productIdeas.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Preço personalizado (opcional)</label>
              <Input type="number" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="Ex: 49.90" />
            </div>
            <Button onClick={generate} className="w-full gap-2">
              <Sparkles className="h-4 w-4" /> Gerar Textos de Venda
            </Button>
          </CardContent>
        </Card>

        {generated && (
          <div className="space-y-4">
            <Card className="border-border/60 border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-display"><MessageCircle className="h-5 w-5 text-green-500" /> WhatsApp</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={generated.whatsapp} readOnly className="min-h-[150px] resize-none bg-muted/30" />
                <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => copyText(generated.whatsapp, "Texto WhatsApp")}><Copy className="h-3.5 w-3.5" /> Copiar</Button>
              </CardContent>
            </Card>
            <Card className="border-border/60 border-l-4 border-l-secondary">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-display"><Instagram className="h-5 w-5 text-secondary" /> Instagram</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={generated.instagram} readOnly className="min-h-[150px] resize-none bg-muted/30" />
                <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => copyText(generated.instagram, "Caption Instagram")}><Copy className="h-3.5 w-3.5" /> Copiar</Button>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-border/60">
                <CardContent className="pt-5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Título do Produto</p>
                  <p className="font-display font-semibold">{generated.title}</p>
                  <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-primary" onClick={() => copyText(generated.title, "Título")}><Copy className="h-3.5 w-3.5" /> Copiar</Button>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="pt-5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Descrição Curta</p>
                  <p className="text-sm">{generated.description}</p>
                  <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-primary" onClick={() => copyText(generated.description, "Descrição")}><Copy className="h-3.5 w-3.5" /> Copiar</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SalesGenerator;
