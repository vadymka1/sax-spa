import { describe, expect, it } from "vitest";
import { AdminContentBlockDto } from "../api/types";
import {
  buildReorderItems,
  buildReorderPayload,
} from "../features/admin/content/reorderHelper";

const createMockBlock = (
  id: string,
  sortOrder: number,
): AdminContentBlockDto => ({
  id,
  spa_section_id: "77777777-7777-7777-7777-777777777777",
  section_key: "about",
  section_title: "About",
  block_type: "text",
  title: `Block ${id}`,
  text: `Content for block ${id}`,
  media: [],
  font_family: "sans",
  font_size: "md",
  sort_order: sortOrder,
  is_visible: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

describe("Reorder Hardening Unit Tests", () => {
  const b1 = createMockBlock("11111111-1111-1111-1111-111111111111", 10);
  const b2 = createMockBlock("22222222-2222-2222-2222-222222222222", 20);
  const b3 = createMockBlock("33333333-3333-3333-3333-333333333333", 30);

  describe("buildReorderItems", () => {
    it("generates canonical 10-step sequence (10, 20, 30) for reordered blocks", () => {
      const current = [b1, b2, b3];
      const reordered = [b2, b3, b1];

      const result = buildReorderItems(current, reordered);
      expect(result).toEqual([
        { id: b2.id, sort_order: 10 },
        { id: b3.id, sort_order: 20 },
        { id: b1.id, sort_order: 30 },
      ]);
    });

    it("normalizes gapped sort orders (e.g. 10, 50, 100 -> 10, 20, 30)", () => {
      const gappedB1 = createMockBlock(b1.id, 10);
      const gappedB2 = createMockBlock(b2.id, 50);
      const gappedB3 = createMockBlock(b3.id, 100);

      const current = [gappedB1, gappedB2, gappedB3];
      const reordered = [gappedB3, gappedB1, gappedB2];

      const result = buildReorderItems(current, reordered);
      expect(result).toEqual([
        { id: b3.id, sort_order: 10 },
        { id: b1.id, sort_order: 20 },
        { id: b2.id, sort_order: 30 },
      ]);
    });

    it("normalizes duplicate sort orders in legacy data without conflicts", () => {
      const dupB1 = createMockBlock(b1.id, 10);
      const dupB2 = createMockBlock(b2.id, 10);
      const dupB3 = createMockBlock(b3.id, 20);

      const current = [dupB1, dupB2, dupB3];
      const reordered = [dupB2, dupB1, dupB3];

      const result = buildReorderItems(current, reordered);
      expect(result).toEqual([
        { id: b2.id, sort_order: 10 },
        { id: b1.id, sort_order: 20 },
        { id: b3.id, sort_order: 30 },
      ]);
    });

    it("returns null if array lengths mismatch", () => {
      const current = [b1, b2, b3];
      const reordered = [b1, b2];

      expect(buildReorderItems(current, reordered)).toBeNull();
    });

    it("returns null if foreign block ID is introduced", () => {
      const foreign = createMockBlock(
        "99999999-9999-9999-9999-999999999999",
        10,
      );
      const current = [b1, b2, b3];
      const reordered = [b1, b2, foreign];

      expect(buildReorderItems(current, reordered)).toBeNull();
    });
  });

  describe("buildReorderPayload", () => {
    it("moves element from fromIndex to toIndex with canonical 10-step sequence", () => {
      const blocks = [b1, b2, b3];
      // Move b1 (index 0) to index 2 (end) -> [b2, b3, b1]
      const result = buildReorderPayload(blocks, 0, 2);
      expect(result).toEqual([
        { id: b2.id, sort_order: 10 },
        { id: b3.id, sort_order: 20 },
        { id: b1.id, sort_order: 30 },
      ]);
    });

    it("moves element up from index 2 to index 1 -> [b1, b3, b2]", () => {
      const blocks = [b1, b2, b3];
      const result = buildReorderPayload(blocks, 2, 1);
      expect(result).toEqual([
        { id: b1.id, sort_order: 10 },
        { id: b3.id, sort_order: 20 },
        { id: b2.id, sort_order: 30 },
      ]);
    });

    it("returns null for invalid indices", () => {
      const blocks = [b1, b2, b3];
      expect(buildReorderPayload(blocks, -1, 1)).toBeNull();
      expect(buildReorderPayload(blocks, 0, 5)).toBeNull();
      expect(buildReorderPayload(blocks, 1, 1)).toBeNull();
    });
  });
});
