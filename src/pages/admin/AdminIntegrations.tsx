import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Plug, Settings, Power, Zap, Globe, CreditCard, ShoppingCart,
  Video, HardDrive, Cloud, Webhook, Clock, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Copy, Send
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { validateWebhookUrl } from "@/lib/urlValidation";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "payment" | "automation" | "content" | "storage";
  status?: "active" | "inactive" | "error";
  connected?: boolean;
}

const INTEGRATIONS: Integration[] = [
  { id: "eduzz", name: "Eduzz", description: "Plataforma de pagamentos e assinaturas digitais", icon: <CreditCard className="h-5 w-5" />, category: "payment", status: "active", connected: true },
  { id: "webhook", name: "Webhook", description: "Envie eventos para ferramentas externas (Zapier, Make, n8n)", icon: <Webhook className="h-5 w-5" />, category: "automation", status: "active", connected: true },
  { id: "hotmart", name: "Hotmart", description: "Plataforma de produtos digitais e afiliados", icon: <ShoppingCart className="h-5 w-5" />, category: "payment" },
  { id: "stripe", name: "Stripe", description: "Processamento de pagamentos global", icon: <CreditCard className="h-5 w-5" />, category: "payment" },
  { id: "mercadopago", name: "MercadoPago", description: "Pagamentos e checkout para América Latina", icon: <CreditCard className="h-5 w-5" />, category: "payment" },
  { id: "zapier", name: "Zapier", description: "Conecte mais de 5.000 apps sem código", icon: <Zap className="h-5 w-5" />, category: "automation" },
  { id: "make", name: "Make", description: "Automação visual de workflows complexos", icon: <RefreshCw className="h-5 w-5" />, category: "automation" },
  { id: "n8n", name: "n8n", description: "Automação open-source e auto-hospedada", icon: <Globe className="h-5 w-5" />, category: "automation" },
  { id: "youtube", name: "YouTube", description: "Integração com vídeos e canal do YouTube", icon: <Video className="h-5 w-5" />, category: "content" },
  { id: "vimeo", name: "Vimeo", description: "Hospedagem de vídeo profissional", icon: <Video className="h-5 w-5" />, category: "content" },
  { id: "gdrive", name: "Google Drive", description: "Armazenamento e compartilhamento na nuvem", icon: <Cloud className="h-5 w-5" />, category: "storage" },
  { id: "dropbox", name: "Dropbox", description: "Sincronização e backup de arquivos", icon: <HardDrive className="h-5 w-5" />, category: "storage" },
];

const WEBHOOK_EVENTS = [
  { key: "user_created", label: "Usuário criado" },
  { key: "subscription_started", label: "Assinatura iniciada" },
  { key: "design_downloaded", label: "Matriz baixada" },
  { key: "design_favorited", label: "Matriz favoritada" },
];

interface LogEntry {
  id: string;
  event_type: string;
  integration: string;
  email: string | null;
  status: string;
  message: string | null;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  payment: "Pagamentos",
  automation: "Automação",
  content: "Conteúdo",
  storage: "Armazenamento",
};

