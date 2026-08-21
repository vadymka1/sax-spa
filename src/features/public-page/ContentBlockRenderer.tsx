import React from "react";
import { PublicContentBlock } from "../../api/types";
import { TextBlock } from "./blocks/TextBlock";
import { TextImageBlock } from "./blocks/TextImageBlock";
import { TextVideoBlock } from "./blocks/TextVideoBlock";
import { TextYoutubeBlock } from "./blocks/TextYoutubeBlock";

interface ContentBlockRendererProps {
  block: PublicContentBlock;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled content block type: ${JSON.stringify(value)}`);
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({
  block,
}) => {
  switch (block.block_type) {
    case "text":
      return <TextBlock block={block} />;

    case "text_image":
      return <TextImageBlock block={block} />;

    case "text_video":
      return <TextVideoBlock block={block} />;

    case "text_youtube":
      return <TextYoutubeBlock block={block} />;

    default:
      return assertNever(block.block_type);
  }
};
