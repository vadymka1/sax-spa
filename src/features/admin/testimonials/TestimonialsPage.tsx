import React, { useEffect, useState } from "react";
import { AdminTestimonialDto } from "../../../api/types";
import {
  useAdminTestimonials,
  useReorderTestimonials,
  useUpdateTestimonial,
} from "./testimonialQueries";
import { buildReorderPayload } from "../content/reorderHelper";
import { TestimonialsList } from "./TestimonialsList";
import { TestimonialCreateModal } from "./TestimonialCreateModal";
import { TestimonialEditModal } from "./TestimonialEditModal";
import { TestimonialDeleteModal } from "./TestimonialDeleteModal";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { AppApiError, normalizeApiError } from "../../../api/errors";
import styles from "./testimonials.module.css";

interface PendingReorderAnnouncement {
  testimonialId: string;
  label: string;
}

export const TestimonialsPage: React.FC = () => {
  const {
    data: testimonials,
    isLoading,
    isError,
    error,
    refetch: refetchTestimonials,
  } = useAdminTestimonials();

  const reorderMutation = useReorderTestimonials();
  const updateMutation = useUpdateTestimonial();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] =
    useState<AdminTestimonialDto | null>(null);
  const [deletingTestimonial, setDeletingTestimonial] =
    useState<AdminTestimonialDto | null>(null);

  // Status & error states for reorder
  const [reorderStatus, setReorderStatus] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<AppApiError | null>(null);
  const [confirmationError, setConfirmationError] =
    useState<AppApiError | null>(null);
  const [isConfirmingRefetch, setIsConfirmingRefetch] = useState(false);
  const [pendingAnnouncement, setPendingAnnouncement] =
    useState<PendingReorderAnnouncement | null>(null);
  const [lastReorderedAction, setLastReorderedAction] = useState<{
    testimonialId: string;
    action: "up" | "down";
  } | null>(null);

  const isReorderInFlight = reorderMutation.isPending || isConfirmingRefetch;

  // Restore focus to reorder button after reorder completes
  useEffect(() => {
    if (!isReorderInFlight && lastReorderedAction && testimonials) {
      const btnSelector = `[data-reorder-btn="${lastReorderedAction.testimonialId}-${lastReorderedAction.action}"]`;
      const btn = document.querySelector<HTMLButtonElement>(btnSelector);
      if (btn && !btn.disabled) {
        btn.focus();
      } else {
        const oppAction = lastReorderedAction.action === "up" ? "down" : "up";
        const oppBtn = document.querySelector<HTMLButtonElement>(
          `[data-reorder-btn="${lastReorderedAction.testimonialId}-${oppAction}"]`,
        );
        if (oppBtn && !oppBtn.disabled) {
          oppBtn.focus();
        }
      }
    }
  }, [testimonials, isReorderInFlight, lastReorderedAction]);

  const handleMove = (
    fromIndex: number,
    toIndex: number,
    direction: "up" | "down",
  ) => {
    if (!testimonials || isReorderInFlight) return;

    const items = buildReorderPayload(testimonials, fromIndex, toIndex);
    if (!items) {
      setReorderStatus("Unable to prepare testimonial order.");
      return;
    }

    const movedTestimonial = testimonials[fromIndex];
    if (!movedTestimonial) return;

    setReorderError(null);
    setConfirmationError(null);
    const label = movedTestimonial.author_name;
    setPendingAnnouncement({
      testimonialId: movedTestimonial.id,
      label,
    });
    setLastReorderedAction({
      testimonialId: movedTestimonial.id,
      action: direction,
    });

    reorderMutation.mutate(
      { items },
      {
        onSuccess: async () => {
          setIsConfirmingRefetch(true);
          try {
            const refetchResult = await refetchTestimonials();
            if (refetchResult.isError || !refetchResult.data) {
              const normalized = normalizeApiError(refetchResult.error);
              const safeError: AppApiError = {
                ...normalized,
                message:
                  "Order was saved, but the latest order could not be loaded.",
              };
              setConfirmationError(safeError);
              setReorderStatus(
                "Order was saved, but the latest order could not be loaded.",
              );
            } else {
              const fresh = refetchResult.data;
              const canonicalIndex = fresh.findIndex(
                (t) => t.id === movedTestimonial.id,
              );
              if (canonicalIndex >= 0) {
                setReorderStatus(
                  `Moved "${label}" to position ${
                    canonicalIndex + 1
                  } of ${fresh.length}.`,
                );
              } else {
                setReorderStatus("Testimonial order saved.");
              }
              setPendingAnnouncement(null);
              setConfirmationError(null);
            }
          } catch (err: unknown) {
            const normalized = normalizeApiError(err);
            setConfirmationError({
              ...normalized,
              message:
                "Order was saved, but the latest order could not be loaded.",
            });
            setReorderStatus(
              "Order was saved, but the latest order could not be loaded.",
            );
          } finally {
            setIsConfirmingRefetch(false);
          }
        },
        onError: (err) => {
          setPendingAnnouncement(null);
          setReorderError(err);
          setReorderStatus("Could not save testimonial order.");
        },
      },
    );
  };

  const handleRetryConfirmation = async () => {
    setIsConfirmingRefetch(true);
    try {
      const refetchResult = await refetchTestimonials();
      if (refetchResult.isError || !refetchResult.data) {
        const normalized = normalizeApiError(refetchResult.error);
        setConfirmationError({
          ...normalized,
          message: "Order was saved, but the latest order could not be loaded.",
        });
      } else {
        const fresh = refetchResult.data;
        if (pendingAnnouncement) {
          const canonicalIndex = fresh.findIndex(
            (t) => t.id === pendingAnnouncement.testimonialId,
          );
          if (canonicalIndex >= 0) {
            setReorderStatus(
              `Moved "${pendingAnnouncement.label}" to position ${
                canonicalIndex + 1
              } of ${fresh.length}.`,
            );
          } else {
            setReorderStatus("Latest testimonial order loaded.");
          }
          setPendingAnnouncement(null);
        } else {
          setReorderStatus("Latest testimonial order loaded.");
        }
        setConfirmationError(null);
      }
    } catch (err: unknown) {
      const normalized = normalizeApiError(err);
      setConfirmationError({
        ...normalized,
        message: "Order was saved, but the latest order could not be loaded.",
      });
    } finally {
      setIsConfirmingRefetch(false);
    }
  };

  const handleToggleVisibility = async (testimonial: AdminTestimonialDto) => {
    if (updateMutation.isPending || isReorderInFlight) return;

    try {
      await updateMutation.mutateAsync({
        id: testimonial.id,
        payload: {
          is_visible: !testimonial.is_visible,
        },
      });
    } catch {
      // Handled by updateMutation.error
    }
  };

  if (isLoading && !testimonials) {
    return (
      <div className={styles.container}>
        <LoadingSpinner label="Loading testimonials..." />
      </div>
    );
  }

  if (!testimonials && isError) {
    return (
      <div className={styles.container}>
        <ErrorMessage
          error={error || "Failed to load testimonials"}
          onRetry={() => void refetchTestimonials()}
        />
      </div>
    );
  }

  if (!testimonials) {
    return null;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Testimonials</h2>
          <p className={styles.subtitle}>
            Manage artist recommendations, critic quotes, and reviews for the
            public site.
          </p>
        </div>
        <button
          type="button"
          className={styles.createButton}
          onClick={() => setIsCreateOpen(true)}
          disabled={isReorderInFlight}
        >
          + Add Testimonial
        </button>
      </header>

      {/* Reorder status announcement for screen readers */}
      <div
        role="status"
        aria-live="polite"
        className={styles.srOnly}
        data-testid="reorder-status-announcer"
      >
        {reorderStatus}
      </div>

      {reorderError && (
        <div style={{ marginBottom: "1rem" }}>
          <ErrorMessage
            error={reorderError}
            onRetry={() => setReorderError(null)}
          />
        </div>
      )}

      {confirmationError && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            background: "var(--color-admin-surface)",
            border: "1px solid var(--color-admin-border-strong)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <ErrorMessage error={confirmationError} />
          <div style={{ marginTop: "0.75rem" }}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={handleRetryConfirmation}
              disabled={isConfirmingRefetch}
            >
              {isConfirmingRefetch ? "Loading..." : "Retry"}
            </button>
          </div>
        </div>
      )}

      {updateMutation.error && (
        <div style={{ marginBottom: "1rem" }}>
          <ErrorMessage error={updateMutation.error} />
        </div>
      )}

      <TestimonialsList
        testimonials={testimonials}
        onEdit={(item) => setEditingTestimonial(item)}
        onDelete={(item) => setDeletingTestimonial(item)}
        onToggleVisibility={handleToggleVisibility}
        onMoveUp={(index) => handleMove(index, index - 1, "up")}
        onMoveDown={(index) => handleMove(index, index + 1, "down")}
        isReordering={isReorderInFlight}
        isUpdatingVisibility={updateMutation.isPending}
        onOpenCreateModal={() => setIsCreateOpen(true)}
      />

      <TestimonialCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <TestimonialEditModal
        testimonial={editingTestimonial}
        isOpen={Boolean(editingTestimonial)}
        onClose={() => setEditingTestimonial(null)}
      />

      <TestimonialDeleteModal
        testimonial={deletingTestimonial}
        isOpen={Boolean(deletingTestimonial)}
        onClose={() => setDeletingTestimonial(null)}
      />
    </div>
  );
};
