/**
 * Evento global disparado sempre que um design muda de pasta
 * (FolderPickerPopover, bulk-assign, editor save).
 *
 * Hooks que mantêm contagem de designs por pasta (AdminFolders,
 * useLibraryCategories) escutam esse evento e re-buscam os dados
 * sem precisar de React Query ou context drilling.
 */
export const DESIGNS_MUTATED = "designs:mutated" as const;

export function notifyDesignsMutated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DESIGNS_MUTATED));
  }
}
