import { Card, CardContent } from "@/components/ui/card";

interface CatalogProductCardProps {
  name: string;
  image?: string | null;
  suggestedPrice?: number | null;
}

export const CatalogProductCard = ({ name, image, suggestedPrice }: CatalogProductCardProps) => (
  <Card className="overflow-hidden border-border/60 hover:shadow-md transition-all duration-200">
    <div className="aspect-square bg-muted overflow-hidden">
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-accent">
          <span className="text-3xl">🎁</span>
        </div>
      )}
    </div>
    <CardContent className="p-3 text-center space-y-1">
      <h4 className="font-display font-semibold text-sm truncate">{name}</h4>
      {suggestedPrice != null && (
        <p className="text-primary font-bold text-sm">R$ {Number(suggestedPrice).toFixed(2)}</p>
      )}
    </CardContent>
  </Card>
);
