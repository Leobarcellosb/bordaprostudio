import { useAuth } from "@/contexts/AuthContext";

export const MACHINE_FORMATS = ["DST", "PES", "JEF", "EXP", "XXX", "VP3", "HUS"] as const;
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
