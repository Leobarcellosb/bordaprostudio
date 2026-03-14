import { LucideIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionHeaderProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
}

export const SectionHeader = ({ icon: Icon, iconClassName = "bg-primary/10 text-primary", title, subtitle, onViewAll }: SectionHeaderProps) => {
  const [bgClass, textClass] = iconClassName.split(" ");

  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${bgClass}`}>
          <Icon className={`h-5 w-5 ${textClass}`} />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {onViewAll && (
        <Button variant="ghost" size="sm" onClick={onViewAll} className="gap-1.5 text-primary">
          Ver tudo <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};