export const AdminIntegrations = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [openConfig, setOpenConfig] = useState<string | null>(null);

  const installed = INTEGRATIONS.filter((i) => i.connected);
  const available = INTEGRATIONS.filter((i) => !i.connected);

  useEffect(() => {
    let cancelled = false;
    const loadLogs = async () => {
      const { data } = await db
        .from("integration_logs")
        .select("id, event_type, integration, email, status, message, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      setLogs(data || []);
      setLoadingLogs(false);
    };
    loadLogs();
    return () => {
      cancelled = true;
    };
  }, []);

  const lastEduzzEvent = logs.find((l) => l.integration === "eduzz");
  const lastWebhookEvent = logs.find((l) => l.integration === "webhook");

  return (
    <div className="space-y-10 mt-2 pb-8">
      <div className="pt-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70 mb-1.5">Admin</p>
        <h3 className="text-2xl font-display font-bold tracking-tight text-foreground">Integrações</h3>
        <p className="text-sm text-muted-foreground mt-1">Gerencie conexões com ferramentas e serviços externos.</p>
      </div>

      <Tabs defaultValue="installed">
        <TabsList className="bg-muted/50 border border-border/40 h-9">
          <TabsTrigger value="installed" className="text-xs font-medium data-[state=active]:shadow-sm px-4">
            Instaladas ({installed.length})
          </TabsTrigger>
          <TabsTrigger value="available" className="text-xs font-medium data-[state=active]:shadow-sm px-4">
            Disponíveis ({available.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs font-medium data-[state=active]:shadow-sm px-4">
            Histórico {logs.length > 0 && `(${logs.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-6">
          <InstalledView
            integrations={installed}
            openConfig={openConfig}
            setOpenConfig={setOpenConfig}
            lastEduzzEvent={lastEduzzEvent}
            lastWebhookEvent={lastWebhookEvent}
          />
        </TabsContent>
        <TabsContent value="available" className="mt-6">
          <AvailableView integrations={available} />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <HistoryView logs={logs} loading={loadingLogs} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ── Installed ── */

function InstalledView({
  integrations,
  openConfig,
  setOpenConfig,
  lastEduzzEvent,
  lastWebhookEvent,
}: {
  integrations: Integration[];
  openConfig: string | null;
  setOpenConfig: (v: string | null) => void;
  lastEduzzEvent?: LogEntry;
  lastWebhookEvent?: LogEntry;
}) {
  if (!integrations.length) {
    return (
      <EmptyState
        icon={<Plug className="h-5 w-5 text-muted-foreground/40" />}
        title="Nenhuma integração instalada"
        subtitle="Conecte serviços na aba Disponíveis para começar."
      />
    );
  }

  const eduzzWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eduzz-webhook`;

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <Card key={item.id} className="border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)] hover:shadow-[0_4px_16px_hsl(268_78%_56%/0.08)] transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/10">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground/70 leading-tight mt-0.5">{item.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <StatusBadge status={item.status || "inactive"} />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] font-medium border-border/50 hover:bg-accent/50"
                  onClick={() => setOpenConfig(openConfig === item.id ? null : item.id)}
                >
                  <Settings className="h-3 w-3 mr-1.5" />
                  {openConfig === item.id ? "Fechar" : "Configurar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Eduzz Config Panel */}
      {openConfig === "eduzz" && (
        <Card className="border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)]">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
              </div>
              <CardTitle className="text-[13px] font-sans font-semibold text-foreground/80">Configuração Eduzz</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider mb-1.5 block">Webhook URL</label>
              <div className="flex gap-2">
                <Input readOnly value={eduzzWebhookUrl} className="text-xs font-mono bg-muted/40 border-border/40 h-8" />
                <Button variant="outline" size="sm" className="h-8 px-3 shrink-0" onClick={() => copyUrl(eduzzWebhookUrl)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Cole esta URL no painel da Eduzz em Configurações → Webhooks.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider mb-1 block">Status</label>
                <StatusBadge status="active" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider mb-1 block">Último evento</label>
                {lastEduzzEvent ? (
                  <p className="text-xs text-foreground/75">{lastEduzzEvent.event_type} — {new Date(lastEduzzEvent.created_at).toLocaleString("pt-BR")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground/50">Nenhum evento recebido</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider mb-1 block">Eventos suportados</label>
                <div className="flex flex-wrap gap-1">
                  {["purchase_approved", "purchase_refunded", "subscription_canceled"].map((e) => (
                    <Badge key={e} variant="secondary" className="text-[9px] bg-muted/60 border-0 px-1.5 py-0 h-4">{e}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-accent/40 border border-border/30 p-3">
              <p className="text-[11px] text-foreground/70 leading-relaxed">
                <strong>Como funciona:</strong> Quando um cliente compra ou cancela na Eduzz, o webhook é acionado automaticamente. A plataforma cria a conta do usuário (se necessário), ativa ou desativa o plano e registra o evento no histórico.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Config Panel */}
      {openConfig === "webhook" && <WebhookConfigPanel lastEvent={lastWebhookEvent} />}
    </div>
  );
}

/* ── Webhook Config ── */

function WebhookConfigPanel({ lastEvent }: { lastEvent?: LogEntry }) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [enabledEvents, setEnabledEvents] = useState<string[]>(WEBHOOK_EVENTS.map((e) => e.key));
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await db
        .from("webhook_configs")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setWebhookUrl(data.url || "");
        setIsActive(data.is_active ?? true);
        setEnabledEvents(data.events || WEBHOOK_EVENTS.map((e) => e.key));
        setConfigId(data.id);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    const validation = validateWebhookUrl(webhookUrl);
    if (!validation.ok) {
      toast.error(validation.error);
      return false;
    }
    setSaving(true);
    const payload = {
      url: validation.url,
      is_active: isActive,
      events: enabledEvents,
      updated_at: new Date().toISOString(),
    };
    if (configId) {
      await db.from("webhook_configs").update(payload).eq("id", configId);
    } else {
      const { data } = await db.from("webhook_configs").insert(payload).select("id").single();
      if (data) setConfigId(data.id);
    }
    setSaving(false);
    toast.success("Configuração salva!");
    return true;
  };

  const handleTest = async () => {
    const saved = await handleSave();
    if (!saved) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("dispatch-webhook", {
        body: { event_name: "webhook_test", is_test: true },
      });
      if (error) {
        toast.error("Falha no teste: " + error.message);
      } else {
        toast.success("Teste enviado! Verifique o histórico.");
      }
    } catch (err) {
      toast.error("Erro ao testar webhook.");
    }
    setTesting(false);
  };

  const toggleEvent = (key: string) => {
    setEnabledEvents((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    );
  };

  if (loading) {
    return (
      <Card className="border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)]">
        <CardContent className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)]">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
            <Webhook className="h-3.5 w-3.5 text-primary" />
          </div>
          <CardTitle className="text-[13px] font-sans font-semibold text-foreground/80">Configuração Webhook</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-5">
        {/* URL */}
        <div>
          <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider mb-1.5 block">
            URL de destino
          </label>
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            className="text-xs font-mono bg-muted/40 border-border/40 h-8"
          />
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            URL para onde os eventos POST serão enviados (ex: Zapier, Make, n8n).
          </p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground/80">Webhook ativo</p>
            <p className="text-[10px] text-muted-foreground/60">Ative para enviar eventos em tempo real.</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        {/* Events */}
        <div>
          <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider mb-2 block">
            Eventos habilitados
          </label>
          <div className="grid grid-cols-2 gap-2">
            {WEBHOOK_EVENTS.map((evt) => (
              <label
                key={evt.key}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border/30 bg-muted/20 hover:bg-accent/30 cursor-pointer transition-colors"
              >
                <Switch
                  checked={enabledEvents.includes(evt.key)}
                  onCheckedChange={() => toggleEvent(evt.key)}
                  className="scale-75"
                />
                <div>
                  <p className="text-[11px] font-medium text-foreground/80">{evt.label}</p>
                  <p className="text-[9px] text-muted-foreground/50 font-mono">{evt.key}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Last event */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider mb-1 block">Status</label>
            <StatusBadge status={isActive && webhookUrl ? "active" : "inactive"} />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider mb-1 block">Último evento</label>
            {lastEvent ? (
              <p className="text-xs text-foreground/75">{lastEvent.event_type} — {new Date(lastEvent.created_at).toLocaleString("pt-BR")}</p>
            ) : (
              <p className="text-xs text-muted-foreground/50">Nenhum evento enviado</p>
            )}
          </div>
        </div>

        {/* Payload preview */}
        <div className="rounded-lg bg-accent/40 border border-border/30 p-3">
          <p className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider mb-1.5">Exemplo de payload</p>
          <pre className="text-[10px] font-mono text-foreground/60 leading-relaxed">{JSON.stringify({
            event_name: "design_downloaded",
            timestamp: "2026-03-10T14:30:00.000Z",
            user_email: "cliente@email.com",
            user_id: "uuid-do-usuario",
            design_id: "uuid-da-matriz",
          }, null, 2)}</pre>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="h-8 text-xs font-medium"
          >
            {saving ? "Salvando..." : "Salvar configuração"}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !webhookUrl.trim()}
            size="sm"
            className="h-8 text-xs font-medium border-border/50"
          >
            <Send className="h-3 w-3 mr-1.5" />
            {testing ? "Enviando..." : "Testar conexão"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Available ── */

function AvailableView({ integrations }: { integrations: Integration[] }) {
  const grouped = integrations.reduce<Record<string, Integration[]>>((acc, i) => {
    (acc[i.category] = acc[i.category] || []).push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <div className="border-b border-border/40 pb-2 mb-4">
            <h4 className="text-sm font-display font-semibold text-foreground">{categoryLabels[cat] || cat}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card key={item.id} className="border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)] hover:shadow-[0_4px_16px_hsl(268_78%_56%/0.08)] transition-all duration-300 group">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted/60 text-muted-foreground border border-border/30 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/10 transition-colors duration-300">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground/70 leading-tight mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-[11px] font-medium border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                    onClick={() => toast.info(`Integração com ${item.name} disponível em breve.`)}
                  >
                    <Power className="h-3 w-3 mr-1.5" />
                    Conectar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── History ── */

function HistoryView({ logs, loading }: { logs: LogEntry[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!logs.length) {
    return (
      <EmptyState
        icon={<Clock className="h-5 w-5 text-muted-foreground/40" />}
        title="Nenhum evento registrado"
        subtitle="Eventos de integração aparecerão aqui quando webhooks forem recebidos."
      />
    );
  }

  return (
    <Card className="border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left py-3 px-5 font-semibold text-muted-foreground/70 uppercase tracking-wider text-[10px]">Evento</th>
              <th className="text-left py-3 px-5 font-semibold text-muted-foreground/70 uppercase tracking-wider text-[10px]">Integração</th>
              <th className="text-left py-3 px-5 font-semibold text-muted-foreground/70 uppercase tracking-wider text-[10px]">Usuário</th>
              <th className="text-left py-3 px-5 font-semibold text-muted-foreground/70 uppercase tracking-wider text-[10px]">Mensagem</th>
              <th className="text-left py-3 px-5 font-semibold text-muted-foreground/70 uppercase tracking-wider text-[10px]">Status</th>
              <th className="text-left py-3 px-5 font-semibold text-muted-foreground/70 uppercase tracking-wider text-[10px]">Data</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log.id} className={`${i < logs.length - 1 ? "border-b border-border/20" : ""} hover:bg-accent/30 transition-colors`}>
                <td className="py-3 px-5 font-medium text-foreground/85 font-mono text-[11px]">{log.event_type}</td>
                <td className="py-3 px-5">
                  <Badge variant="secondary" className="text-[10px] font-semibold bg-muted/60 border-0 px-2 py-0 h-5">{log.integration}</Badge>
                </td>
                <td className="py-3 px-5 text-muted-foreground">{log.email || "—"}</td>
                <td className="py-3 px-5 text-foreground/70 max-w-[200px] truncate">{log.message || "—"}</td>
                <td className="py-3 px-5">
                  <LogStatusBadge status={log.status as "success" | "error" | "pending"} />
                </td>
                <td className="py-3 px-5 text-muted-foreground/60 tabular-nums whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ── Shared ── */

function StatusBadge({ status }: { status: "active" | "inactive" | "error" }) {
  if (status === "active") {
    return (
      <Badge className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border-0 px-2 py-0 h-5 gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Conectado
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge className="text-[10px] font-semibold bg-destructive/10 text-destructive border-0 px-2 py-0 h-5 gap-1">
        <AlertCircle className="h-2.5 w-2.5" />
        Erro
      </Badge>
    );
  }
  return (
    <Badge className="text-[10px] font-semibold bg-muted/60 text-muted-foreground border-0 px-2 py-0 h-5">
      Inativo
    </Badge>
  );
}

function LogStatusBadge({ status }: { status: "success" | "error" | "pending" }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600">
        <CheckCircle2 className="h-3 w-3" />
        <span className="text-[10px] font-medium">Sucesso</span>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <XCircle className="h-3 w-3" />
        <span className="text-[10px] font-medium">Erro</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-500">
      <Clock className="h-3 w-3" />
      <span className="text-[10px] font-medium">Pendente</span>
    </span>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground/70">{title}</p>
      <p className="text-xs text-muted-foreground/50 mt-1">{subtitle}</p>
    </div>
  );
}
