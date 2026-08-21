import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  PublicContentBlock,
  PublicImageMedia,
  PublicVideoMedia,
  PublicYoutubeMedia,
} from "../api/types";
import { ContentBlockRenderer } from "../features/public-page/ContentBlockRenderer";
import { isImageMedia, isVideoMedia, isYoutubeMedia } from "../lib/mediaGuards";

describe("ContentBlockRenderer (F3.1 Public Block Renderers & Type Safety)", () => {
  it("renders TextBlock with title, text, and no media elements", () => {
    const textBlock: PublicContentBlock = {
      id: "a0000000-0000-4000-8000-000000000001",
      block_type: "text",
      title: "Quartet Performance",
      text: "We perform classical and contemporary saxophone compositions.",
      media: null,
      sort_order: 10,
    };

    render(<ContentBlockRenderer block={textBlock} />);

    expect(
      screen.getByRole("heading", { name: "Quartet Performance" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We perform classical and contemporary saxophone compositions.",
      ),
    ).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("video")).toBeNull();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("preserves multiline text formatting in TextBlock", () => {
    const multilineBlock: PublicContentBlock = {
      id: "a0000000-0000-4000-8000-000000000002",
      block_type: "text",
      title: "Program Schedule",
      text: "Line one: Bach Invention\nLine two: Piazzolla Tango",
      media: null,
      sort_order: 20,
    };

    render(<ContentBlockRenderer block={multilineBlock} />);

    const paragraph = screen.getByText(
      (content) =>
        content.includes("Line one: Bach Invention") &&
        content.includes("Line two: Piazzolla Tango"),
    );
    expect(paragraph).toBeInTheDocument();
  });

  it("renders TextImageBlock with exact backend media URL, alt text, lazy loading, and async decoding", () => {
    const imageBlock: PublicContentBlock = {
      id: "a0000000-0000-4000-8000-000000000003",
      block_type: "text_image",
      title: "Stage Image",
      text: "Live performance at Vienna Concert Hall.",
      media: {
        type: "image",
        id: "b0000000-0000-4000-8000-000000000001",
        url: "https://cdn.example.test/images/vienna.jpg",
        alt_text: "Ensemble on stage under spotlight",
      },
      sort_order: 30,
    };

    render(<ContentBlockRenderer block={imageBlock} />);

    expect(
      screen.getByRole("heading", { name: "Stage Image" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Live performance at Vienna Concert Hall."),
    ).toBeInTheDocument();

    const img = screen.getByRole("img", {
      name: "Ensemble on stage under spotlight",
    }) as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe("https://cdn.example.test/images/vienna.jpg");
    expect(img.getAttribute("alt")).toBe("Ensemble on stage under spotlight");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
  });

  it("renders empty string alt attribute when image alt_text is null or absent", () => {
    const nullAltBlock: PublicContentBlock = {
      id: "a0000000-0000-4000-8000-000000000004",
      block_type: "text_image",
      title: "Decorative Saxophone Graphic",
      text: "Visual art background.",
      media: {
        type: "image",
        id: "b0000000-0000-4000-8000-000000000002",
        url: "https://cdn.example.test/images/graphic.png",
        alt_text: null,
      },
      sort_order: 40,
    };

    render(<ContentBlockRenderer block={nullAltBlock} />);

    const img = document.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("alt")).not.toBe("image");
    expect(img?.getAttribute("alt")).not.toBe("photo");
  });

  it("renders TextVideoBlock with native controls, metadata preloading, mime type, and NO autoplay", () => {
    const videoBlock: PublicContentBlock = {
      id: "a0000000-0000-4000-8000-000000000005",
      block_type: "text_video",
      title: "Concert Recording",
      text: "High definition recording from Tokyo International Hall.",
      media: {
        type: "video",
        id: "b0000000-0000-4000-8000-000000000003",
        url: "https://cdn.example.test/videos/tokyo.mp4",
        mime_type: "video/mp4",
      },
      sort_order: 50,
    };

    render(<ContentBlockRenderer block={videoBlock} />);

    expect(
      screen.getByRole("heading", { name: "Concert Recording" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "High definition recording from Tokyo International Hall.",
      ),
    ).toBeInTheDocument();

    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.hasAttribute("controls")).toBe(true);
    expect(video?.getAttribute("preload")).toBe("metadata");
    expect(video?.hasAttribute("autoplay")).toBe(false);

    const source = video?.querySelector("source");
    expect(source).not.toBeNull();
    expect(source?.getAttribute("src")).toBe(
      "https://cdn.example.test/videos/tokyo.mp4",
    );
    expect(source?.getAttribute("type")).toBe("video/mp4");
  });

  it("renders TextYoutubeBlock with exact backend embed_url, title, lazy loading, and allowFullScreen", () => {
    const youtubeBlock: PublicContentBlock = {
      id: "a0000000-0000-4000-8000-000000000006",
      block_type: "text_youtube",
      title: "Festival Highlights",
      text: "Watch our highlight reel on YouTube.",
      media: {
        type: "youtube",
        id: "b0000000-0000-4000-8000-000000000004",
        youtube_video_id: "dQw4w9WgXcQ",
        embed_url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
        thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      },
      sort_order: 60,
    };

    render(<ContentBlockRenderer block={youtubeBlock} />);

    expect(
      screen.getByRole("heading", { name: "Festival Highlights" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Watch our highlight reel on YouTube."),
    ).toBeInTheDocument();

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
    );
    expect(iframe?.getAttribute("title")).toBe("Festival Highlights");
    expect(iframe?.getAttribute("loading")).toBe("lazy");
    expect(iframe?.hasAttribute("allowfullscreen")).toBe(true);
    expect(iframe?.getAttribute("allow")).toContain("accelerometer");
  });

  it("type-safe media guards reject mismatched media types without type assertions", () => {
    const videoMedia: PublicVideoMedia = {
      type: "video",
      id: "b0000000-0000-4000-8000-000000000005",
      url: "https://cdn.example.test/videos/sample.mp4",
      mime_type: "video/mp4",
    };

    const imageMedia: PublicImageMedia = {
      type: "image",
      id: "b0000000-0000-4000-8000-000000000006",
      url: "https://cdn.example.test/images/sample.jpg",
      alt_text: "Sample image",
    };

    const youtubeMedia: PublicYoutubeMedia = {
      type: "youtube",
      id: "b0000000-0000-4000-8000-000000000007",
      youtube_video_id: "xyz123",
      embed_url: "https://www.youtube.com/embed/xyz123",
      thumbnail_url: "https://img.youtube.com/vi/xyz123/default.jpg",
    };

    // Verify image guard only accepts image media
    expect(isImageMedia(videoMedia)).toBe(false);
    expect(isImageMedia(youtubeMedia)).toBe(false);
    expect(isImageMedia(imageMedia)).toBe(true);

    // Verify video guard only accepts video media
    expect(isVideoMedia(imageMedia)).toBe(false);
    expect(isVideoMedia(youtubeMedia)).toBe(false);
    expect(isVideoMedia(videoMedia)).toBe(true);

    // Verify YouTube guard only accepts YouTube media
    expect(isYoutubeMedia(imageMedia)).toBe(false);
    expect(isYoutubeMedia(videoMedia)).toBe(false);
    expect(isYoutubeMedia(youtubeMedia)).toBe(true);
  });

  it("handles missing media safely when block_type expects media", () => {
    const missingMediaBlock: PublicContentBlock = {
      id: "a0000000-0000-4000-8000-000000000008",
      block_type: "text_video",
      title: "Video Pending",
      text: "Video file will be attached soon.",
      media: null,
      sort_order: 80,
    };

    render(<ContentBlockRenderer block={missingMediaBlock} />);

    expect(
      screen.getByRole("heading", { name: "Video Pending" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Video file will be attached soon."),
    ).toBeInTheDocument();
    expect(document.querySelector("video")).toBeNull();
  });

  it("preserves array ordering when rendering multiple blocks", () => {
    const blocks: PublicContentBlock[] = [
      {
        id: "block-1-video",
        block_type: "text_video",
        title: "Block 1 Video",
        text: "First item",
        media: {
          type: "video",
          id: "8649fb99-702b-47e1-b4cb-d48e89f81e11",
          url: "https://cdn.example.test/v1.mp4",
        },
        sort_order: 10,
      },
      {
        id: "block-2-text",
        block_type: "text",
        title: "Block 2 Text",
        text: "Second item",
        media: null,
        sort_order: 20,
      },
      {
        id: "block-3-youtube",
        block_type: "text_youtube",
        title: "Block 3 YouTube",
        text: "Third item",
        media: {
          type: "youtube",
          id: "8649fb99-702b-47e1-b4cb-d48e89f81e12",
          youtube_video_id: "xyz",
          embed_url: "https://youtube.com/embed/xyz",
          thumbnail_url: "https://img.youtube.com/xyz.jpg",
        },
        sort_order: 30,
      },
      {
        id: "block-4-image",
        block_type: "text_image",
        title: "Block 4 Image",
        text: "Fourth item",
        media: {
          type: "image",
          id: "8649fb99-702b-47e1-b4cb-d48e89f81e13",
          url: "https://cdn.example.test/img4.jpg",
          alt_text: "Fourth image",
        },
        sort_order: 40,
      },
    ];

    render(
      <div>
        {blocks.map((block) => (
          <ContentBlockRenderer key={block.id} block={block} />
        ))}
      </div>,
    );

    const articles = Array.from(document.querySelectorAll("article"));
    expect(articles).toHaveLength(4);
    expect(articles.map((el) => el.getAttribute("data-block-id"))).toEqual([
      "block-1-video",
      "block-2-text",
      "block-3-youtube",
      "block-4-image",
    ]);
  });
});
