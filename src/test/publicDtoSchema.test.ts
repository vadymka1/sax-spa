import { describe, it, expect } from "vitest";
import { PublicPageEnvelopeSchema } from "../api/types";
import { validPublicPageResponse } from "./fixtures/publicPageFixture";

describe("Public DTO Schema Validation", () => {
  it("parses a valid backend public page response containing all 4 block types", () => {
    const result = PublicPageEnvelopeSchema.safeParse(validPublicPageResponse);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.data.page.slug).toBe("home");
      expect(result.data.data.sections).toHaveLength(1);
      const blocks = result.data.data.sections[0]?.blocks ?? [];
      expect(blocks).toHaveLength(4);
      expect(blocks[0]?.block_type).toBe("text");
      expect(blocks[1]?.block_type).toBe("text_image");
      expect(blocks[2]?.block_type).toBe("text_video");
      expect(blocks[3]?.block_type).toBe("text_youtube");
    }
  });

  it("fails parsing cleanly when block_type is unknown or unsupported", () => {
    const invalidResponse = {
      data: {
        page: {
          id: "813876e5-42d8-4fbb-91ea-72223a3bc990",
          slug: "home",
          title: "Home",
        },
        sections: [
          {
            id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df322",
            key: "about-us",
            title: "About Us",
            navigation_label: "About Us",
            sort_order: 10,
            blocks: [
              {
                id: "7649fb99-702b-47e1-b4cb-d48e89f81d19",
                block_type: "unsupported_3d_widget",
                title: "Invalid Block",
                text: "Content",
                sort_order: 10,
              },
            ],
          },
        ],
      },
    };

    const result = PublicPageEnvelopeSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  it("fails parsing cleanly when tagged media type is invalid", () => {
    const invalidMediaResponse = {
      data: {
        page: {
          id: "813876e5-42d8-4fbb-91ea-72223a3bc990",
          slug: "home",
          title: "Home",
        },
        sections: [
          {
            id: "e0b9687e-e2e4-4d8b-9a84-9343ee6df322",
            key: "about-us",
            title: "About Us",
            navigation_label: "About Us",
            sort_order: 10,
            blocks: [
              {
                id: "7649fb99-702b-47e1-b4cb-d48e89f81d19",
                block_type: "text_image",
                title: "Invalid Media Block",
                text: "Content",
                media: {
                  type: "audio", // unsupported media tag
                  id: "99887766-5544-3322-1100-aabbccddeeff",
                  url: "/audio.mp3",
                },
                sort_order: 10,
              },
            ],
          },
        ],
      },
    };

    const result = PublicPageEnvelopeSchema.safeParse(invalidMediaResponse);
    expect(result.success).toBe(false);
  });
});
