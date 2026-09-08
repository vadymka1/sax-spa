import React from "react";
import { PublicContentBlock } from "../../../api/types";
import { FONT_FAMILY_CLASS, FONT_SIZE_CLASS } from "../typography";
import styles from "./ContentBlock.module.css";

interface TextBlockProps {
  block: PublicContentBlock;
}

export const TextBlock: React.FC<TextBlockProps> = ({ block }) => {
  const hasTitle = Boolean(block.title?.trim());
  const hasText = Boolean(block.text?.trim());

  if (!hasTitle && !hasText) {
    return null;
  }

  const fontFamilyClass = FONT_FAMILY_CLASS[block.font_family || "sans"];
  const fontSizeClass = FONT_SIZE_CLASS[block.font_size || "md"];

  return (
    <article className={styles.blockContainer} data-block-id={block.id}>
      {hasTitle && <h3 className={styles.blockTitle}>{block.title}</h3>}
      {hasText && (
        <p
          className={`${styles.blockText} ${fontFamilyClass} ${fontSizeClass}`}
        >
          {block.text}
        </p>
      )}
    </article>
  );
};
