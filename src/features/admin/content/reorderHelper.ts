export interface ReorderItemPayload {
  id: string;
  sort_order: number;
}

/**
 * Builds reorder items assigning a canonical 10-step sequence (10, 20, 30...)
 * to ensure all items are present and have strictly unique, normalized sort orders.
 */
export function buildReorderItems<T extends { id: string }>(
  currentItems: T[],
  reorderedItems: T[],
): ReorderItemPayload[] | null {
  if (currentItems.length !== reorderedItems.length) {
    return null;
  }

  const currentIds = new Set(currentItems.map((b) => b.id));
  if (currentIds.size !== currentItems.length) {
    return null;
  }

  // Ensure every reordered item belongs to the original collection
  for (const item of reorderedItems) {
    if (!currentIds.has(item.id)) {
      return null;
    }
  }

  const reorderedIds = new Set(reorderedItems.map((b) => b.id));
  if (reorderedIds.size !== reorderedItems.length) {
    return null;
  }

  return reorderedItems.map((b, idx) => ({
    id: b.id,
    sort_order: (idx + 1) * 10,
  }));
}

/**
 * Pure helper function to reorder an array of items by moving an item from fromIndex to toIndex,
 * producing canonical 10-step sort_order items (10, 20, 30...).
 */
export function buildReorderPayload<T extends { id: string }>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): ReorderItemPayload[] | null {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return null;
  }

  const ids = new Set(items.map((b) => b.id));
  if (ids.size !== items.length) {
    return null;
  }

  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  if (!moved) return null;
  reordered.splice(toIndex, 0, moved);

  return reordered.map((b, idx) => ({
    id: b.id,
    sort_order: (idx + 1) * 10,
  }));
}
