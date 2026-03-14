import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, MessageCircle, Check } from "lucide-react";
import { toast } from "sonner";

interface DesignItem {
  id: string;
  name: string;
  hoop_size?: string | null;
}

interface WhatsAppListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designs: DesignItem[];
}

export const WhatsAppListModal = ({ open, onOpenChange, designs }: WhatsAppListModalProps) => {
  const [copied, setCopied] = useState<"text" | "whatsapp" | null>(null);

  const listText = useMemo(() => {
    if (designs.length === 0) return "";

    const lines: string[] = ["✨ Bordados disponíveis\n"];

    designs.forEach((d, i) => {
      const num = String(i + 1).padStart(2, "0");
      lines.push(`${num} ${d.name}`);
    });

    // Check if all designs share the same hoop size
    const hoopSizes = designs.map(d => d.hoop_size).filter(Boolean);
    const uniqueHoops = [...new Set(hoopSizes)];
    if (uniqueHoops.length === 1 && uniqueHoops[0]) {
      lines.push(`\nBastidor: ${uniqueHoops[0]}`);
    }

    return lines.join("\n");
  }, [designs]);

  const handleCopy = async (type: "text" | "whatsapp") => {
    try {
      await navigator.clipboard.writeText(listText);
      setCopied(type);
      toast.success("Lista copiada!");
      setTimeout(() => setCopied(null), 2000);

      if (type === "whatsapp") {
        const encoded = encodeURIComponent(listText);
        window.open(`https://wa.me/?text=${encoded}`, "_blank");
      }
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Lista para Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 border border-border/40 max-h-72 overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
              {listText}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleCopy("whatsapp")}
              className="flex-1 gap-2"
            >
              {copied === "whatsapp" ? <Check className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
              {copied === "whatsapp" ? "Copiado!" : "Copiar para WhatsApp"}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCopy("text")}
              className="flex-1 gap-2"
            >
              {copied === "text" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "text" ? "Copiado!" : "Copiar texto"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {designs.length} {designs.length === 1 ? "matriz selecionada" : "matrizes selecionadas"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
