import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, TrendingUp, Package, Clock, Cpu, Scissors, RotateCcw } from "lucide-react";

const ProfitCalculator = () => {
  const [form, setForm] = useState({ productCost: "", threadCost: "", embroideryTime: "", machineCost: "" });
  const [result, setResult] = useState<{ totalCost: number; sellingPrice: number; profit: number; margin: number } | null>(null);

  const update = (field: string, value: string) => {
    // Allow only numbers, dots, and commas
    const sanitized = value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setForm((prev) => ({ ...prev, [field]: sanitized }));
  };

  const parse = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) || n < 0 ? 0 : n;
  };

  const calculate = () => {
    const product = parse(form.productCost);
    const thread = parse(form.threadCost);
    const time = parse(form.embroideryTime);
    const machine = parse(form.machineCost);

    const laborRate = 30; // R$/hour estimate
    const laborCost = (time / 60) * laborRate;
    const totalCost = product + thread + laborCost + machine;
    const marginMultiplier = 2.5;
    const sellingPrice = Math.ceil(totalCost * marginMultiplier);
    const profit = sellingPrice - totalCost;
    const margin = totalCost > 0 ? (profit / sellingPrice) * 100 : 0;

    setResult({ totalCost, sellingPrice, profit, margin });
  };

  const reset = () => {
    setForm({ productCost: "", threadCost: "", embroideryTime: "", machineCost: "" });
    setResult(null);
  };

  const canCalculate = Object.values(form).some((v) => parse(v) > 0);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Calculadora de Lucro</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Calcule custos e preço de venda dos seus bordados</p>
          </div>
        </div>

        {/* Input fields */}
        <Card className="border-border/60">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" /> Custo do Produto (R$)
                </label>
                <Input
                  value={form.productCost}
                  onChange={(e) => update("productCost", e.target.value)}
                  placeholder="Ex: 15.00"
                  inputMode="decimal"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Toalha, babador, pano de prato, etc.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                  <Scissors className="h-3.5 w-3.5 text-muted-foreground" /> Custo da Linha (R$)
                </label>
                <Input
                  value={form.threadCost}
                  onChange={(e) => update("threadCost", e.target.value)}
                  placeholder="Ex: 3.00"
                  inputMode="decimal"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Linha, entretela, estabilizador</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Tempo de Bordado (min)
                </label>
                <Input
                  value={form.embroideryTime}
                  onChange={(e) => update("embroideryTime", e.target.value)}
                  placeholder="Ex: 20"
                  inputMode="decimal"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Calculado a R$30/hora de mão de obra</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-muted-foreground" /> Custo da Máquina (R$)
                </label>
                <Input
                  value={form.machineCost}
                  onChange={(e) => update("machineCost", e.target.value)}
                  placeholder="Ex: 2.00"
                  inputMode="decimal"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Desgaste, energia, manutenção</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={calculate} disabled={!canCalculate} className="gap-2 flex-1">
                <Calculator className="h-4 w-4" /> Calcular
              </Button>
              <Button variant="outline" onClick={reset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
            <Card className="border-border/60 bg-muted/30">
              <CardContent className="p-5 text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
                  <DollarSign className="h-5 w-5 text-destructive" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Custo Total</p>
                <p className="text-2xl font-display font-bold">{fmt(result.totalCost)}</p>
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5 text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Preço Sugerido</p>
                <p className="text-2xl font-display font-bold text-primary">{fmt(result.sellingPrice)}</p>
                <Badge variant="secondary" className="text-[10px]">Margem de 2.5x</Badge>
              </CardContent>
            </Card>

            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-5 text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Lucro Estimado</p>
                <p className="text-2xl font-display font-bold text-green-600">{fmt(result.profit)}</p>
                <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                  {result.margin.toFixed(0)}% de margem
                </Badge>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProfitCalculator;
