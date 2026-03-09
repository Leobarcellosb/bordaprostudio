import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { Check, Crown } from "lucide-react";

const plans = [
  { id: "basic", name: "Basic", price: "Grátis", features: ["Acesso à biblioteca", "Downloads limitados", "1 catálogo"] },
  { id: "pro", name: "Pro", price: "R$ 29,90/mês", features: ["Biblioteca completa", "Downloads ilimitados", "5 catálogos", "Gerador de vendas"], popular: true },
  { id: "elite", name: "Elite", price: "R$ 59,90/mês", features: ["Tudo do Pro", "Catálogos ilimitados", "Suporte prioritário", "Novos designs primeiro"] },
];

const Settings = () => {
  const { profile, user } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [saving, setSaving] = useState(false);

  const updateProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await db.from("profiles").update({ name, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado!");
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-3xl animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Configurações</h1>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display">Perfil</CardTitle>
            <CardDescription>Atualize suas informações pessoais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium mb-1.5 block">Nome</label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1.5 block">Email</label><Input value={profile?.email || ""} disabled className="bg-muted/50" /></div>
            <Button onClick={updateProfile} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Crown className="h-5 w-5 text-primary" /> Planos</CardTitle>
            <CardDescription>Seu plano atual: <Badge className="capitalize ml-1">{profile?.plan || "basic"}</Badge></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map(plan => (
                <Card key={plan.id} className={`relative overflow-hidden ${plan.id === profile?.plan ? "border-primary border-2 shadow-md" : "border-border/60"}`}>
                  {plan.popular && <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground text-[10px] font-bold px-3 py-0.5 rounded-bl-lg">POPULAR</div>}
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                      <p className="text-primary font-bold text-xl mt-1">{plan.price}</p>
                    </div>
                    <ul className="space-y-2">{plan.features.map(f => (
                      <li key={f} className="text-sm flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}</ul>
                    {plan.id === profile?.plan ? (
                      <Badge variant="outline" className="w-full justify-center py-1.5">Plano atual</Badge>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full" disabled>Em breve</Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
