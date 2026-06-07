import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Gift, Loader2, Ban } from "lucide-react";

interface ManualGrant {
  user_id: string;
  email: string | null;
  status: string;
  plan_code: string | null;
  access_expires_at: string | null;
  updated_at: string | null;
}

const fmtDate = (iso: string | null) =>
  !iso ? "permanente" : new Date(iso).toLocaleDateString("pt-BR");

export const AdminGrantAccess = () => {
  const [email, setEmail] = useState("");
  const [plano, setPlano] = useState<"mensal" | "anual">("mensal");
  const [permanente, setPermanente] = useState(false);
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [grants, setGrants] = useState<ManualGrant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGrants = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("subscriptions")
      .select("user_id, email, status, plan_code, access_expires_at, updated_at")
      .eq("provider", "manual")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("[AdminGrantAccess] load error:", error);
      toast.error("Erro ao carregar liberações: " + error.message);
    } else {
      setGrants((data ?? []) as ManualGrant[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadGrants(); }, [loadGrants]);

  const handleGrant = async () => {
    const e = email.trim().toLowerCase();
    if (!e) { toast.error("Informe um e-mail"); return; }
    setGranting(true);
    const { data, error } = await supabase.functions.invoke("admin-grant-access", {
      body: { email: e, plano, permanente },
    });
    setGranting(false);
    if (error) {
      toast.error("Falha ao liberar: " + (error.message || "erro"));
      return;
    }
    if (data?.email_sent === false) {
      toast.warning(`Acesso liberado, mas o e-mail falhou (${data?.email_error ?? "?"}). O usuário pode usar "esqueci a senha".`);
    } else {
      toast.success(data?.created ? "Conta criada e acesso liberado! E-mail enviado." : "Acesso liberado! E-mail enviado.");
    }
    setEmail("");
    setPermanente(false);
    loadGrants();
  };

  const handleRevoke = async (e: string | null) => {
    if (!e) return;
    if (!window.confirm(`Revogar o acesso manual de ${e}? (Se a pessoa tiver compra paga ativa, mantém o acesso pela Eduzz.)`)) return;
    setRevoking(e);
    const { error } = await supabase.functions.invoke("admin-grant-access", {
      body: { action: "revoke", email: e },
    });
    setRevoking(null);
    if (error) { toast.error("Falha ao revogar: " + (error.message || "erro")); return; }
    toast.success("Acesso manual revogado.");
    loadGrants();
  };

  const active = (g: ManualGrant) =>
    g.status === "active" && (!g.access_expires_at || new Date(g.access_expires_at) > new Date());

  return (
    <div className="space-y-6 mt-4">
      {/* Liberar acesso */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" /> Liberar acesso (comp / parceiro / teste)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cria a conta (se não existir), libera assinatura <strong>manual</strong> e envia o e-mail com link pra definir senha. Não passa pela Eduzz.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="grant-email" className="text-xs">E-mail</Label>
              <Input id="grant-email" type="email" value={email} placeholder="fulano@dominio.com"
                onChange={(ev) => setEmail(ev.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Plano</Label>
              <Select value={plano} onValueChange={(v) => setPlano(v as "mensal" | "anual")}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal (30d)</SelectItem>
                  <SelectItem value="anual">Anual (1 ano)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 h-10">
              <Switch id="grant-perm" checked={permanente} onCheckedChange={setPermanente} />
              <Label htmlFor="grant-perm" className="text-xs whitespace-nowrap">Permanente</Label>
            </div>
          </div>
          <Button onClick={handleGrant} disabled={granting} className="gap-2">
            {granting && <Loader2 className="h-4 w-4 animate-spin" />} Liberar acesso
          </Button>
        </CardContent>
      </Card>

      {/* Lista de liberações manuais */}
      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-base">Liberações manuais</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : grants.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nenhuma liberação manual ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold">E-mail</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold">Plano</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold">Expira</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {grants.map((g) => (
                    <tr key={g.user_id} className="border-t border-border/40">
                      <td className="px-4 py-2">{g.email ?? "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{g.plan_code ?? "—"}</td>
                      <td className="px-4 py-2">
                        <Badge variant={active(g) ? "default" : "secondary"} className="text-[10px]">
                          {active(g) ? "ativo" : g.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{fmtDate(g.access_expires_at)}</td>
                      <td className="px-4 py-2 text-right">
                        {active(g) && (
                          <Button size="sm" variant="outline" className="gap-1.5 text-destructive"
                            onClick={() => handleRevoke(g.email)} disabled={revoking === g.email}>
                            {revoking === g.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                            Revogar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
