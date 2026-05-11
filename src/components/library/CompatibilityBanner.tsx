import { Info } from "lucide-react";

interface CompatibilityBannerProps {
  machineFormat: string | null;
  machineHoopSize: string | null;
  hasIncompatible: boolean;
  compatibleCount: number;
  totalShown: number;
  isLoading?: boolean;
}

export const CompatibilityBanner = ({
  machineFormat,
  machineHoopSize,
  compatibleCount,
  totalShown,
  isLoading = false,
}: CompatibilityBannerProps) => {
  // Sem máquina configurada — nada a sinalizar
  if (!machineFormat && !machineHoopSize) return null;

  // Carregando — evita banner com contador errado em estado inicial
  if (isLoading) return null;

  // Página vazia — empty state do grid cuida disso, banner só polui
  if (totalShown === 0) return null;

  // Há ao menos um compatível — experiência limpa, sem banner
  if (compatibleCount > 0) return null;

  // Há designs na página, mas NENHUM é compatível com o formato do usuário
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
      <Info className="h-4 w-4 flex-shrink-0" />
      <span>
        Nenhuma matriz encontrada para o seu formato
        {machineFormat && <span className="font-medium"> {machineFormat}</span>}
        . Mostrando todas as matrizes disponíveis.
      </span>
    </div>
  );
};
