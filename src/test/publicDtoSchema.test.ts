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

  it("fails parsing cleanly when appearance field is completely missing", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { appearance, ...withoutAppearance } = validPublicPageResponse.data;
    const responseWithoutAppearance = {
      data: withoutAppearance,
    };

    const result = PublicPageEnvelopeSchema.safeParse(
      responseWithoutAppearance,
    );
    expect(result.success).toBe(false);
  });

  it("parses valid public page response containing background image with type: image", () => {
    const validWithBg = {
      data: {
        ...validPublicPageResponse.data,
        appearance: {
          background_media: {
            id: "11111111-1111-4111-8111-111111111111",
            type: "image",
            url: "https://api.enstisax.com/uploads/bg.webp",
            alt_text: "Ensemble background",
          },
          overlay_opacity: 0.4,
          background_position: "top",
          background_size: "cover",
        },
      },
    };

    const result = PublicPageEnvelopeSchema.safeParse(validWithBg);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.appearance.background_media?.type).toBe("image");
      expect(result.data.data.appearance.background_media?.url).toBe(
        "https://api.enstisax.com/uploads/bg.webp",
      );
    }
  });

  it("fails parsing cleanly when background_media has missing discriminator", () => {
    const invalidAppearanceResponse = {
      data: {
        ...validPublicPageResponse.data,
        appearance: {
          background_media: {
            id: "11111111-1111-4111-8111-111111111111",
            url: "https://api.enstisax.com/uploads/bg.webp",
          },
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        },
      },
    };

    const result = PublicPageEnvelopeSchema.safeParse(
      invalidAppearanceResponse,
    );
    expect(result.success).toBe(false);
  });

  it("fails parsing cleanly when background_media uses legacy media_type instead of type", () => {
    const legacyAppearanceResponse = {
      data: {
        ...validPublicPageResponse.data,
        appearance: {
          background_media: {
            id: "11111111-1111-4111-8111-111111111111",
            media_type: "image",
            url: "https://api.enstisax.com/uploads/bg.webp",
          },
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        },
      },
    };

    const result = PublicPageEnvelopeSchema.safeParse(legacyAppearanceResponse);
    expect(result.success).toBe(false);
  });

  it("fails parsing cleanly when background_media has non-image type (video or youtube)", () => {
    const invalidVideoResponse = {
      data: {
        ...validPublicPageResponse.data,
        appearance: {
          background_media: {
            id: "11111111-1111-4111-8111-111111111111",
            type: "video",
            url: "https://api.enstisax.com/uploads/video.mp4",
          },
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        },
      },
    };

    expect(
      PublicPageEnvelopeSchema.safeParse(invalidVideoResponse).success,
    ).toBe(false);

    const invalidYoutubeResponse = {
      data: {
        ...validPublicPageResponse.data,
        appearance: {
          background_media: {
            id: "11111111-1111-4111-8111-111111111111",
            type: "youtube",
            url: "https://www.youtube.com/watch?v=123",
          },
          overlay_opacity: 0.35,
          background_position: "center",
          background_size: "cover",
        },
      },
    };

    expect(
      PublicPageEnvelopeSchema.safeParse(invalidYoutubeResponse).success,
    ).toBe(false);
  });
});
