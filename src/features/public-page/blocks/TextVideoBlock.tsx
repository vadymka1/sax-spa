import React from "react";
import { PublicContentBlock } from "../../../api/types";
import { isVideoMedia } from "../../../lib/mediaGuards";
import styles from "./ContentBlock.module.css";

interface TextVideoBlockProps {
  block: PublicContentBlock;
}

export const TextVideoBlock: React.FC<TextVideoBlockProps> = ({ block }) => {
  const hasTitle = Boolean(block.title?.trim());
  const hasText = Boolean(block.text?.trim());
  const videoMedia = isVideoMedia(block.media) ? block.media : null;

  if (!hasTitle && !hasText && !videoMedia) {
    return null;
  }

  return (
    <article
      className={`${styles.blockContainer} ${styles.textVideoBlock}`}
      data-block-id={block.id}
    >
      {(hasTitle || hasText) && (
        <div className={styles.textContent}>
          {hasTitle && <h3 className={styles.blockTitle}>{block.title}</h3>}
          {hasText && <p className={styles.blockText}>{block.text}</p>}
        </div>
      )}
      {videoMedia && (
        <div className={styles.mediaWrapper}>
          <video controls preload="metadata" className={styles.videoMedia}>
            {videoMedia.mime_type ? (
              <source src={videoMedia.url} type={videoMedia.mime_type} />
            ) : (
              <source src={videoMedia.url} />
            )}
            Your browser does not support HTML video.
          </video>
        </div>
      )}
    </article>
  );
};
