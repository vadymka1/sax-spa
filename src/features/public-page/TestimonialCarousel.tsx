import { useState, type KeyboardEvent } from "react";
import type { PublicTestimonial } from "../../api/types";
import styles from "./TestimonialCarousel.module.css";

export interface TestimonialCarouselProps {
  testimonials?: PublicTestimonial[];
}

export function TestimonialCarousel({
  testimonials = [],
}: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  const total = testimonials.length;

  if (total === 1) {
    const single = testimonials[0];
    if (!single) return null;
    const initial = single.author_name.charAt(0).toUpperCase() || "T";

    return (
      <div className={styles.testimonialsWrapper}>
        <article className={styles.staticCard}>
          <div className={styles.quoteMark} aria-hidden="true">
            &ldquo;
          </div>
          <p className={styles.quoteText}>{single.text}</p>
          <footer className={styles.authorFooter}>
            {single.avatar?.type === "image" ? (
              <img
                src={single.avatar.url}
                alt={single.author_name}
                className={styles.avatar}
                loading="lazy"
              />
            ) : (
              <div className={styles.avatarFallback} aria-hidden="true">
                {initial}
              </div>
            )}
            <div className={styles.authorDetails}>
              <h3 className={styles.authorName}>{single.author_name}</h3>
              {single.author_role && (
                <span className={styles.authorRole}>{single.author_role}</span>
              )}
            </div>
          </footer>
        </article>
      </div>
    );
  }

  const current = testimonials[currentIndex] ?? testimonials[0];
  if (!current) return null;

  const initial = current.author_name.charAt(0).toUpperCase() || "T";

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

  return (
    <div className={styles.testimonialsWrapper}>
      <div
        className={styles.carouselContainer}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Testimonials carousel"
        onKeyDown={handleKeyDown}
      >
        <div className={styles.quoteMark} aria-hidden="true">
          &ldquo;
        </div>
        <p className={styles.quoteText}>{current.text}</p>
        <footer className={styles.authorFooter}>
          {current.avatar?.type === "image" ? (
            <img
              src={current.avatar.url}
              alt={current.author_name}
              className={styles.avatar}
              loading="lazy"
            />
          ) : (
            <div className={styles.avatarFallback} aria-hidden="true">
              {initial}
            </div>
          )}
          <div className={styles.authorDetails}>
            <h3 className={styles.authorName}>{current.author_name}</h3>
            {current.author_role && (
              <span className={styles.authorRole}>{current.author_role}</span>
            )}
          </div>
        </footer>
      </div>

      <div className={styles.carouselControls}>
        <div
          className={styles.positionIndicator}
          aria-live="polite"
          aria-atomic="true"
        >
          {currentIndex + 1} / {total}
        </div>

        <div className={styles.navButtonGroup}>
          <button
            type="button"
            className={styles.navButton}
            onClick={goToPrevious}
            aria-label="Previous testimonial"
          >
            &#8249;
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={goToNext}
            aria-label="Next testimonial"
          >
            &#8250;
          </button>
        </div>
      </div>
    </div>
  );
}
