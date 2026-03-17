import { db } from "@/lib/db";

/**
 * Filters design IDs to only those that have files in the given format.
 * Returns a Set of valid design IDs.
 */
export async function filterDesignsByFormat(designIds: string[], machineFormat: string | null): Promise<Set<string>> {
  if (!machineFormat || designIds.length === 0) return new Set(designIds);

  const { data: files } = await db
    .from("kit_arquivos")
    .select("design_id")
    .in("design_id", designIds)
    .ilike("format", machineFormat);

  return new Set((files || []).map((f: any) => f.design_id));
}

/**
 * Filters an array of designs by machine hoop size and format.
 * Returns filtered designs array.
 */
export async function filterDesignsByMachine(
  designs: any[],
  machineHoopSize: string | null,
  machineFormat: string | null
): Promise<any[]> {
  let filtered = designs;

  // Filter by hoop size
  if (machineHoopSize) {
    filtered = filtered.filter((d: any) => d.hoop_size === machineHoopSize);
  }

  // Filter by format (requires DB check)
  if (machineFormat && filtered.length > 0) {
    const ids = filtered.map((d: any) => d.id);
    const validIds = await filterDesignsByFormat(ids, machineFormat);
    filtered = filtered.filter((d: any) => validIds.has(d.id));
  }

  return filtered;
}
