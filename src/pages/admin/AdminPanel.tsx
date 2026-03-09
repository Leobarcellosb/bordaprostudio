import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminKits } from "./AdminKits";
import { AdminCategories } from "./AdminCategories";
import { AdminUsers } from "./AdminUsers";
import { AdminDownloads } from "./AdminDownloads";

const AdminPanel = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-1">Gerencie designs, categorias e usuários</p>
        </div>

        <Tabs defaultValue="kits">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="kits">Designs</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="downloads">Downloads</TabsTrigger>
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
