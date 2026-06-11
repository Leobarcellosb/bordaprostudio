import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDashboard } from "./AdminDashboard";
import { AdminDesigns } from "./AdminDesigns";
import { AdminFolders } from "./AdminFolders";
import { AdminUsers } from "./AdminUsers";
import { AdminDownloads } from "./AdminDownloads";
import { AdminSmartUpload } from "./AdminSmartUpload";
import { AdminSubscriptions } from "./AdminSubscriptions";
import { AdminAnalytics } from "./AdminAnalytics";
import { AdminIntegrations } from "./AdminIntegrations";
import { AdminPremiumKits } from "./AdminPremiumKits";
import { AdminGrantAccess } from "./AdminGrantAccess";
import { AdminQuiz } from "./AdminQuiz";
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
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex w-auto min-w-full lg:grid lg:grid-cols-12">
              <TabsTrigger value="dashboard" className="font-medium text-xs">{t("admin.overview")}</TabsTrigger>
              <TabsTrigger value="analytics" className="font-medium text-xs">Analytics</TabsTrigger>
              <TabsTrigger value="designs" className="font-medium text-xs">{t("admin.designs")}</TabsTrigger>
              <TabsTrigger value="import" className="font-medium text-xs">{t("admin.import")}</TabsTrigger>
              <TabsTrigger value="folders" className="font-medium text-xs">Pastas</TabsTrigger>
              <TabsTrigger value="users" className="font-medium text-xs">{t("admin.users")}</TabsTrigger>
              <TabsTrigger value="downloads" className="font-medium text-xs">{t("admin.downloads")}</TabsTrigger>
              <TabsTrigger value="subscriptions" className="font-medium text-xs">{t("admin.subscriptions")}</TabsTrigger>
              <TabsTrigger value="grant" className="font-medium text-xs">Liberar acesso</TabsTrigger>
              <TabsTrigger value="integrations" className="font-medium text-xs">Integrações</TabsTrigger>
              <TabsTrigger value="kits" className="font-medium text-xs">Kits Premium</TabsTrigger>
              <TabsTrigger value="quiz" className="font-medium text-xs">Feedback</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
          <TabsContent value="analytics"><AdminAnalytics /></TabsContent>
          <TabsContent value="designs"><AdminDesigns /></TabsContent>
          <TabsContent value="import"><AdminSmartUpload /></TabsContent>
          <TabsContent value="folders"><AdminFolders /></TabsContent>
          <TabsContent value="users"><AdminUsers /></TabsContent>
          <TabsContent value="downloads"><AdminDownloads /></TabsContent>
          <TabsContent value="subscriptions"><AdminSubscriptions /></TabsContent>
          <TabsContent value="grant"><AdminGrantAccess /></TabsContent>
          <TabsContent value="integrations"><AdminIntegrations /></TabsContent>
          <TabsContent value="kits"><AdminPremiumKits /></TabsContent>
          <TabsContent value="quiz"><AdminQuiz /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AdminPanel;
