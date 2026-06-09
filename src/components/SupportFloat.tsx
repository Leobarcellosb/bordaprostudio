import { useState, useRef, useEffect } from "react";
import { HelpCircle, Headphones, X, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { whatsappLink } from "@/config/contato";

const WA_MSG = "Oi! Tô usando a Borda Pro e preciso de ajuda 🙏";

interface SupportItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

// Array de itens — adicionar "Tutoriais", "FAQ" etc. aqui no futuro, sem refator.
const ITEMS: SupportItem[] = [
  {
    icon: Headphones,
    label: "Falar no WhatsApp",
    onClick: () => window.open(whatsappLink(WA_MSG), "_blank", "noopener,noreferrer"),
  },
];

/** Widget de suporte no padrão SaaS (botão "?" → menu vertical). Usado no app (AppLayout). */
export const SupportFloat = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus(); // devolve o foco ao botão (padrão de menu)
      }
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    // Foco no primeiro item ao abrir (menu acessível por teclado).
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="fixed z-[60] flex flex-col items-end gap-2"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        right: "calc(env(safe-area-inset-right, 0px) + 1rem)",
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            id="support-menu"
            role="menu"
            aria-label="Ajuda e suporte"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.16, ease: "easeOut" }}
            className="mb-1 min-w-[224px] origin-bottom-right rounded-2xl border border-border/60 bg-popover p-1.5 shadow-xl"
          >
            {ITEMS.map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                role="menuitem"
                onClick={() => {
                  onClick();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-popover-foreground transition-colors hover:bg-accent"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        ref={toggleRef}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fechar ajuda" : "Ajuda e suporte"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="support-menu"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-white shadow-lg shadow-black/25 transition-all hover:bg-zinc-700 hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default SupportFloat;
