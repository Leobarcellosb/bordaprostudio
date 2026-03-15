import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { X, Camera } from "lucide-react";

export const CommunityPromptBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [designName, setDesignName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const dismissedAt = localStorage.getItem(`community_prompt_dismissed_${user.id}`);
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - Number(dismissedAt)) / 86400000;
      if (daysSinceDismiss < 7) return;
    }

    const check = async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

      const { data: downloads } = await db
        .from("downloads")
        .select("kit_id, created_at")
        .eq("user_id", user.id)
        .lt("created_at", threeDaysAgo)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!downloads || downloads.length === 0) return;

      // Check if user has posted anything to community
      const { count } = await db
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Show banner if user has downloads 3+ days old but few/no community posts
      if ((count || 0) < downloads.length) {
        const { data: design } = await db
          .from("designs")
          .select("name, generated_title")
          .eq("id", downloads[0].kit_id)
          .single();

        setDesignName(design?.generated_title || design?.name || null);
        setVisible(true);
      }
    };

    check();
  }, [user]);

  const dismiss = () => {
    setVisible(false);
    if (user) {
      localStorage.setItem(`community_prompt_dismissed_${user.id}`, String(Date.now()));
    }
  };

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 p-6 md:p-8">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            Você já bordou essa matriz? ❤️
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {designName
              ? `Mostre como ficou seu bordado com "${designName}"!`
              : "Mostre como ficou seu bordado para a comunidade!"}
          </p>
        </div>
        <Button
          onClick={() => {
            dismiss();
            navigate("/comunidade");
          }}
          className="gap-2 shrink-0"
        >
          <Camera className="h-4 w-4" />
          Postar foto
        </Button>
      </div>
    </div>
  );
};
