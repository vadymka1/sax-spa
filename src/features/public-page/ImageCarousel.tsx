import { useState, type KeyboardEvent } from "react";
import type { PublicImageMedia } from "../../api/types";
import styles from "./ImageCarousel.module.css";

export interface ImageCarouselProps {
  images: PublicImageMedia[];
  title?: string | null;
}

export function ImageCarousel({ images, title }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const total = images.length;
  const currentImage = images[currentIndex] ?? images[0];
  if (!currentImage) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNext();
    }
  };

  const altText =
    currentImage.alt_text ||
    (title
      ? `${title} (Image ${currentIndex + 1} of ${total})`
      : `Image ${currentIndex + 1} of ${total}`);

  return (
    <div
      className={styles.carouselWrapper}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={title ? `${title} carousel` : "Image carousel"}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.mediaFrame}>
        <img
          src={currentImage.url}
          alt={altText}
          className={styles.image}
          loading="lazy"
        />
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.navButton}
          onClick={goToPrevious}
          aria-label="Previous image"
        >
          ‹
        </button>
        <button
          type="button"
          className={styles.navButton}
          onClick={goToNext}
          aria-label="Next image"
        >
          ›
        </button>
      </div>

      <div className={styles.footerBar} aria-live="polite" aria-atomic="true">
        {currentIndex + 1} / {total}
      </div>
    </div>
  );
}
