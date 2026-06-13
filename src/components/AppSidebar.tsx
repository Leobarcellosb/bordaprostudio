import { Home, Library, BookOpen, Settings, LogOut, Shield, Calculator, TrendingUp, Heart, Download, Crown, Package, Users, Eye, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoritesQuery } from "@/hooks/queries/useFavoritesQuery";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AFFILIATE_ENABLED } from "@/config/affiliate";
import { useTranslation } from "@/hooks/useTranslation";

const sections = [
  {
    items: [
      { icon: Home, labelKey: "nav.dashboard", path: "/dashboard" },
    ],
  },
  {
    title: "Biblioteca",
    items: [
      { icon: Library, labelKey: "nav.library", path: "/library" },
      { icon: TrendingUp, labelKey: "nav.trends", path: "/trends" },
      { icon: Package, label: "Kits Premium", path: "/kits" },
      { icon: BookOpen, labelKey: "nav.catalogs", path: "/catalogs" },
    ],
  },
  {
    title: "Ferramentas",
    items: [
      { icon: Eye, label: "Visualizar Matriz", path: "/embroidery-viewer" },
      { icon: Calculator, labelKey: "nav.profitCalculator", path: "/profit-calculator" },
    ],
  },
  {
    title: "Meu uso",
    items: [
      { icon: Heart, labelKey: "nav.favorites", path: "/favorites" },
      { icon: Download, labelKey: "nav.downloads", path: "/downloads" },
      { icon: Gift, label: "Indique e ganhe", path: "/ganhe-dinheiro" },
    ],
  },
  {
    title: "Comunidade",
    items: [
      { icon: Users, label: "Comunidade", path: "/comunidade" },
    ],
  },
];

const adminItems = [
  { icon: Shield, labelKey: "nav.adminPanel", path: "/admin" },
];

export const AppSidebar = () => {
  const { signOut, isAdmin, profile } = useAuth();
  const { favoriteIds } = useFavoritesQuery();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Kill-switch do programa de afiliados (false = some o item pra todos).
  const itemVisible = (path: string) =>
    path !== "/ganhe-dinheiro" || AFFILIATE_ENABLED;

  const renderItem = ({ icon: Icon, labelKey, label, path }: any) => {
    if (!itemVisible(path)) return null;
    const active = location.pathname === path;
    return (
      <button
        key={path}
        onClick={() => navigate(path)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
          active
            ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
            : "text-sidebar-foreground/85 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
        )}
      >
        <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active && "text-sidebar-primary")} />
        <span className="flex-1 text-left">{labelKey ? t(labelKey) : label}</span>
        {path === "/favorites" && favoriteIds.size > 0 && (
          <span className="ml-auto text-[10px] font-semibold tabular-nums bg-sidebar-accent text-sidebar-foreground/90 px-1.5 py-0.5 rounded-md">
            {favoriteIds.size}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-[17rem] bg-sidebar text-sidebar-foreground h-screen sticky top-0 border-r border-sidebar-border overflow-y-auto">
      {/* Brand */}
      <div className="h-24 px-6 flex items-center gap-3 border-b border-sidebar-border shrink-0">
        <img src="/symbol-offwhite.png" alt="Borda Pro" className="h-12 w-auto shrink-0" />
        <div className="flex flex-col">
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">Borda Pro</span>
          <span className="text-[13px] text-sidebar-foreground/70 tracking-wide">Biblioteca de Matrizes</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {sections.map((section, idx) => (
          <div key={idx}>
            {idx > 0 && <div className="h-px bg-sidebar-border/40 my-3 mx-2" />}
            {section.title && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/70 px-3 pb-2 pt-1">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(renderItem)}
            </div>
          </div>
        ))}

        {isAdmin && (
          <>
            <div className="h-px bg-sidebar-border/50 my-3 mx-2" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/70 px-3 pb-2">{t("nav.admin")}</p>
            {adminItems.map(({ icon: Icon, labelKey, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                  location.pathname.startsWith(path)
                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {t(labelKey)}
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 pt-3 pb-2 space-y-2">
        {/* Conta section */}
        <div className="space-y-0.5">
          <button
            onClick={() => navigate("/pricing")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
              location.pathname === "/pricing"
                ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
            )}
          >
            <Crown className={cn("h-[18px] w-[18px] shrink-0", location.pathname === "/pricing" && "text-sidebar-primary")} />
            <span className="flex-1 text-left">{t("nav.plans")}</span>
          </button>
        </div>

        {/* User card */}
        <div className="px-3 py-3 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/50">
          <div className="flex items-center gap-2.5">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sidebar-primary/80 to-secondary/60 flex items-center justify-center text-[11px] font-bold text-sidebar-primary-foreground shrink-0">
                {(profile?.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-sidebar-foreground/90">{profile?.name || t("common.user")}</p>
              <p className="text-[11px] text-sidebar-foreground/70 truncate">{profile?.email}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => navigate("/settings")}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            {t("nav.settings")}
          </button>
          <button
            onClick={signOut}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("nav.logout")}
          </button>
        </div>

        <p className="text-[11px] text-sidebar-foreground/65 text-center py-1 tracking-wide">
          {t("common.madeWith")}
        </p>
      </div>
    </aside>
  );
};