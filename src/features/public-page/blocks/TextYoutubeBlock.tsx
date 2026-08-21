import React from "react";
import { PublicContentBlock } from "../../../api/types";
import { isYoutubeMedia } from "../../../lib/mediaGuards";
import styles from "./ContentBlock.module.css";

interface TextYoutubeBlockProps {
  block: PublicContentBlock;
}

export const TextYoutubeBlock: React.FC<TextYoutubeBlockProps> = ({
  block,
}) => {
  const hasTitle = Boolean(block.title?.trim());
  const hasText = Boolean(block.text?.trim());
  const youtubeMedia = isYoutubeMedia(block.media) ? block.media : null;

  if (!hasTitle && !hasText && !youtubeMedia) {
    return null;
  }

  const iframeTitle = block.title?.trim() || "YouTube video";

  return (
    <article
      className={`${styles.blockContainer} ${styles.textYoutubeBlock}`}
      data-block-id={block.id}
    >
      {(hasTitle || hasText) && (
        <div className={styles.textContent}>
          {hasTitle && <h3 className={styles.blockTitle}>{block.title}</h3>}
          {hasText && <p className={styles.blockText}>{block.text}</p>}
        </div>
      )}
      {youtubeMedia && (
        <div className={styles.mediaWrapper}>
          <iframe
            src={youtubeMedia.embed_url}
            title={iframeTitle}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className={styles.youtubeFrame}
          />
        </div>
      )}
    </article>
  );
};
