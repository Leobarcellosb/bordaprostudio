/**
 * Evento global disparado sempre que um design muda de pasta
 * (FolderPickerPopover, bulk-assign, bulk-delete, editor save).
 *
 * AdminFolders e useLibraryCategories escutam esse evento e
 * re-buscam os dados sem precisar de React Query ou context drilling.
 * É ADICIONAL ao fetch inicial — nunca o substitui.
 */
export const DESIGNS_MUTATED = "designs:mutated" as const;

export function notifyDesignsMutated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DESIGNS_MUTATED));
  }
}
