import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Layers, DollarSign, TrendingUp, X } from "lucide-react";

interface ProductIdeaCardProps {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  priceRange?: string | null;
  profitExample?: string | null;
  onGenerate?: () => void;
  onMockup?: () => void;
  onDelete?: () => void;
}

export const ProductIdeaCard = ({ name, description, imageUrl, priceRange, profitExample, onGenerate, onMockup, onDelete }: ProductIdeaCardProps) => (
  <Card className="group overflow-hidden border-border/60 hover:shadow-lg hover:border-secondary/20 transition-all duration-300 hover:-translate-y-1 relative">
    {onDelete && (
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border/40 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
    {imageUrl && (
      <div className="aspect-video bg-muted overflow-hidden relative">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    )}
    <CardContent className={`p-4 space-y-3 ${!imageUrl ? "pt-5" : ""}`}>
      <div>
        <h3 className="font-display font-semibold text-sm">{name}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {(priceRange || profitExample) && (
        <div className="space-y-1.5">
          {priceRange && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-medium text-foreground">{priceRange}</span>
            </div>
          )}
          {profitExample && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-xs text-muted-foreground">{profitExample}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {onMockup && (
          <Button onClick={onMockup} variant="outline" size="sm" className="w-full gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            <Layers className="h-3.5 w-3.5" /> Gerar mockup deste produto
          </Button>
        )}
        {onGenerate && (
          <Button onClick={onGenerate} variant="outline" size="sm" className="w-full gap-1.5 border-secondary/30 text-secondary hover:bg-secondary hover:text-secondary-foreground transition-colors">
            <Sparkles className="h-3.5 w-3.5" /> Gerar texto de venda
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);
