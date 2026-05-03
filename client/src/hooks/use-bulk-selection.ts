import { useCallback, useMemo, useState } from "react";

export function useBulkSelection<T extends { id: string }>(items: T[] | undefined) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleIds = useMemo(() => (items || []).map((i) => i.id), [items]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setSelected = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds((prev) => {
        if (!checked) {
          const next = new Set(prev);
          for (const id of visibleIds) next.delete(id);
          return next;
        }
        const next = new Set(prev);
        for (const id of visibleIds) next.add(id);
        return next;
      });
    },
    [visibleIds]
  );

  const visibleSelectedCount = useMemo(
    () => visibleIds.filter((id) => selectedIds.has(id)).length,
    [visibleIds, selectedIds]
  );

  const allVisibleSelected =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;

  return {
    selectedIds,
    selectedArray: Array.from(selectedIds),
    isSelected: (id: string) => selectedIds.has(id),
    toggle,
    setSelected,
    clear,
    toggleAll,
    allVisibleSelected,
    someVisibleSelected,
    selectedCount: selectedIds.size,
    visibleCount: visibleIds.length,
  };
}
