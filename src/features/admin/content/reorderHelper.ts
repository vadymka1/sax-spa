import {
  AdminContentBlockDto,
  ReorderContentBlocksRequest,
} from "../../../api/types";

/**
 * Builds reorder items assigning a canonical 10-step sequence (10, 20, 30...)
 * to ensure all blocks in the section are present and have strictly unique, normalized sort orders.
 */
export function buildReorderItems(
  currentBlocks: AdminContentBlockDto[],
  reorderedBlocks: AdminContentBlockDto[],
): ReorderContentBlocksRequest["items"] | null {
  if (currentBlocks.length !== reorderedBlocks.length) {
    return null;
  }

  const currentIds = new Set(currentBlocks.map((b) => b.id));
  if (currentIds.size !== currentBlocks.length) {
    return null;
  }

  // Ensure every reordered block belongs to the original section
  for (const block of reorderedBlocks) {
    if (!currentIds.has(block.id)) {
      return null;
    }
  }

  const reorderedIds = new Set(reorderedBlocks.map((b) => b.id));
  if (reorderedIds.size !== reorderedBlocks.length) {
    return null;
  }

  return reorderedBlocks.map((b, idx) => ({
    id: b.id,
    sort_order: (idx + 1) * 10,
  }));
}

/**
 * Pure helper function to reorder an array of blocks by moving an item from fromIndex to toIndex,
 * producing canonical 10-step sort_order items (10, 20, 30...).
 */
export function buildReorderPayload(
  blocks: AdminContentBlockDto[],
  fromIndex: number,
  toIndex: number,
): ReorderContentBlocksRequest["items"] | null {
  if (
    fromIndex < 0 ||
    fromIndex >= blocks.length ||
    toIndex < 0 ||
    toIndex >= blocks.length ||
    fromIndex === toIndex
  ) {
    return null;
  }

  const ids = new Set(blocks.map((b) => b.id));
  if (ids.size !== blocks.length) {
    return null;
  }

  const reordered = [...blocks];
  const [moved] = reordered.splice(fromIndex, 1);
  if (!moved) return null;
  reordered.splice(toIndex, 0, moved);

  return reordered.map((b, idx) => ({
    id: b.id,
    sort_order: (idx + 1) * 10,
  }));
}
