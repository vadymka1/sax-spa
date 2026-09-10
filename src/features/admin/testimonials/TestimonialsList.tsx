import React from "react";
import { AdminTestimonialDto } from "../../../api/types";
import styles from "./testimonials.module.css";

interface TestimonialsListProps {
  testimonials: AdminTestimonialDto[];
  onEdit: (testimonial: AdminTestimonialDto) => void;
  onDelete: (testimonial: AdminTestimonialDto) => void;
  onToggleVisibility: (testimonial: AdminTestimonialDto) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isReordering: boolean;
  isUpdatingVisibility: boolean;
  onOpenCreateModal: () => void;
}

export const TestimonialsList: React.FC<TestimonialsListProps> = ({
  testimonials,
  onEdit,
  onDelete,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  isReordering,
  isUpdatingVisibility,
  onOpenCreateModal,
}) => {
  if (testimonials.length === 0) {
    return (
      <div className={styles.emptyState}>
        <h3 className={styles.emptyTitle}>No Testimonials Found</h3>
        <p className={styles.emptyDescription}>
          Create your first testimonial to showcase reviews and quotes on the
          public website.
        </p>
        <button
          type="button"
          className={styles.createButton}
          onClick={onOpenCreateModal}
        >
          + Add Testimonial
        </button>
      </div>
    );
  }

  return (
    <div className={styles.testimonialsGrid}>
      {testimonials.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === testimonials.length - 1;
        const initial = item.author_name.charAt(0).toUpperCase() || "T";

        return (
          <article key={item.id} className={styles.testimonialCard}>
            <div className={styles.cardHeader}>
              <div className={styles.authorSection}>
                {item.avatar?.type === "image" ? (
                  <img
                    src={item.avatar.url}
                    alt={item.author_name}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder} aria-hidden="true">
                    {initial}
                  </div>
                )}

                <div className={styles.authorMeta}>
                  <h3 className={styles.authorName}>{item.author_name}</h3>
                  {item.author_role && (
                    <span className={styles.authorRole}>
                      {item.author_role}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.badgeGroup}>
                <span className={styles.orderBadge}>
                  Order: {item.sort_order}
                </span>
                {item.is_visible ? (
                  <span className={styles.statusBadgeVisible}>Visible</span>
                ) : (
                  <span className={styles.statusBadgeHidden}>Hidden</span>
                )}
              </div>
            </div>

            <p className={styles.textPreview}>{item.text}</p>

            <div className={styles.actions}>
              <div className={styles.reorderControls}>
                <button
                  type="button"
                  className={styles.reorderButton}
                  onClick={() => onMoveUp(index)}
                  disabled={isFirst || isReordering}
                  aria-label={`Move testimonial by ${item.author_name} up`}
                  data-reorder-btn={`${item.id}-up`}
                >
                  &uarr; Move Up
                </button>
                <button
                  type="button"
                  className={styles.reorderButton}
                  onClick={() => onMoveDown(index)}
                  disabled={isLast || isReordering}
                  aria-label={`Move testimonial by ${item.author_name} down`}
                  data-reorder-btn={`${item.id}-down`}
                >
                  &darr; Move Down
                </button>
              </div>

              <div className={styles.crudControls}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => onToggleVisibility(item)}
                  disabled={isUpdatingVisibility || isReordering}
                  aria-label={
                    item.is_visible
                      ? `Hide testimonial by ${item.author_name}`
                      : `Show testimonial by ${item.author_name}`
                  }
                >
                  {item.is_visible ? "Hide" : "Show"}
                </button>

                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => onEdit(item)}
                  disabled={isReordering}
                  aria-label={`Edit testimonial by ${item.author_name}`}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => onDelete(item)}
                  disabled={isReordering}
                  aria-label={`Delete testimonial by ${item.author_name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};
