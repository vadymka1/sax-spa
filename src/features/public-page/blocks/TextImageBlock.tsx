import React from "react";
import { PublicContentBlock } from "../../../api/types";
import { isImageMedia } from "../../../lib/mediaGuards";
import { ImageCarousel } from "../ImageCarousel";
import { FONT_FAMILY_CLASS, FONT_SIZE_CLASS } from "../typography";
import styles from "./ContentBlock.module.css";

interface TextImageBlockProps {
  block: PublicContentBlock;
}

export const TextImageBlock: React.FC<TextImageBlockProps> = ({ block }) => {
  const hasTitle = Boolean(block.title?.trim());
  const hasText = Boolean(block.text?.trim());
  const mediaList = Array.isArray(block.media)
    ? block.media
    : block.media
      ? [block.media]
      : [];
  const images = mediaList.filter(isImageMedia);

  if (!hasTitle && !hasText && images.length === 0) {
    return null;
  }

  const fontFamilyClass = FONT_FAMILY_CLASS[block.font_family || "sans"];
  const fontSizeClass = FONT_SIZE_CLASS[block.font_size || "md"];
  const isCarousel = images.length > 1;

  return (
    <article
      className={`${styles.blockContainer} ${styles.textImageBlock} ${isCarousel ? styles.carouselBlock : ""}`}
      data-block-id={block.id}
    >
      {(hasTitle || hasText) && (
        <div className={styles.textContent}>
          {hasTitle && <h3 className={styles.blockTitle}>{block.title}</h3>}
          {hasText && (
            <p
              className={`${styles.blockText} ${fontFamilyClass} ${fontSizeClass}`}
            >
              {block.text}
            </p>
          )}
        </div>
      )}
      {isCarousel ? (
        <ImageCarousel images={images} title={block.title} />
      ) : images.length === 1 && images[0] ? (
        <div className={styles.mediaWrapper}>
          <img
            src={images[0].url}
            alt={images[0].alt_text ?? ""}
            loading="lazy"
            decoding="async"
            className={styles.imageMedia}
          />
        </div>
      ) : null}
    </article>
  );
};
