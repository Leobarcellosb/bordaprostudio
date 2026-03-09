import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layers, ArrowRight } from "lucide-react";

interface KitCardProps {
  name: string;
  coverImage?: string | null;
  designCount?: number;
  onClick?: () => void;
}

export const KitCard = ({ name, coverImage, designCount = 0, onClick }: KitCardProps) => (
  <Card className="group overflow-hidden border-border/60 hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={onClick}>
    <div className="aspect-video bg-muted overflow-hidden relative">
      {coverImage ? (
        <img src={coverImage} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-accent">
          <span className="text-4xl">📦</span>
        </div>
      )}
    </div>
    <CardContent className="p-4">
      <h3 className="font-display font-semibold truncate">{name}</h3>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> {designCount} design{designCount !== 1 ? 's' : ''}
        </span>
        <Button variant="ghost" size="sm" className="text-primary gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          Abrir <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </CardContent>
  </Card>
);
