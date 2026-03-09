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
import { SubscriptionCard } from "@/components/SubscriptionCard";




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

        <SubscriptionCard />
      </div>
    </AppLayout>
  );
};

export default Settings;
