import { Home, Library, BookOpen, Settings, LogOut, Shield, Lightbulb, Calculator, TrendingUp, Heart, Download, Crown, Package, Eye, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import logoIcon from "@/assets/logo-icon.png";

const navItems: { icon: any; labelKey?: string; label?: string; path: string }[] = [
  { icon: Home, labelKey: "nav.dashboard", path: "/dashboard" },
  { icon: Library, labelKey: "nav.library", path: "/library" },
  { icon: Heart, labelKey: "nav.favorites", path: "/favorites" },
  { icon: Download, labelKey: "nav.downloads", path: "/downloads" },
  { icon: TrendingUp, labelKey: "nav.trends", path: "/trends" },
  { icon: Lightbulb, labelKey: "nav.productIdeas", path: "/product-ideas" },
  
  { icon: Eye, label: "Visualizar Matriz", path: "/embroidery-viewer" },
  { icon: Users, label: "Comunidade", path: "/comunidade" },
  { icon: Calculator, labelKey: "nav.profitCalculator", path: "/profit-calculator" },
  { icon: BookOpen, labelKey: "nav.catalogs", path: "/catalogs" },
  { icon: Package, label: "Kits Premium", path: "/kits" },
  { icon: Crown, labelKey: "nav.plans", path: "/pricing" },
];

const adminItems = [
  { icon: Shield, labelKey: "nav.adminPanel", path: "/admin" },
];

export const AppSidebar = () => {
  const { signOut, isAdmin, profile } = useAuth();
  const { favoriteIds } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <aside className="hidden md:flex flex-col w-[17rem] bg-sidebar text-sidebar-foreground h-screen sticky top-0 border-r border-sidebar-border overflow-y-auto">
      {/* Brand */}
      <div className="h-24 px-6 flex items-center gap-3 border-b border-sidebar-border shrink-0">
        <img src={logoIcon} alt="Borda Pro" className="h-12 w-12 rounded-lg shrink-0" />
        <div className="flex flex-col">
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">Borda Pro</span>
          <span className="text-[13px] text-sidebar-foreground/40 tracking-wide">Biblioteca de Matrizes</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/30 px-3 pb-2">{t("nav.menu")}</p>
        {navItems.map(({ icon: Icon, labelKey, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                  : "text-sidebar-foreground/55 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/85"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active && "text-sidebar-primary")} />
              <span className="flex-1 text-left">{labelKey ? t(labelKey) : label}</span>
              {path === "/favorites" && favoriteIds.size > 0 && (
                <span className="ml-auto text-[10px] font-semibold tabular-nums bg-sidebar-accent text-sidebar-foreground/60 px-1.5 py-0.5 rounded-md">
                  {favoriteIds.size}
                </span>
              )}
            </button>
          );
        })}

        {isAdmin && (
          <>
            <div className="h-px bg-sidebar-border/50 my-3 mx-3" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/30 px-3 pb-2">{t("nav.admin")}</p>
            {adminItems.map(({ icon: Icon, labelKey, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                  location.pathname.startsWith(path)
                    ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                    : "text-sidebar-foreground/55 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/85"
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
              <p className="text-[11px] text-sidebar-foreground/35 truncate">{profile?.email}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => navigate("/settings")}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] text-sidebar-foreground/45 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/70 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            {t("nav.settings")}
          </button>
          <button
            onClick={signOut}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] text-sidebar-foreground/45 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/70 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("nav.logout")}
          </button>
        </div>

        {/* Brand signature */}
        <p className="text-[10px] text-sidebar-foreground/20 text-center py-1 tracking-wide">
          {t("common.madeWith")}
        </p>
      </div>
    </aside>
  );
};
