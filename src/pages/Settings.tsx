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
import { validateImageUpload } from "@/lib/validateUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Globe, User, Cog, Loader2 } from "lucide-react";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { useTranslation } from "@/hooks/useTranslation";
import { MACHINE_FORMATS } from "@/hooks/useUserMachineSettings";

// Tamanhos visíveis no grid — "large" fica fora pra forçar migração suave
// dos users antigos que tinham essa opção genérica.
const HOOP_SIZES_UI = ["10x10", "13x18", "14cm", "16cm", "18cm", "20cm", "23cm"] as const;

const Settings = () => {
  const { profile, user, refresh } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  // Sobre você
  const [name, setName] = useState(profile?.name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [brandName, setBrandName] = useState(profile?.brand_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");

  // Minha máquina
  const [machineFormat, setMachineFormat] = useState<string | null>(
    profile?.machine_format ?? null,
  );
  const [machineHoopSize, setMachineHoopSize] = useState<string | null>(
    profile?.machine_hoop_size ?? null,
  );

  // Idioma
  const [language, setLanguage] = useState(
    () => localStorage.getItem("app_language") || "pt",
  );

  // UI state
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const hasChanges =
    name !== (profile?.name || "") ||
    lastName !== (profile?.last_name || "") ||
    phone !== (profile?.phone || "") ||
    brandName !== (profile?.brand_name || "") ||
    machineFormat !== (profile?.machine_format ?? null) ||
    machineHoopSize !== (profile?.machine_hoop_size ?? null);

  const initials =
    [name?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() || "U";

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    localStorage.setItem("app_language", val);
    window.dispatchEvent(new Event("language-changed"));
    toast.success(t("settings.languageSaved"));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validationError = validateImageUpload(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    // Extension from MIME (not filename) — safer
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const fileExt = extMap[file.type] ?? "bin";
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true, contentType: file.type });

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

    const { error: dbErr } = await db
      .from("profiles")
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (dbErr) {
      toast.error(dbErr.message);
    } else {
      toast.success(t("settings.photoUpdated"));
      await refresh(); // sidebar pega o avatar novo
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await db
      .from("profiles")
      .update({
        name: name || null,
        last_name: lastName || null,
        phone: phone || null,
        brand_name: brandName || null,
        machine_format: machineFormat,
        machine_hoop_size: machineHoopSize,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("settings.profileUpdated"));
      await refresh(); // propaga máquina + nome pra AuthContext (e sidebar)
    }
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl mx-auto pb-24 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atualize seu perfil, máquina e preferências da conta.
          </p>
        </div>

        {/* ─── Sobre você ──────────────────────────────────────────── */}
        <Card className="border-border/60 rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">Sobre você</CardTitle>
                <CardDescription>Seu nome, contato e marca</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-7">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Avatar className="h-24 w-24 border-2 border-border/60">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                  <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-background animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
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

            {/* Form */}
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("settings.firstName")}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Maria"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("settings.lastName")}</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Silva"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("settings.email")}</Label>
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  WhatsApp / Telefone{" "}
                  <span className="text-muted-foreground font-normal text-xs">
                    ({t("settings.optional")})
                  </span>
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandName">
                  Nome do ateliê / marca{" "}
                  <span className="text-muted-foreground font-normal text-xs">
                    ({t("settings.optional")})
                  </span>
                </Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Bordados da Maria"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Minha máquina ───────────────────────────────────────── */}
        <Card className="border-border/60 rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10">
                <Cog className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">Minha máquina</CardTitle>
                <CardDescription>
                  Filtra a biblioteca automaticamente pelos designs compatíveis.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Formato */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold">Formato</Label>
              <div className="grid grid-cols-4 gap-2">
                {MACHINE_FORMATS.map((fmt) => {
                  const selected = machineFormat === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setMachineFormat(fmt)}
                      className={`h-12 rounded-xl border text-sm font-bold transition-all duration-150 ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background border-border/60 hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      .{fmt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bastidor */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold">Tamanho do bastidor</Label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {HOOP_SIZES_UI.map((size) => {
                  const selected = machineHoopSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setMachineHoopSize(size)}
                      className={`h-12 rounded-xl border text-sm font-semibold transition-all duration-150 ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background border-border/60 hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {machineHoopSize === "large" && (
                <p className="text-xs text-amber-600">
                  Seu bastidor está registrado como "Grande" (legado). Selecione um tamanho específico acima para melhor filtragem.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Minha assinatura ────────────────────────────────────── */}
        <SubscriptionCard />

        {/* ─── Idioma ──────────────────────────────────────────────── */}
        <Card className="border-border/60 rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">
                  {t("settings.languageTitle")}
                </CardTitle>
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
      </div>

      {/* ─── Sticky save bar ─────────────────────────────────────────
          Fica fixa no rodapé enquanto rola a página. Só destaca quando
          tem mudança não salva. */}
      <div
        className={`sticky bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-md py-3 px-4 transition-all ${
          hasChanges ? "shadow-[0_-4px_16px_rgba(0,0,0,0.06)]" : "opacity-80"
        }`}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {hasChanges
              ? "Você tem alterações não salvas."
              : "Tudo salvo."}
          </p>
          <Button
            onClick={updateProfile}
            disabled={!hasChanges || saving}
            size="sm"
            className="gap-1.5 rounded-xl min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
