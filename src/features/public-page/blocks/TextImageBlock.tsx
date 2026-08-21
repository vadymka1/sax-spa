import React from "react";
import { PublicContentBlock } from "../../../api/types";
import { isImageMedia } from "../../../lib/mediaGuards";
import styles from "./ContentBlock.module.css";

interface TextImageBlockProps {
  block: PublicContentBlock;
}

export const TextImageBlock: React.FC<TextImageBlockProps> = ({ block }) => {
  const hasTitle = Boolean(block.title?.trim());
  const hasText = Boolean(block.text?.trim());
  const imageMedia = isImageMedia(block.media) ? block.media : null;

  if (!hasTitle && !hasText && !imageMedia) {
    return null;
  }

  return (
    <article
      className={`${styles.blockContainer} ${styles.textImageBlock}`}
      data-block-id={block.id}
    >
      {(hasTitle || hasText) && (
        <div className={styles.textContent}>
          {hasTitle && <h3 className={styles.blockTitle}>{block.title}</h3>}
          {hasText && <p className={styles.blockText}>{block.text}</p>}
        </div>
      )}
      {imageMedia && (
        <div className={styles.mediaWrapper}>
          <img
            src={imageMedia.url}
            alt={imageMedia.alt_text ?? ""}
            loading="lazy"
            decoding="async"
            className={styles.imageMedia}
          />
        </div>
      )}
    </article>
  );
};
