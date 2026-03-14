import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, DollarSign, TrendingUp, X } from "lucide-react";

interface ProductIdeaCardProps {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  priceRange?: string | null;
  profitExample?: string | null;
  onGenerate?: () => void;
  
  onDelete?: () => void;
}

export const ProductIdeaCard = ({ name, description, imageUrl, priceRange, profitExample, onGenerate, onDelete }: ProductIdeaCardProps) => (
  <Card className="group overflow-hidden border-border/40 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 relative">
    {onDelete && (
      <button
        onClick={onDelete}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-card/90 backdrop-blur-sm border border-border/40 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
    {imageUrl && (
      <div className="aspect-video bg-muted overflow-hidden relative">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    )}
    <CardContent className={`p-5 space-y-4 ${!imageUrl ? "pt-6" : ""}`}>
      <div>
        <h3 className="font-display font-semibold text-[15px] leading-snug">{name}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {(priceRange || profitExample) && (
        <div className="flex flex-wrap gap-3">
          {priceRange && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
              <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-semibold text-primary">{priceRange}</span>
            </div>
          )}
          {profitExample && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-medium text-emerald-700">{profitExample}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        {onGenerate && (
          <Button onClick={onGenerate} variant="outline" size="sm" className="w-full gap-1.5 border-secondary/20 text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all">
            <Sparkles className="h-3.5 w-3.5" /> Gerar texto de venda
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);
