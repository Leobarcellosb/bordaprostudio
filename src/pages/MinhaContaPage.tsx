import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { User, Crown, KeyRound, ExternalLink, AlertTriangle, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { APP_URL } from "@/lib/env";
import { PLAN_DISPLAY } from "@/lib/pricing";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const MinhaContaPage = () => {
  const { user, profile, subscription } = useAuth();
  const navigate = useNavigate();
  const [canceling, setCanceling] = useState(false);

  const planLabels: Record<string, string> = Object.fromEntries(
    Object.entries(PLAN_DISPLAY).map(([k, v]) => [k, v.label]),
  );

  const planPrices: Record<string, string> = Object.fromEntries(
    Object.entries(PLAN_DISPLAY).map(([k, v]) => [k, v.price]),
  );

  const statusConfig: Record<string, { label: string; icon: any; variant: "default" | "secondary" | "destructive" }> = {
    active: { label: "Ativa", icon: CheckCircle2, variant: "default" },
    pending: { label: "Pendente", icon: Clock, variant: "secondary" },
    inactive: { label: "Inativa", icon: AlertCircle, variant: "destructive" },
    canceled: { label: "Cancelada", icon: AlertCircle, variant: "destructive" },
    refunded: { label: "Reembolsada", icon: AlertCircle, variant: "destructive" },
  };

  const status = statusConfig[subscription?.status || ""] || statusConfig.inactive;
  const StatusIcon = status.icon;
  const displayName = [profile?.name, profile?.last_name].filter(Boolean).join(" ") || "Usuário";

  const handleChangePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${APP_URL}/reset-password`,
    });
    if (error) {
      toast.error("Erro ao enviar email. Tente novamente.");
    } else {
      toast.success("Email enviado! Verifique sua caixa de entrada para redefinir a senha.");
    }
  };

  const handleCancelSubscription = async () => {
    setCanceling(true);
    // For now, show a message directing to Eduzz support
    toast.info("Para cancelar sua assinatura, entre em contato pelo portal da Eduzz ou envie um email para suporte.");
    setCanceling(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Minha Conta</h1>

        {/* 1. Informações da Conta */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Informações da conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{displayName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email || "—"}</p>
              </div>
            </div>
            <Separator />
            <Button variant="outline" className="gap-2" onClick={handleChangePassword}>
              <KeyRound className="h-4 w-4" />
              Alterar senha
            </Button>
          </CardContent>
        </Card>

        {/* 2. Minha Assinatura */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-primary" />
              Minha assinatura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Plano atual</p>
                    <p className="font-semibold">{planLabels[subscription.plan_code] || subscription.plan_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={status.variant} className="gap-1.5 mt-1">
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-medium">{planPrices[subscription.plan_code] || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Acesso até</p>
                    <p className="font-medium">
                      {subscription.access_expires_at
                        ? new Date(subscription.access_expires_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                  </div>
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open("https://orbita.eduzz.com/producer/subscription", "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Gerenciar assinatura na Eduzz
                </Button>
              </>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-muted-foreground">Você ainda não possui uma assinatura ativa.</p>
                <Button onClick={() => navigate("/pricing")} className="gap-2">
                  <Crown className="h-4 w-4" />
                  Ver planos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Cancelar Assinatura */}
        {subscription && subscription.status === "active" && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-lg text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Cancelar assinatura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ao cancelar, você perderá o acesso aos bordados e recursos premium ao final do período atual.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" disabled={canceling}>
                    Cancelar minha assinatura
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Seu acesso continuará até {subscription.access_expires_at
                        ? new Date(subscription.access_expires_at).toLocaleDateString("pt-BR")
                        : "o final do período"}. Após isso, você não poderá mais baixar bordados ou acessar recursos premium.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Confirmar cancelamento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default MinhaContaPage;
