import { Info, CheckCircle2 } from "lucide-react";

interface CompatibilityBannerProps {
  machineFormat: string | null;
  machineHoopSize: string | null;
  hasIncompatible: boolean;
  compatibleCount: number;
  totalShown: number;
}

export const CompatibilityBanner = ({
  machineFormat,
  machineHoopSize,
  hasIncompatible,
  compatibleCount,
  totalShown,
}: CompatibilityBannerProps) => {
  if (!machineFormat && !machineHoopSize) return null;

  if (!hasIncompatible) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <span>
          Mostrando matrizes compatíveis com sua máquina
          {machineFormat && <span className="font-medium"> ({machineFormat})</span>}
          {machineHoopSize && <span className="font-medium"> • {machineHoopSize}</span>}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
      <Info className="h-4 w-4 flex-shrink-0" />
      <span>
        {compatibleCount} compatíveis exibidas primeiro — algumas matrizes podem precisar de conversão de formato
      </span>
    </div>
  );
};
