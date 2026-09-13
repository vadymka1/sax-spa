import React from "react";
import { AdminTestimonialDto } from "../../../api/types";
import styles from "./testimonials.module.css";

interface TestimonialsListProps {
  testimonials: AdminTestimonialDto[];
  approvedTestimonials: AdminTestimonialDto[];
  onEdit: (testimonial: AdminTestimonialDto) => void;
  onDelete: (testimonial: AdminTestimonialDto) => void;
  onToggleVisibility: (testimonial: AdminTestimonialDto) => void;
  onApprove: (testimonial: AdminTestimonialDto) => void;
  onReject: (testimonial: AdminTestimonialDto) => void;
  onMoveUp: (testimonial: AdminTestimonialDto) => void;
  onMoveDown: (testimonial: AdminTestimonialDto) => void;
  isReordering: boolean;
  isUpdatingVisibility: boolean;
  isApprovingId?: string | null;
  isRejectingId?: string | null;
  onOpenCreateModal: () => void;
}

export const TestimonialsList: React.FC<TestimonialsListProps> = ({
  testimonials,
  approvedTestimonials,
  onEdit,
  onDelete,
  onToggleVisibility,
  onApprove,
  onReject,
  onMoveUp,
  onMoveDown,
  isReordering,
  isUpdatingVisibility,
  isApprovingId,
  isRejectingId,
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
      {testimonials.map((item) => {
        const initial = item.author_name.charAt(0).toUpperCase() || "T";
        const isApprovingThis = isApprovingId === item.id;
        const isRejectingThis = isRejectingId === item.id;
        const isActionLocked =
          isReordering || Boolean(isApprovingId) || Boolean(isRejectingId);

        const approvedIndex = approvedTestimonials.findIndex(
          (t) => t.id === item.id,
        );
        const isFirstApproved = approvedIndex === 0;
        const isLastApproved =
          approvedIndex === approvedTestimonials.length - 1;

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
                {item.moderation_status === "pending" && (
                  <span className={styles.statusBadgePending}>Pending</span>
                )}
                {item.moderation_status === "approved" && (
                  <span className={styles.statusBadgeVisible}>Published</span>
                )}
                {item.moderation_status === "rejected" && (
                  <span className={styles.statusBadgeRejected}>Rejected</span>
                )}

                <span className={styles.sourceBadge}>
                  {item.submission_source === "public" ? "Public" : "Admin"}
                </span>

                {item.moderation_status === "approved" && (
                  <>
                    <span className={styles.orderBadge}>
                      Order: {item.sort_order}
                    </span>
                    {item.is_visible ? (
                      <span className={styles.statusBadgeVisible}>Visible</span>
                    ) : (
                      <span className={styles.statusBadgeHidden}>Hidden</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <p className={styles.textPreview}>{item.text}</p>

            {item.moderation_status === "pending" && (
              <div className={styles.actions}>
                <div className={styles.crudControls}>
                  <button
                    type="button"
                    className={styles.approveButton}
                    onClick={() => onApprove(item)}
                    disabled={isActionLocked}
                    aria-label={`Approve testimonial by ${item.author_name}`}
                  >
                    {isApprovingThis ? "Approving..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    className={styles.rejectButton}
                    onClick={() => onReject(item)}
                    disabled={isActionLocked}
                    aria-label={`Reject testimonial by ${item.author_name}`}
                  >
                    {isRejectingThis ? "Rejecting..." : "Reject"}
                  </button>

                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => onEdit(item)}
                    disabled={isActionLocked}
                    aria-label={`Edit testimonial by ${item.author_name}`}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => onDelete(item)}
                    disabled={isActionLocked}
                    aria-label={`Delete testimonial by ${item.author_name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {item.moderation_status === "approved" && (
              <div className={styles.actions}>
                <div className={styles.reorderControls}>
                  <button
                    type="button"
                    className={styles.reorderButton}
                    onClick={() => onMoveUp(item)}
                    disabled={isFirstApproved || isActionLocked}
                    aria-label={`Move testimonial by ${item.author_name} up`}
                    data-reorder-btn={`${item.id}-up`}
                  >
                    &uarr; Move Up
                  </button>
                  <button
                    type="button"
                    className={styles.reorderButton}
                    onClick={() => onMoveDown(item)}
                    disabled={isLastApproved || isActionLocked}
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
                    disabled={isUpdatingVisibility || isActionLocked}
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
                    disabled={isActionLocked}
                    aria-label={`Edit testimonial by ${item.author_name}`}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className={styles.rejectButton}
                    onClick={() => onReject(item)}
                    disabled={isActionLocked}
                    aria-label={`Reject testimonial by ${item.author_name}`}
                  >
                    {isRejectingThis ? "Rejecting..." : "Reject"}
                  </button>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => onDelete(item)}
                    disabled={isActionLocked}
                    aria-label={`Delete testimonial by ${item.author_name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {item.moderation_status === "rejected" && (
              <div className={styles.actions}>
                <div className={styles.crudControls}>
                  <button
                    type="button"
                    className={styles.approveButton}
                    onClick={() => onApprove(item)}
                    disabled={isActionLocked}
                    aria-label={`Approve testimonial by ${item.author_name}`}
                  >
                    {isApprovingThis ? "Approving..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => onEdit(item)}
                    disabled={isActionLocked}
                    aria-label={`Edit testimonial by ${item.author_name}`}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => onDelete(item)}
                    disabled={isActionLocked}
                    aria-label={`Delete testimonial by ${item.author_name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};
