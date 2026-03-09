import { Home, Library, Sparkles, BookOpen, ShoppingBag, Settings, LogOut, Shield, Lightbulb } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: Library, label: "Biblioteca", path: "/library" },
  { icon: Lightbulb, label: "Ideias de Produto", path: "/product-ideas" },
  { icon: Sparkles, label: "Gerador de Vendas", path: "/sales-generator" },
  { icon: BookOpen, label: "Catálogos", path: "/catalogs" },
];

const adminItems = [
  { icon: Shield, label: "Painel Admin", path: "/admin" },
];

export const AppSidebar = () => {
  const { signOut, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground min-h-screen border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center text-lg">✂️</div>
          <div>
            <h1 className="text-sm font-display font-bold text-sidebar-primary-foreground tracking-tight">
              Borda Pro Studio
            </h1>
            <p className="text-[11px] text-sidebar-foreground/50">Plataforma de bordados</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3 py-2">Menu</p>
        {navItems.map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
              location.pathname === path
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}

        {isAdmin && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-3 pt-4 pb-2">Admin</p>
            {adminItems.map(({ icon: Icon, label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                  location.pathname.startsWith(path)
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="px-3 py-2.5 rounded-lg bg-sidebar-accent/30">
          <p className="text-xs font-medium truncate text-sidebar-foreground/90">{profile?.full_name || "Usuário"}</p>
          <p className="text-[11px] text-sidebar-foreground/45 truncate">{profile?.email}</p>
          <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sidebar-primary/20 text-sidebar-primary font-semibold">
            {profile?.plan || "basic"}
          </span>
        </div>
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Configurações
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
};
