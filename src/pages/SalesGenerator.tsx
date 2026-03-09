import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, MessageCircle, Instagram } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const SalesGenerator = () => {
  const [searchParams] = useSearchParams();
  const [kits, setKits] = useState<any[]>([]);
  const [productIdeas, setProductIdeas] = useState<any[]>([]);
  const [selectedKit, setSelectedKit] = useState(searchParams.get("kit") || "");
  const [selectedProduct, setSelectedProduct] = useState(searchParams.get("product") || "");
  const [customPrice, setCustomPrice] = useState("");
  const [generated, setGenerated] = useState<{ title: string; description: string; whatsapp: string; instagram: string } | null>(null);

  useEffect(() => { db.from("kits").select("*").eq("is_published", true).order("name").then(({ data }: any) => setKits(data || [])); }, []);

  useEffect(() => {
    if (selectedKit) db.from("product_ideas").select("*").eq("kit_id", selectedKit).then(({ data }: any) => setProductIdeas(data || []));
    else setProductIdeas([]);
  }, [selectedKit]);

  const generate = () => {
    const kit = kits.find((k: any) => k.id === selectedKit);
    const product = productIdeas.find((p: any) => p.id === selectedProduct);
    if (!kit || !product) { toast.error("Selecione um design e um produto."); return; }
    const price = customPrice || product.suggested_price;
    const priceText = price ? `R$ ${Number(price).toFixed(2)}` : "";
    const title = `${product.product_name} - ${kit.name}`;
    const description = `${product.description || product.product_name}. Bordado profissional com acabamento de alta qualidade. ${priceText ? `Valor: ${priceText}` : ""}`.trim();
    const whatsapp = `Olá! 😊\n\nTenho novidade para você! ✨\n\n*${title}*\n\n${product.description || "Um produto lindo com bordado exclusivo!"}\n\n${priceText ? `💰 *${priceText}*\n\n` : ""}📦 Pronta entrega!\n\nInteressou? Me chama aqui no WhatsApp! 💬`;
    const instagram = `✨ ${title} ✨\n\n${product.description || "Bordado exclusivo com acabamento profissional!"}\n\n${priceText ? `💰 ${priceText}\n\n` : ""}📩 Encomende pelo link na bio ou pelo WhatsApp!\n\n#bordado #bordadoprofissional #artesanato #feitoamao #bordadolivre #${kit.name.replace(/\s+/g, "").toLowerCase()}`;
    setGenerated({ title, description, whatsapp, instagram });
    toast.success("Texto gerado com sucesso!");
  };

  const copyText = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copiado!`); };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-serif font-bold">Gerador de Vendas</h1>
          <p className="text-muted-foreground mt-1">Crie textos prontos para WhatsApp e Instagram</p>
        </div>
        <Card><CardContent className="pt-6 space-y-4">
          <div><label className="text-sm font-medium mb-1 block">Design</label>
            <Select value={selectedKit} onValueChange={v => { setSelectedKit(v); setSelectedProduct(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione um design" /></SelectTrigger>
              <SelectContent>{kits.map((k: any) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><label className="text-sm font-medium mb-1 block">Produto</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={!selectedKit}>
              <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
              <SelectContent>{productIdeas.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><label className="text-sm font-medium mb-1 block">Preço personalizado (opcional)</label>
            <Input type="number" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} placeholder="Ex: 49.90" /></div>
          <Button onClick={generate} className="w-full">Gerar Textos de Venda</Button>
        </CardContent></Card>
        {generated && (
          <div className="space-y-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MessageCircle className="h-5 w-5 text-primary" /> WhatsApp</CardTitle></CardHeader>
              <CardContent><Textarea value={generated.whatsapp} readOnly className="min-h-[150px] resize-none" />
                <Button variant="outline" size="sm" className="mt-2" onClick={() => copyText(generated.whatsapp, "Texto WhatsApp")}><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
              </CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Instagram className="h-5 w-5 text-accent" /> Instagram</CardTitle></CardHeader>
              <CardContent><Textarea value={generated.instagram} readOnly className="min-h-[150px] resize-none" />
                <Button variant="outline" size="sm" className="mt-2" onClick={() => copyText(generated.instagram, "Caption Instagram")}><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
              </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-lg">Título do Produto</CardTitle></CardHeader>
              <CardContent><p className="font-medium">{generated.title}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => copyText(generated.title, "Título")}><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
              </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-lg">Descrição Curta</CardTitle></CardHeader>
              <CardContent><p>{generated.description}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => copyText(generated.description, "Descrição")}><Copy className="h-4 w-4 mr-1" /> Copiar</Button>
              </CardContent></Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SalesGenerator;
