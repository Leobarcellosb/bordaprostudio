import { FolderOpen, Sparkles } from "lucide-react";

interface CategoryFolderCardProps {
  name: string;
  previewImages: string[];
  totalCount: number;
  compatibleCount: number;
  machineFormat: string | null;
  onClick: () => void;
  isAll?: boolean;
}

const PREVIEW_SLOTS = [0, 1, 2, 3] as const;

/**
 * "Pasta de tema" para a biblioteca — mini grid 2×2 com as 4 primeiras capas
 * da categoria + nome + contagem. Card especial isAll para o item "Ver Tudo".
 *
 * Componente declarado em arquivo próprio (não inline) para evitar re-criação
 * a cada render do grid pai (regra: rerender-no-inline-components).
 */
export const CategoryFolderCard = ({
  name,
  previewImages,
  totalCount,
  compatibleCount,
  machineFormat,
  onClick,
  isAll = false,
}: CategoryFolderCardProps) => {
  const subtitle = machineFormat
    ? compatibleCount > 0
      ? `${compatibleCount} compatíveis com ${machineFormat}`
      : "Sem matrizes compatíveis"
    : `${totalCount} ${totalCount === 1 ? "matriz" : "matrizes"}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left overflow-hidden rounded-2xl border border-border/40 bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_rgba(124,58,237,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label={`Abrir tema ${name}`}
    >
      <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-accent/30">
        {previewImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-0.5 h-full">
            {PREVIEW_SLOTS.map((i) => (
              <div
                key={i}
                className="relative overflow-hidden bg-muted/40"
              >
                {previewImages[i] ? (
                  <img
                    src={previewImages[i]}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/20">
                    <Sparkles className="h-4 w-4 text-primary/20" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FolderOpen className="h-10 w-10 text-primary/30" />
          </div>
        )}

        {isAll && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-primary text-primary-foreground shadow-sm">
            Todos
          </div>
        )}
      </div>

      <div className="p-3.5">
        <h3 className="font-display font-semibold text-sm leading-tight tracking-tight text-foreground truncate">
          {name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
      </div>
    </button>
  );
};
