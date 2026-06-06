import { useAuth } from "@/contexts/AuthContext";

export const MACHINE_FORMATS = ["DST", "PES", "JEF", "EXP", "XXX", "VP3", "HUS", "EMB"] as const;
// FONTE ÚNICA dos bastidores oferecidos na UI. Tem que bater EXATAMENTE com os
// valores que classifyHoopSize (src/lib/hoopSize.ts) grava em designs.hoop_size:
// 10x10, 14cm, 16cm, 13x18, 18cm, large. Oferecer um valor que o classifier
// nunca emite (ex.: 20cm/23cm, removidos aqui) deixava o usuário com ZERO
// matrizes compatíveis — mesma classe do bug de formato VP3. "large" segue como
// bucket real (maxSide > 200mm), mantido pra retrocompat dos users antigos.
export const MACHINE_HOOP_SIZES = ["10x10", "13x18", "14cm", "16cm", "18cm", "large"] as const;

export type MachineFormat = (typeof MACHINE_FORMATS)[number];
export type MachineHoopSize = (typeof MACHINE_HOOP_SIZES)[number];

export function useUserMachineSettings() {
  const { profile } = useAuth();

  return {
    machineFormat: (profile?.machine_format as MachineFormat) || null,
    machineHoopSize: (profile?.machine_hoop_size as MachineHoopSize) || null,
    hasMachineSettings: !!(profile?.machine_format && profile?.machine_hoop_size),
  };
}
