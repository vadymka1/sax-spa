import React, { useEffect, useMemo, useState } from "react";
import { AdminTestimonialDto } from "../../../api/types";
import {
  useAdminTestimonials,
  useApproveTestimonial,
  useRejectTestimonial,
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

type ModerationTab = "pending" | "approved" | "rejected" | "all";

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
  const approveMutation = useApproveTestimonial();
  const rejectMutation = useRejectTestimonial();

  const [activeTab, setActiveTab] = useState<ModerationTab>("pending");
  const [hasInitializedTab, setHasInitializedTab] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] =
    useState<AdminTestimonialDto | null>(null);
  const [deletingTestimonial, setDeletingTestimonial] =
    useState<AdminTestimonialDto | null>(null);

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<AppApiError | null>(
    null,
  );

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

  // Derive counts
  const pendingCount = useMemo(
    () =>
      (testimonials ?? []).filter((t) => t.moderation_status === "pending")
        .length,
    [testimonials],
  );
  const approvedCount = useMemo(
    () =>
      (testimonials ?? []).filter((t) => t.moderation_status === "approved")
        .length,
    [testimonials],
  );
  const rejectedCount = useMemo(
    () =>
      (testimonials ?? []).filter((t) => t.moderation_status === "rejected")
        .length,
    [testimonials],
  );
  const allCount = (testimonials ?? []).length;

  // Default tab: Pending if pending items exist, else Published (or All if published is empty)
  useEffect(() => {
    if (!hasInitializedTab && testimonials && testimonials.length > 0) {
      if (pendingCount > 0) {
        setActiveTab("pending");
      } else if (approvedCount > 0) {
        setActiveTab("approved");
      } else {
        setActiveTab("all");
      }
      setHasInitializedTab(true);
    }
  }, [testimonials, hasInitializedTab, pendingCount, approvedCount]);

  const approvedTestimonials = useMemo(
    () =>
      (testimonials ?? []).filter((t) => t.moderation_status === "approved"),
    [testimonials],
  );

  const displayedTestimonials = useMemo(() => {
    if (!testimonials) return [];
    if (activeTab === "pending") {
      return testimonials.filter((t) => t.moderation_status === "pending");
    }
    if (activeTab === "approved") {
      return testimonials.filter((t) => t.moderation_status === "approved");
    }
    if (activeTab === "rejected") {
      return testimonials.filter((t) => t.moderation_status === "rejected");
    }
    return testimonials;
  }, [testimonials, activeTab]);

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
    movedTestimonial: AdminTestimonialDto,
    direction: "up" | "down",
  ) => {
    if (!testimonials || isReorderInFlight) return;

    // Strict Reorder Domain: Reordering only operates on approved testimonials
    const fromIndex = approvedTestimonials.findIndex(
      (t) => t.id === movedTestimonial.id,
    );
    if (fromIndex === -1) return;

    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= approvedTestimonials.length) return;

    const items = buildReorderPayload(approvedTestimonials, fromIndex, toIndex);
    if (!items) {
      setReorderStatus("Unable to prepare testimonial order.");
      return;
    }

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
              const freshApproved = fresh.filter(
                (t) => t.moderation_status === "approved",
              );
              const canonicalIndex = freshApproved.findIndex(
                (t) => t.id === movedTestimonial.id,
              );
              if (canonicalIndex >= 0) {
                setReorderStatus(
                  `Moved "${label}" to position ${
                    canonicalIndex + 1
                  } of ${freshApproved.length}.`,
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
        const freshApproved = fresh.filter(
          (t) => t.moderation_status === "approved",
        );
        if (pendingAnnouncement) {
          const canonicalIndex = freshApproved.findIndex(
            (t) => t.id === pendingAnnouncement.testimonialId,
          );
          if (canonicalIndex >= 0) {
            setReorderStatus(
              `Moved "${pendingAnnouncement.label}" to position ${
                canonicalIndex + 1
              } of ${freshApproved.length}.`,
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
    if (
      testimonial.moderation_status !== "approved" ||
      updateMutation.isPending ||
      isReorderInFlight
    ) {
      return;
    }

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

  const handleApprove = async (testimonial: AdminTestimonialDto) => {
    if (approvingId || rejectingId || isReorderInFlight) return;
    setApprovingId(testimonial.id);
    setModerationError(null);
    try {
      await approveMutation.mutateAsync(testimonial.id);
    } catch (err) {
      setModerationError(normalizeApiError(err));
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (testimonial: AdminTestimonialDto) => {
    if (approvingId || rejectingId || isReorderInFlight) return;
    setRejectingId(testimonial.id);
    setModerationError(null);
    try {
      await rejectMutation.mutateAsync(testimonial.id);
    } catch (err) {
      setModerationError(normalizeApiError(err));
    } finally {
      setRejectingId(null);
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

      {/* Filter Tabs */}
      <nav className={styles.tabGroup} aria-label="Moderation status filter">
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "pending" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("pending")}
          aria-current={activeTab === "pending" ? "page" : undefined}
        >
          Pending <span className={styles.tabCount}>({pendingCount})</span>
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "approved" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("approved")}
          aria-current={activeTab === "approved" ? "page" : undefined}
        >
          Published <span className={styles.tabCount}>({approvedCount})</span>
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "rejected" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("rejected")}
          aria-current={activeTab === "rejected" ? "page" : undefined}
        >
          Rejected <span className={styles.tabCount}>({rejectedCount})</span>
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "all" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("all")}
          aria-current={activeTab === "all" ? "page" : undefined}
        >
          All <span className={styles.tabCount}>({allCount})</span>
        </button>
      </nav>

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

      {moderationError && (
        <div style={{ marginBottom: "1rem" }}>
          <ErrorMessage
            error={moderationError}
            onRetry={() => setModerationError(null)}
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
        testimonials={displayedTestimonials}
        approvedTestimonials={approvedTestimonials}
        onEdit={(item) => setEditingTestimonial(item)}
        onDelete={(item) => setDeletingTestimonial(item)}
        onToggleVisibility={handleToggleVisibility}
        onApprove={handleApprove}
        onReject={handleReject}
        onMoveUp={(item) => handleMove(item, "up")}
        onMoveDown={(item) => handleMove(item, "down")}
        isReordering={isReorderInFlight}
        isUpdatingVisibility={updateMutation.isPending}
        isApprovingId={approvingId}
        isRejectingId={rejectingId}
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
