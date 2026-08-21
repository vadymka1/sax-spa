import {
  AdminContentBlockDto,
  ReorderContentBlocksRequest,
} from "../../../api/types";

export function buildReorderItems(
  currentBlocks: AdminContentBlockDto[],
  reorderedBlocks: AdminContentBlockDto[],
): ReorderContentBlocksRequest["items"] | null {
  if (currentBlocks.length !== reorderedBlocks.length) {
    return null;
  }

  const sortedSortOrders = [...currentBlocks]
    .map((b) => b.sort_order)
    .sort((a, b) => a - b);

  return reorderedBlocks.map((b, idx) => ({
    id: b.id,
    sort_order: sortedSortOrders[idx]!,
  }));
}
