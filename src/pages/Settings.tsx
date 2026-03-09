import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { Check } from "lucide-react";

const plans = [
  { id: "basic", name: "Basic", price: "Grátis", features: ["Acesso à biblioteca", "Downloads limitados", "1 catálogo"] },
  { id: "pro", name: "Pro", price: "R$ 29,90/mês", features: ["Biblioteca completa", "Downloads ilimitados", "5 catálogos", "Gerador de vendas"] },
  { id: "elite", name: "Elite", price: "R$ 59,90/mês", features: ["Tudo do Pro", "Catálogos ilimitados", "Suporte prioritário", "Novos designs primeiro"] },
];

const Settings = () => {
  const { profile, user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);

  const updateProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await db.from("profiles").update({ full_name: fullName, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado!");
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-3xl">
        <h1 className="text-3xl font-serif font-bold">Configurações</h1>
        <Card><CardHeader><CardTitle>Perfil</CardTitle><CardDescription>Atualize suas informações pessoais</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Nome</label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Email</label><Input value={profile?.email || ""} disabled /></div>
            <Button onClick={updateProfile} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </CardContent></Card>
        <Card><CardHeader><CardTitle>Planos</CardTitle><CardDescription>Seu plano atual: <Badge className="capitalize ml-1">{profile?.plan || "basic"}</Badge></CardDescription></CardHeader>
          <CardContent><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(plan => (
              <Card key={plan.id} className={plan.id === profile?.plan ? "border-primary border-2" : ""}>
                <CardContent className="pt-5 space-y-3">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-primary font-semibold">{plan.price}</p>
                  <ul className="space-y-1">{plan.features.map(f => <li key={f} className="text-sm flex items-center gap-1"><Check className="h-3 w-3 text-primary" /> {f}</li>)}</ul>
                  {plan.id === profile?.plan ? <Badge>Atual</Badge> : <Button variant="outline" size="sm" className="w-full" disabled>Em breve</Button>}
                </CardContent>
              </Card>
            ))}
          </div></CardContent></Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
