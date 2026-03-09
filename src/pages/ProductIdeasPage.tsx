import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ProductIdeaCard } from "@/components/cards/ProductIdeaCard";
import { useNavigate } from "react-router-dom";
import { Lightbulb } from "lucide-react";

const ProductIdeasPage = () => {
  const [ideas, setIdeas] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    db.from("product_ideas").select("*, kits(id, name)").order("created_at", { ascending: false }).then(({ data }: any) => setIdeas(data || []));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Ideias de Produto</h1>
          <p className="text-muted-foreground mt-1">Descubra o que vender com seus bordados</p>
        </div>

        {ideas.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma ideia de produto disponível.</p>
              <p className="text-sm mt-1">As ideias aparecem junto com os designs na biblioteca.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea: any) => (
              <ProductIdeaCard
                key={idea.id}
                name={idea.product_name}
                description={idea.description}
                suggestedPrice={idea.suggested_price}
                onGenerate={() => navigate(`/sales-generator?kit=${idea.kit_id}&product=${idea.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProductIdeasPage;
