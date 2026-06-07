import { Home, Library, BookOpen, Menu, X, Shield, LogOut, Calculator, TrendingUp, Heart, Download, Crown, Package, Users, Settings, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
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
      { icon: Calculator, labelKey: "nav.mobile.calculator", path: "/profit-calculator" },
    ],
  },
  {
    title: "Meu uso",
    items: [
      { icon: Heart, labelKey: "nav.favorites", path: "/favorites" },
      { icon: Download, labelKey: "nav.mobile.downloads", path: "/downloads" },
    ],
  },
  {
    title: "Comunidade",
    items: [
      { icon: Users, label: "Comunidade", path: "/comunidade" },
    ],
  },
  {
    title: "Conta",
    items: [
      { icon: Crown, labelKey: "nav.plans", path: "/pricing" },
      { icon: Settings, labelKey: "nav.settings", path: "/settings" },
    ],
  },
];

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-2.5">
          <img src="/symbol-indigo.png" alt="Borda Pro" className="h-8 w-auto" />
          <h1 className="text-sm font-display font-bold text-gradient-brand">Borda Pro</h1>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="md:hidden fixed inset-0 top-[61px] bg-background z-50 p-4 space-y-1 animate-fade-in overflow-y-auto">
          {sections.map((section, idx) => (
            <div key={idx}>
              {idx > 0 && <div className="h-px bg-border my-2" />}
              {section.title && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground px-4 pb-1 pt-2">
                  {section.title}
                </p>
              )}
              {section.items.map(({ icon: Icon, labelKey, label, path }) => (
                <button key={path} onClick={() => { navigate(path); setOpen(false); }}
                  className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    location.pathname === path ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                  )}>
                  <Icon className="h-4 w-4" />{labelKey ? t(labelKey) : label}
                </button>
              ))}
            </div>
          ))}
          {isAdmin && (
            <>
              <div className="h-px bg-border my-2" />
              <button onClick={() => { navigate("/admin"); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted">
                <Shield className="h-4 w-4" />{t("nav.adminPanel")}
              </button>
            </>
          )}
          <div className="h-px bg-border my-2" />
          <button onClick={() => { signOut(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted">
            <LogOut className="h-4 w-4" />{t("nav.logout")}
          </button>
        </div>
      )}
    </>
  );
};