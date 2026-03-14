import { cn } from "@/lib/utils";

const HOOP_OPTIONS = [
  { label: "Todos", value: "all" },
  { label: "10×10", value: "10x10" },
  { label: "13×18", value: "13x18" },
  { label: "14×20", value: "14cm" },
  { label: "16×26", value: "16cm" },
  { label: "18cm+", value: "18cm" },
] as const;

interface QuickHoopFilterProps {
  value: string;
  onChange: (v: string) => void;
}

export const QuickHoopFilter = ({ value, onChange }: QuickHoopFilterProps) => {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Filtrar por bastidor:</span>
      <div className="flex flex-wrap gap-2">
        {HOOP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200",
              value === opt.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 text-muted-foreground border-border/40 hover:border-primary/40 hover:text-foreground hover:bg-muted/70"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
