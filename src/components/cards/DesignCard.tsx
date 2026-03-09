import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface DesignCardProps {
  name: string;
  coverImage?: string | null;
  category?: string;
  tags?: string[];
  onClick?: () => void;
}

export const DesignCard = ({ name, coverImage, category, tags = [], onClick }: DesignCardProps) => (
  <Card className="group overflow-hidden border-border/60 hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={onClick}>
    <div className="aspect-square bg-muted overflow-hidden relative">
      {coverImage ? (
        <img src={coverImage} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-accent">
          <span className="text-5xl">🧵</span>
        </div>
      )}
      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-300" />
      <Button size="sm" className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg" onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
        <Eye className="h-4 w-4 mr-1" /> Abrir
      </Button>
    </div>
    <CardContent className="p-4 space-y-2">
      <h3 className="font-display font-semibold text-sm truncate">{name}</h3>
      <div className="flex flex-wrap gap-1.5">
        {category && <Badge variant="secondary" className="text-[10px] font-medium">{category}</Badge>}
        {tags.slice(0, 2).map(tag => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
      </div>
    </CardContent>
  </Card>
);
