import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Download } from "lucide-react";

interface DesignCardProps {
  name: string;
  coverImage?: string | null;
  category?: string;
  tags?: string[];
  downloadCount?: number;
  onClick?: () => void;
  onQuickDownload?: () => void;
}

export const DesignCard = ({ name, coverImage, category, tags = [], downloadCount, onClick, onQuickDownload }: DesignCardProps) => (
  <Card className="group overflow-hidden border-border/60 hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1.5 cursor-pointer" onClick={onClick}>
    <div className="aspect-square bg-muted overflow-hidden relative">
      {coverImage ? (
        <img src={coverImage} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-accent">
          <span className="text-5xl">🧵</span>
        </div>
      )}
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/0 to-foreground/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Quick download button - top right */}
      {onQuickDownload && (
        <button
          onClick={(e) => { e.stopPropagation(); onQuickDownload(); }}
          className="absolute top-2.5 right-2.5 p-2 rounded-full bg-background/90 backdrop-blur-sm border border-border/40 shadow-md opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Open button - bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
        <Button
          size="sm"
          className="w-full gap-1.5 shadow-lg backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        >
          <Eye className="h-3.5 w-3.5" /> Abrir design
        </Button>
      </div>

      {/* Category chip overlay */}
      {category && (
        <div className="absolute top-2.5 left-2.5">
          <Badge className="bg-background/90 backdrop-blur-sm text-foreground border-border/40 text-[10px] font-semibold shadow-sm">
            {category}
          </Badge>
        </div>
      )}
    </div>
    <CardContent className="p-3.5 space-y-2">
      <h3 className="font-display font-semibold text-sm leading-tight line-clamp-2">{name}</h3>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-[10px] font-normal px-1.5 py-0 h-5 text-muted-foreground border-border/50">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground/60 self-center">+{tags.length - 3}</span>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);
