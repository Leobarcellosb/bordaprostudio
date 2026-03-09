import { Home, Library, Sparkles, BookOpen, Menu, X, Shield, LogOut, Lightbulb, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: Library, label: "Biblioteca", path: "/library" },
  { icon: Lightbulb, label: "Ideias", path: "/product-ideas" },
  { icon: Sparkles, label: "Vendas", path: "/sales-generator" },
  { icon: Layers, label: "Mockups", path: "/mockup-simulator" },
  { icon: BookOpen, label: "Catálogos", path: "/catalogs" },
];

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">✂️</span>
          <h1 className="text-sm font-display font-bold text-primary">Borda Pro Studio</h1>
        </div>
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-background z-50 p-4 space-y-1 animate-fade-in">
          {navItems.map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => { navigate(path); setOpen(false); }}
              className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                location.pathname === path ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
              )}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
          {isAdmin && (
            <button onClick={() => { navigate("/admin"); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted">
              <Shield className="h-4 w-4" />Painel Admin
            </button>
          )}
          <div className="h-px bg-border my-2" />
          <button onClick={() => { signOut(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted">
            <LogOut className="h-4 w-4" />Sair
          </button>
        </div>
      )}
    </>
  );
};
