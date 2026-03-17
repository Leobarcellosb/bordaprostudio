import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, ArrowRight, ArrowLeft, Check, Lock } from "lucide-react";
import logoHorizontal from "@/assets/logo-horizontal.png";
import { MACHINE_FORMATS, MACHINE_HOOP_SIZES } from "@/hooks/useUserMachineSettings";

const STEPS = [
  {
    key: "machine_format",
    question: "Qual o formato da sua máquina de bordado?",
    multi: false,
    required: true,
    locked: true,
    options: [...MACHINE_FORMATS],
    hint: "Este formato será usado para filtrar os designs compatíveis. Não poderá ser alterado depois.",
  },
  {
    key: "machine_hoop_size",
    question: "Qual o tamanho do seu bastidor?",
    multi: false,
    required: true,
    locked: true,
    options: [...MACHINE_HOOP_SIZES],
    hint: "Você verá apenas designs compatíveis com este bastidor. Não poderá ser alterado depois.",
  },
  {
    key: "usage_goal",
    question: "Para que você usa bordado?",
    multi: false,
    required: false,
    locked: false,
    options: ["Hobby", "Renda extra", "Negócio principal", "Estou aprendendo"],
  },
  {
    key: "favorite_categories",
    question: "Quais tipos de bordado você mais gosta?",
    multi: true,
    required: false,
    locked: false,
    options: [
      "Bebê / Infantil", "Flores", "Animais", "Datas comemorativas",
      "Frases", "Patch aplique", "Profissões", "Religioso", "Cozinha", "Outros",
    ],
  },
  {
    key: "experience_level",
    question: "Qual seu nível no bordado?",
    multi: false,
    required: false,
    locked: false,
    options: ["Iniciante", "Intermediário", "Avançado", "Profissional"],
  },
  {
    key: "selling_activity",
    question: "Você vende produtos bordados?",
    multi: false,
    required: false,
    locked: false,
    options: ["Ainda não", "Sim, às vezes", "Sim, é minha principal renda"],
  },
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const selectedValue = answers[current.key];

  const handleSelect = (option: string) => {
    if (current.multi) {
      const prev = (selectedValue as string[]) || [];
      const updated = prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option];
      setAnswers({ ...answers, [current.key]: updated });
    } else {
      setAnswers({ ...answers, [current.key]: option });
    }
  };

  const isSelected = (option: string) => {
    if (current.multi) return ((selectedValue as string[]) || []).includes(option);
    return selectedValue === option;
  };

  const canProceed = current.multi
    ? ((selectedValue as string[]) || []).length > 0
    : !!selectedValue;

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleFinish();
  };

  const handleFinish = async () => {
    if (!user || saving) return;

    // Validate required machine settings
    if (!answers.machine_format || !answers.machine_hoop_size) {
      toast.error("Formato da máquina e tamanho do bastidor são obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      // Save machine settings to profiles (locked fields)
      await db.from("profiles").update({
        machine_format: answers.machine_format,
        machine_hoop_size: answers.machine_hoop_size,
      }).eq("id", user.id);

      // Save preferences
      const payload = {
        user_id: user.id,
        usage_goal: answers.usage_goal || null,
        favorite_categories: answers.favorite_categories || [],
        hoop_size: answers.machine_hoop_size || null,
        experience_level: answers.experience_level || null,
        selling_activity: answers.selling_activity || null,
        completed_at: new Date().toISOString(),
      };
      const { error } = await db
        .from("user_preferences")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      toast.success("Preferências salvas! Bem-vinda ao Borda Pro 🎉");
      // Force reload to update profile in AuthContext
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Onboarding save error:", err);
      toast.error("Erro ao salvar preferências. Tente novamente.");
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user || saving) return;

    // Can't skip if machine settings not set
    if (!answers.machine_format || !answers.machine_hoop_size) {
      toast.error("Formato da máquina e tamanho do bastidor são obrigatórios. Complete os 2 primeiros passos.");
      // Go to step 0 if not set
      if (!answers.machine_format) { setStep(0); return; }
      if (!answers.machine_hoop_size) { setStep(1); return; }
      return;
    }

    setSaving(true);
    try {
      // Save machine settings even on skip
      await db.from("profiles").update({
        machine_format: answers.machine_format,
        machine_hoop_size: answers.machine_hoop_size,
      }).eq("id", user.id);

      const { error } = await db
        .from("user_preferences")
        .upsert(
          { user_id: user.id, completed_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Onboarding skip error:", err);
      toast.error("Erro ao pular. Tente novamente.");
      setSaving(false);
    }
  };

  // Can only skip after machine settings are done (step >= 2)
  const canSkip = step >= 2 && !!answers.machine_format && !!answers.machine_hoop_size;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <div className="w-full max-w-lg space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <img src={logoHorizontal} alt="Borda Pro" className="w-[220px] h-auto" />
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              Configure sua máquina para ver apenas designs compatíveis.
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Passo {step + 1} de {STEPS.length}</span>
            <Badge variant="outline" className="text-xs">{Math.round(progress)}%</Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="border-border/40 shadow-xl shadow-primary/5">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-display font-bold text-center">
                {current.question}
              </h2>
              {(current as any).hint && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-amber-500">
                  <Lock className="h-3 w-3" />
                  <span>{(current as any).hint}</span>
                </div>
              )}
            </div>

            {current.multi && (
              <p className="text-xs text-center text-muted-foreground">
                Selecione quantas quiser
              </p>
            )}

            <div className={`grid gap-3 ${current.options.length > 5 ? "grid-cols-2" : "grid-cols-1"}`}>
              {current.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={`
                    relative rounded-xl border-2 px-4 py-3 text-sm font-medium text-left transition-all duration-200
                    ${isSelected(option)
                      ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                      : "border-border/60 bg-card hover:border-primary/40 hover:bg-accent/30 text-foreground"
                    }
                  `}
                >
                  <span className="flex items-center justify-between">
                    {option}
                    {isSelected(option) && <Check className="h-4 w-4 text-primary" />}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step > 0 ? setStep(step - 1) : undefined}
            disabled={saving || step === 0}
            className="gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed || saving}
            className="gap-1.5 shadow-md shadow-primary/20"
          >
            {saving ? "Salvando..." : step === STEPS.length - 1 ? (
              <>Concluir <Check className="h-3.5 w-3.5" /></>
            ) : (
              <>Próximo <ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </Button>
        </div>

        {/* Skip link - only after machine settings steps */}
        {canSkip && (
          <p className="text-center">
            <button
              onClick={handleSkip}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Pular e ir para o dashboard
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
