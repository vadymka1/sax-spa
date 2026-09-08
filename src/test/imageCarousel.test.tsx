import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicContentBlock, PublicImageMedia } from "../api/types";
import { ImageCarousel } from "../features/public-page/ImageCarousel";
import { TextImageBlock } from "../features/public-page/blocks/TextImageBlock";

const mockImages: PublicImageMedia[] = [
  {
    type: "image",
    id: "11111111-1111-1111-1111-111111111111",
    url: "https://example.com/sax1.jpg",
    alt_text: "Ensti performing live",
  },
  {
    type: "image",
    id: "22222222-2222-2222-2222-222222222222",
    url: "https://example.com/sax2.jpg",
    alt_text: "Ensti with tenor sax in studio",
  },
  {
    type: "image",
    id: "33333333-3333-3333-3333-333333333333",
    url: "https://example.com/sax3.jpg",
    alt_text: "Close-up of vintage mouthpiece",
  },
];

describe("ImageCarousel Component", () => {
  it("returns null when provided with empty image list", () => {
    const { container } = render(<ImageCarousel images={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders first image and initial indicator 1 / 3", () => {
    render(<ImageCarousel images={mockImages} title="Gallery" />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/sax1.jpg");
    expect(img).toHaveAttribute("alt", "Ensti performing live");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("navigates forward and wraps around from last to first", () => {
    render(<ImageCarousel images={mockImages} title="Gallery" />);

    const nextBtn = screen.getByRole("button", { name: "Next image" });

    // Step to image 2
    fireEvent.click(nextBtn);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://example.com/sax2.jpg",
    );
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    // Step to image 3
    fireEvent.click(nextBtn);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://example.com/sax3.jpg",
    );
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    // Wrap around to image 1
    fireEvent.click(nextBtn);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://example.com/sax1.jpg",
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("navigates backward and wraps around from first to last", () => {
    render(<ImageCarousel images={mockImages} title="Gallery" />);

    const prevBtn = screen.getByRole("button", { name: "Previous image" });

    // From image 1, go backward -> wraps to image 3
    fireEvent.click(prevBtn);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://example.com/sax3.jpg",
    );
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    // Go backward again -> image 2
    fireEvent.click(prevBtn);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://example.com/sax2.jpg",
    );
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("supports keyboard navigation on carousel container (ArrowRight & ArrowLeft)", () => {
    render(<ImageCarousel images={mockImages} title="Gallery" />);

    const carouselRegion = screen.getByRole("region", {
      name: "Gallery carousel",
    });

    // ArrowRight advances to 2
    fireEvent.keyDown(carouselRegion, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    // ArrowLeft returns to 1
    fireEvent.keyDown(carouselRegion, { key: "ArrowLeft" });
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });
});

describe("TextImageBlock Integration with ImageCarousel", () => {
  it("renders text only if media array is empty", () => {
    const block: PublicContentBlock = {
      id: "44444444-4444-4444-4444-444444444444",
      block_type: "text_image",
      title: "No Image Block",
      text: "Paragraph text here.",
      media: [],
      sort_order: 10,
    };

    render(<TextImageBlock block={block} />);
    expect(screen.getByText("No Image Block")).toBeInTheDocument();
    expect(screen.getByText("Paragraph text here.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next image" }),
    ).not.toBeInTheDocument();
  });

  it("renders single static img when block has 1 image (no carousel controls)", () => {
    const block: PublicContentBlock = {
      id: "55555555-5555-5555-5555-555555555555",
      block_type: "text_image",
      title: "Solo Image Block",
      text: "Solo image caption.",
      media: [mockImages[0]!],
      sort_order: 10,
    };

    render(<TextImageBlock block={block} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://example.com/sax1.jpg",
    );
    expect(
      screen.queryByRole("button", { name: "Next image" }),
    ).not.toBeInTheDocument();
  });

  it("renders ImageCarousel when block has 2+ images", () => {
    const block: PublicContentBlock = {
      id: "66666666-6666-6666-6666-666666666666",
      block_type: "text_image",
      title: "Multi Image Block",
      text: "Multiple images attached.",
      media: mockImages,
      sort_order: 10,
    };

    render(<TextImageBlock block={block} />);
    expect(
      screen.getByRole("button", { name: "Next image" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous image" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });
});
