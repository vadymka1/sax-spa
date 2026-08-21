import React from "react";
import { PublicContentBlock } from "../../../api/types";
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

  return (
    <article className={styles.blockContainer} data-block-id={block.id}>
      {hasTitle && <h3 className={styles.blockTitle}>{block.title}</h3>}
      {hasText && <p className={styles.blockText}>{block.text}</p>}
    </article>
  );
};
