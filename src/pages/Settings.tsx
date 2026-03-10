import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Globe } from "lucide-react";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { useTranslation } from "@/hooks/useTranslation";

const Settings = () => {
  const { profile, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const [name, setName] = useState(profile?.name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [brandName, setBrandName] = useState(profile?.brand_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem("app_language") || "pt");

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    localStorage.setItem("app_language", val);
    window.dispatchEvent(new Event("language-changed"));
    toast.success(t("settings.languageSaved"));
  };

  const initials = [name?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() || "U";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(t("settings.uploadError"));
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const url = `${publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);

    await db.from("profiles").update({ avatar_url: url, updated_at: new Date().toISOString() }).eq("id", user.id);
    toast.success(t("settings.photoUpdated"));
    setUploading(false);
  };

  const updateProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await db.from("profiles").update({
      name,
      last_name: lastName,
      phone,
      brand_name: brandName,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success(t("settings.profileUpdated"));
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="space-y-8 max-w-2xl mx-auto animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-display font-bold">{t("settings.title")}</h1>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display">{t("settings.profile")}</CardTitle>
            <CardDescription>{t("settings.updateInfo")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-24 w-24 border-2 border-border">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={name} />
                  ) : null}
                  <AvatarFallback className="text-2xl font-semibold bg-muted text-muted-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
                  <Camera className="h-6 w-6 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? t("settings.uploading") : t("settings.changePhoto")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("settings.firstName")}</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("settings.lastName")}</Label>
                  <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("settings.email")}</Label>
                <Input id="email" value={profile?.email || ""} disabled className="bg-muted/50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("settings.phone")} <span className="text-muted-foreground font-normal">{t("settings.optional")}</span></Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandName">{t("settings.brandName")}</Label>
                <Input id="brandName" value={brandName} onChange={e => setBrandName(e.target.value)} />
              </div>
            </div>

            <Button onClick={updateProfile} disabled={saving} className="w-full sm:w-auto">
              {saving ? t("settings.saving") : t("settings.saveChanges")}
            </Button>
          </CardContent>
        </Card>

        {/* Language Section */}
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="font-display">{t("settings.languageTitle")}</CardTitle>
                <CardDescription>{t("settings.languageDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="language">{t("settings.language")}</Label>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português 🇧🇷</SelectItem>
                  <SelectItem value="en">English 🇺🇸</SelectItem>
                  <SelectItem value="es">Español 🇪🇸</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <SubscriptionCard />
      </div>
    </AppLayout>
  );
};

export default Settings;
