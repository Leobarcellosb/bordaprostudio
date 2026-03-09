import { Home, Library, Sparkles, BookOpen, ShoppingBag, Settings, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: Library, label: "Biblioteca", path: "/library" },
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
    <aside className="hidden md:flex flex-col w-64 bg-sidebar-background text-sidebar-foreground min-h-screen p-4">
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold text-sidebar-primary-foreground font-serif">
          ✂️ Borda Pro Studio
        </h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1">Sua plataforma de bordados</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              location.pathname === path
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}

        {isAdmin && (
          <>
            <div className="h-px bg-sidebar-border my-3" />
            {adminItems.map(({ icon: Icon, label, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  location.pathname.startsWith(path)
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border pt-4 mt-4 space-y-2">
        <div className="px-3 py-2">
          <p className="text-xs font-medium truncate">{profile?.full_name || "Usuário"}</p>
          <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.email}</p>
          <span className="inline-block mt-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sidebar-primary/20 text-sidebar-primary">
            {profile?.plan || "basic"}
          </span>
        </div>
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
        >
          <Settings className="h-4 w-4" />
          Configurações
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
};
