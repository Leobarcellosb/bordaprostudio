import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plug, Settings, Power, Zap, Globe, CreditCard, ShoppingCart,
  Video, HardDrive, Cloud, Webhook, ArrowRight, Clock, CheckCircle2,
  XCircle, AlertCircle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

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
  { id: "hotmart", name: "Hotmart", description: "Plataforma de produtos digitais e afiliados", icon: <ShoppingCart className="h-5 w-5" />, category: "payment" },
  { id: "stripe", name: "Stripe", description: "Processamento de pagamentos global", icon: <CreditCard className="h-5 w-5" />, category: "payment" },
  { id: "mercadopago", name: "MercadoPago", description: "Pagamentos e checkout para América Latina", icon: <CreditCard className="h-5 w-5" />, category: "payment" },
  { id: "webhook", name: "Webhook", description: "Receba notificações via HTTP em tempo real", icon: <Webhook className="h-5 w-5" />, category: "automation", status: "active", connected: true },
  { id: "zapier", name: "Zapier", description: "Conecte mais de 5.000 apps sem código", icon: <Zap className="h-5 w-5" />, category: "automation" },
  { id: "make", name: "Make", description: "Automação visual de workflows complexos", icon: <RefreshCw className="h-5 w-5" />, category: "automation" },
  { id: "n8n", name: "n8n", description: "Automação open-source e auto-hospedada", icon: <Globe className="h-5 w-5" />, category: "automation" },
  { id: "youtube", name: "YouTube", description: "Integração com vídeos e canal do YouTube", icon: <Video className="h-5 w-5" />, category: "content" },
  { id: "vimeo", name: "Vimeo", description: "Hospedagem de vídeo profissional", icon: <Video className="h-5 w-5" />, category: "content" },
  { id: "gdrive", name: "Google Drive", description: "Armazenamento e compartilhamento na nuvem", icon: <Cloud className="h-5 w-5" />, category: "storage" },
  { id: "dropbox", name: "Dropbox", description: "Sincronização e backup de arquivos", icon: <HardDrive className="h-5 w-5" />, category: "storage" },
];

interface LogEntry {
  id: string;
  event: string;
  integration: string;
  user: string;
  status: "success" | "error" | "pending";
  timestamp: string;
}

const MOCK_LOGS: LogEntry[] = [
  { id: "1", event: "Webhook recebido", integration: "Eduzz", user: "Sistema", status: "success", timestamp: "2026-03-10 14:32" },
  { id: "2", event: "Assinatura ativada", integration: "Eduzz", user: "maria@email.com", status: "success", timestamp: "2026-03-10 14:30" },
  { id: "3", event: "Webhook recebido", integration: "Webhook", user: "Sistema", status: "success", timestamp: "2026-03-10 12:15" },
  { id: "4", event: "Falha na conexão", integration: "Stripe", user: "Sistema", status: "error", timestamp: "2026-03-09 18:45" },
  { id: "5", event: "Teste de conexão", integration: "Webhook", user: "admin@bordapro.com", status: "pending", timestamp: "2026-03-09 10:20" },
];

const categoryLabels: Record<string, string> = {
  payment: "Pagamentos",
  automation: "Automação",
  content: "Conteúdo",
  storage: "Armazenamento",
};

export const AdminIntegrations = () => {
  const installed = INTEGRATIONS.filter((i) => i.connected);
  const available = INTEGRATIONS.filter((i) => !i.connected);

  return (
    <div className="space-y-10 mt-2 pb-8">
      {/* Header */}
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
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-6">
          <InstalledView integrations={installed} />
        </TabsContent>
        <TabsContent value="available" className="mt-6">
          <AvailableView integrations={available} />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <HistoryView logs={MOCK_LOGS} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ── Installed ── */

function InstalledView({ integrations }: { integrations: Integration[] }) {
  if (!integrations.length) {
    return (
      <EmptyState
        icon={<Plug className="h-5 w-5 text-muted-foreground/40" />}
        title="Nenhuma integração instalada"
        subtitle="Conecte serviços na aba Disponíveis para começar."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {integrations.map((item) => (
        <Card key={item.id} className="border-border/40 bg-card shadow-[0_1px_3px_hsl(268_78%_56%/0.04)] hover:shadow-[0_4px_16px_hsl(268_78%_56%/0.08)] transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/8 text-primary border border-primary/10">
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
                onClick={() => toast.info(`Configurações de ${item.name} em breve.`)}
              >
                <Settings className="h-3 w-3 mr-1.5" />
                Configurar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
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
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted/60 text-muted-foreground border border-border/30 group-hover:bg-primary/8 group-hover:text-primary group-hover:border-primary/10 transition-colors duration-300">
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

function HistoryView({ logs }: { logs: LogEntry[] }) {
  if (!logs.length) {
    return (
      <EmptyState
        icon={<Clock className="h-5 w-5 text-muted-foreground/40" />}
        title="Nenhum evento registrado"
        subtitle="Eventos de integração aparecerão aqui."
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
              <th className="text-left py-3 px-5 font-semibold text-muted-foreground/70 uppercase tracking-wider text-[10px]">Status</th>
              <th className="text-left py-3 px-5 font-semibold text-muted-foreground/70 uppercase tracking-wider text-[10px]">Data</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log.id} className={`${i < logs.length - 1 ? "border-b border-border/20" : ""} hover:bg-accent/30 transition-colors`}>
                <td className="py-3 px-5 font-medium text-foreground/85">{log.event}</td>
                <td className="py-3 px-5">
                  <Badge variant="secondary" className="text-[10px] font-semibold bg-muted/60 border-0 px-2 py-0 h-5">
                    {log.integration}
                  </Badge>
                </td>
                <td className="py-3 px-5 text-muted-foreground">{log.user}</td>
                <td className="py-3 px-5">
                  <LogStatusBadge status={log.status} />
                </td>
                <td className="py-3 px-5 text-muted-foreground/60 tabular-nums">{log.timestamp}</td>
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
        Ativo
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
