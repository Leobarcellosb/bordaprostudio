import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Library } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NewDesignsSection } from "@/components/home/NewDesignsSection";
import { PopularDesignsSection } from "@/components/home/PopularDesignsSection";
import { HoopDesignsSection } from "@/components/home/HoopDesignsSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { RecommendedSection } from "@/components/home/RecommendedSection";
import { KitsSection } from "@/components/home/KitsSection";

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="space-y-12 animate-fade-in">
        {/* Welcome */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-8 md:p-10">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
              Olá, {profile?.full_name || profile?.name || "Bordadeira"} 👋
            </h1>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed">
              Descubra novas matrizes de bordado e inspire-se para criar produtos incríveis.
            </p>
            <Button onClick={() => navigate("/library")} className="mt-5 gap-2">
              <Library className="h-4 w-4" />
              Explorar Biblioteca
            </Button>
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 opacity-15 blur-3xl bg-primary rounded-full -translate-y-1/2 translate-x-1/2" />
        </div>

        {/* Each section loads independently */}
        <NewDesignsSection />
        <PopularDesignsSection />
        <HoopDesignsSection />
        <KitsSection />
        <CategoriesSection />
        <RecommendedSection />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
