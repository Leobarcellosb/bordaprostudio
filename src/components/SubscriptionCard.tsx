import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { isPaidActive } from "@/lib/subscription";

export const SubscriptionCard = () => {
  const { subscription } = useAuth();
  const navigate = useNavigate();

  const statusMap: Record<string, { label: string; icon: any; variant: "default" | "secondary" | "destructive" }> = {
    active: { label: "Ativa", icon: CheckCircle2, variant: "default" },
    pending: { label: "Pendente", icon: Clock, variant: "secondary" },
    inactive: { label: "Inativa", icon: AlertCircle, variant: "destructive" },
    pending_cancellation: { label: "Cancelamento agendado", icon: Clock, variant: "secondary" },
    pending_refund: { label: "Reembolso em processamento", icon: Clock, variant: "secondary" },
  };

  const info = statusMap[subscription?.status || ""] || statusMap.inactive;
  const StatusIcon = info.icon;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          Minha Assinatura
        </CardTitle>
        <CardDescription>Gerencie seu plano e acesso</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Plano:</span>
              <Badge variant="outline" className="capitalize font-semibold">{subscription.plan_code}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={info.variant} className="gap-1.5">
                <StatusIcon className="h-3.5 w-3.5" />
                {info.label}
              </Badge>
            </div>
            {subscription.access_expires_at && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Expira em:</span>
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(subscription.access_expires_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            )}
            {isPaidActive(subscription) &&
            subscription.status !== "pending_cancellation" &&
            subscription.status !== "pending_refund" ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto mt-2 text-muted-foreground"
                onClick={() => navigate("/cancelar-assinatura")}
              >
                Cancelar assinatura
              </Button>
            ) : subscription.status === "pending_cancellation" ? (
              <p className="text-xs text-muted-foreground mt-2">
                Cancelamento agendado — você usa até{" "}
                {subscription.access_expires_at
                  ? new Date(subscription.access_expires_at).toLocaleDateString("pt-BR")
                  : "o fim do período"}.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">Você ainda não possui uma assinatura ativa.</p>
            <Button onClick={() => navigate("/pricing")} className="gap-2">
              <Crown className="h-4 w-4" />
              Ver planos
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
