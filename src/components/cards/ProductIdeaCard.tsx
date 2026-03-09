import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface ProductIdeaCardProps {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  onGenerate?: () => void;
}

export const ProductIdeaCard = ({ name, description, imageUrl, onGenerate }: ProductIdeaCardProps) => (
  <Card className="overflow-hidden border-border/60 hover:shadow-md transition-all duration-300">
    {imageUrl && (
      <div className="aspect-video bg-muted overflow-hidden">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    )}
    <CardContent className="p-4 space-y-3">
      <div>
        <h3 className="font-display font-semibold">{name}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>}
      </div>
      <Button onClick={onGenerate} variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
        <Sparkles className="h-4 w-4" /> Gerar texto de venda
      </Button>
    </CardContent>
  </Card>
);
