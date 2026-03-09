import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Download, Heart, BookOpen } from "lucide-react";
import { AddToCatalogModal } from "@/components/AddToCatalogModal";

interface DesignCardProps {
  id?: string;
  name: string;
  coverImage?: string | null;
  category?: string;
  tags?: string[];
  downloadCount?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClick?: () => void;
  onQuickDownload?: () => void;
}

export const DesignCard = ({ id, name, coverImage, category, tags = [], downloadCount, isFavorite, onToggleFavorite, onClick, onQuickDownload }: DesignCardProps) => {
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);

  return (
    <>
      <Card
        className="group overflow-hidden border-border/40 bg-card hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.15)] hover:border-primary/25 transition-all duration-500 ease-out hover:-translate-y-2 cursor-pointer rounded-xl"
        onClick={onClick}
      >
        {/* Image area — 4:5 aspect ratio for larger previews */}
        <div className="aspect-[4/5] bg-muted overflow-hidden relative">
          {coverImage ? (
            <img
              src={coverImage}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-accent to-muted gap-3 px-6">
              <div className="w-16 h-16 rounded-2xl bg-background/60 backdrop-blur-sm flex items-center justify-center shadow-sm">
                <span className="text-3xl opacity-40">🧵</span>
              </div>
              <span className="text-xs text-muted-foreground text-center font-medium">Preview não disponível</span>
            </div>
          )}

          {/* Hover overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Category badge */}
          {category && (
            <div className="absolute top-3 left-3 z-10">
              <Badge className="bg-background/85 backdrop-blur-md text-foreground border-0 text-[10px] font-semibold shadow-sm px-2.5 py-0.5">
                {category}
              </Badge>
            </div>
          )}

          {/* Favorite button */}
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border shadow-sm transition-all duration-300 z-10 ${
                isFavorite
                  ? "bg-destructive/90 border-destructive/50 text-destructive-foreground scale-100 opacity-100"
                  : "bg-background/85 border-transparent text-muted-foreground opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 hover:bg-destructive/90 hover:text-destructive-foreground"
              }`}
            >
              <Heart className={`h-3.5 w-3.5 transition-transform duration-200 ${isFavorite ? "fill-current scale-110" : "group-hover:scale-100"}`} />
            </button>
          )}

          {/* Quick download button */}
          {onQuickDownload && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickDownload(); }}
              className={`absolute top-3 ${onToggleFavorite ? "right-12" : "right-3"} p-2 rounded-full bg-background/85 backdrop-blur-md border-transparent shadow-sm opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary hover:text-primary-foreground z-10`}
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Add to catalog button */}
          {id && (
            <button
              onClick={(e) => { e.stopPropagation(); setCatalogModalOpen(true); }}
              className="absolute bottom-3 right-3 p-2 rounded-full bg-background/85 backdrop-blur-md border-transparent shadow-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-400 hover:bg-secondary hover:text-secondary-foreground z-10"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Bottom hover action bar */}
          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-400 z-10">
            <button
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary/90 backdrop-blur-md text-primary-foreground text-xs font-semibold shadow-lg hover:bg-primary transition-colors"
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            >
              <Eye className="h-3.5 w-3.5" /> Abrir design
            </button>
          </div>
        </div>

        {/* Card info */}
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-semibold text-[13px] leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">{name}</h3>
            {downloadCount != null && downloadCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70 shrink-0 mt-0.5 tabular-nums">
                <Download className="h-3 w-3" /> {downloadCount}
              </span>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-[10px] font-normal px-2 py-0 h-[18px] text-muted-foreground/80 border-border/40 bg-muted/40 rounded-full">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground/50 self-center">+{tags.length - 3}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {id && (
        <AddToCatalogModal
          open={catalogModalOpen}
          onOpenChange={setCatalogModalOpen}
          designId={id}
        />
      )}
    </>
  );
};
