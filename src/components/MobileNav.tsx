import { Home, Library, Sparkles, BookOpen, Menu, X, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: Library, label: "Biblioteca", path: "/library" },
  { icon: Sparkles, label: "Vendas", path: "/sales-generator" },
  { icon: BookOpen, label: "Catálogos", path: "/catalogs" },
];

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <header className="md:hidden flex items-center justify-between p-4 bg-card border-b">
        <h1 className="text-lg font-bold font-serif text-primary">✂️ Borda Pro</h1>
        <button onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </header>
      {open && (
        <div className="md:hidden fixed inset-0 top-14 bg-background z-50 p-4 space-y-2">
          {navItems.map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => { navigate(path); setOpen(false); }}
              className={cn("w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm",
                location.pathname === path ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
          {isAdmin && (
            <button onClick={() => { navigate("/admin"); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />Painel Admin
            </button>
          )}
          <button onClick={() => { signOut(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-muted-foreground">
            <LogOut className="h-4 w-4" />Sair
          </button>
        </div>
      )}
    </>
  );
};
