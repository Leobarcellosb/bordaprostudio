import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminKits } from "./AdminKits";
import { AdminCategories } from "./AdminCategories";
import { AdminUsers } from "./AdminUsers";
import { AdminDownloads } from "./AdminDownloads";
import { Shield } from "lucide-react";

const AdminPanel = () => {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10"><Shield className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gerencie designs, categorias e usuários</p>
          </div>
        </div>

        <Tabs defaultValue="kits">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="kits" className="font-medium">Designs</TabsTrigger>
            <TabsTrigger value="categories" className="font-medium">Categorias</TabsTrigger>
            <TabsTrigger value="users" className="font-medium">Usuários</TabsTrigger>
            <TabsTrigger value="downloads" className="font-medium">Downloads</TabsTrigger>
          </TabsList>
          <TabsContent value="kits"><AdminKits /></TabsContent>
          <TabsContent value="categories"><AdminCategories /></TabsContent>
          <TabsContent value="users"><AdminUsers /></TabsContent>
          <TabsContent value="downloads"><AdminDownloads /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AdminPanel;
