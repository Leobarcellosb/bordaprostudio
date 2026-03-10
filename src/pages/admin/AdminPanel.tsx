import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDashboard } from "./AdminDashboard";
import { AdminDesigns } from "./AdminDesigns";
import { AdminCategories } from "./AdminCategories";
import { AdminUsers } from "./AdminUsers";
import { AdminDownloads } from "./AdminDownloads";
import { AdminSmartUpload } from "./AdminSmartUpload";
import { AdminSubscriptions } from "./AdminSubscriptions";
import { Shield } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const AdminPanel = () => {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10"><Shield className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">{t("admin.title")}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{t("admin.subtitle")}</p>
          </div>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard" className="font-medium">{t("admin.overview")}</TabsTrigger>
            <TabsTrigger value="designs" className="font-medium">{t("admin.designs")}</TabsTrigger>
            <TabsTrigger value="import" className="font-medium">{t("admin.import")}</TabsTrigger>
            <TabsTrigger value="categories" className="font-medium">{t("admin.categories")}</TabsTrigger>
            <TabsTrigger value="users" className="font-medium">{t("admin.users")}</TabsTrigger>
            <TabsTrigger value="downloads" className="font-medium">{t("admin.downloads")}</TabsTrigger>
            <TabsTrigger value="subscriptions" className="font-medium">{t("admin.subscriptions")}</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
          <TabsContent value="designs"><AdminDesigns /></TabsContent>
          <TabsContent value="import"><AdminSmartUpload /></TabsContent>
          <TabsContent value="categories"><AdminCategories /></TabsContent>
          <TabsContent value="users"><AdminUsers /></TabsContent>
          <TabsContent value="downloads"><AdminDownloads /></TabsContent>
          <TabsContent value="subscriptions"><AdminSubscriptions /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AdminPanel;
