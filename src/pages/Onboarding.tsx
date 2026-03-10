import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, ArrowRight, ArrowLeft, Check } from "lucide-react";
import logoHorizontal from "@/assets/logo-horizontal.png";

const STEPS = [
  {
    key: "usage_goal",
    question: "Para que você usa bordado?",
    multi: false,
    options: ["Hobby", "Renda extra", "Negócio principal", "Estou aprendendo"],
  },
  {
    key: "favorite_categories",
    question: "Quais tipos de bordado você mais gosta?",
    multi: true,
    options: [
      "Bebê / Infantil", "Flores", "Animais", "Datas comemorativas",
      "Frases", "Patch aplique", "Profissões", "Religioso", "Cozinha", "Outros",
    ],
  },
  {
    key: "hoop_size",
    question: "Qual bastidor você mais usa?",
    multi: false,
    options: ["10x10", "13x18", "16x26", "20x20", "Vários tamanhos"],
  },
  {
    key: "experience_level",
    question: "Qual seu nível no bordado?",
    multi: false,
    options: ["Iniciante", "Intermediário", "Avançado", "Profissional"],
  },
  {
    key: "selling_activity",
    question: "Você vende produtos bordados?",
    multi: false,
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
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await db.from("user_preferences").insert({
        user_id: user.id,
        usage_goal: answers.usage_goal || null,
        favorite_categories: answers.favorite_categories || [],
        hoop_size: answers.hoop_size || null,
        experience_level: answers.experience_level || null,
        selling_activity: answers.selling_activity || null,
      });
      if (error) throw error;
      toast.success("Preferências salvas! Bem-vinda ao Borda Pro 🎉");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar preferências. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await db.from("user_preferences").insert({ user_id: user.id });
    } catch {}
    navigate("/dashboard", { replace: true });
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <div className="w-full max-w-lg space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <img src={logoHorizontal} alt="Borda Pro" className="w-[160px] h-auto" />
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              Descubra seleções especiais para criar, vender e se inspirar hoje.
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
            <h2 className="text-xl font-display font-bold text-center">
              {current.question}
            </h2>

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
            onClick={() => step > 0 ? setStep(step - 1) : handleSkip()}
            disabled={saving}
            className="gap-1.5"
          >
            {step > 0 ? (
              <>
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </>
            ) : (
              "Pular"
            )}
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

        {/* Skip link */}
        {step > 0 && (
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
