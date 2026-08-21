import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminContentBlockDto } from "../../../api/types";
import { AppApiError, normalizeApiError } from "../../../api/errors";
import { useAdminSpaSections } from "../sections/sectionQueries";
import {
  useAdminContentBlocks,
  useReorderContentBlocks,
} from "./contentQueries";
import { buildReorderItems } from "./reorderHelper";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { ContentBlocksList } from "./ContentBlocksList";
import { ContentBlockCreateModal } from "./ContentBlockCreateModal";
import { ContentBlockEditModal } from "./ContentBlockEditModal";
import { ContentBlockDeleteModal } from "./ContentBlockDeleteModal";
import styles from "./content.module.css";

type PendingReorderAnnouncement = {
  spaSectionId: string;
  blockId: string;
  label: string;
} | null;

export const ContentBlocksPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const createButtonRef = useRef<HTMLButtonElement | null>(null);

  const {
    data: sections,
    isLoading: isSectionsLoading,
    error: sectionsError,
    refetch: refetchSections,
  } = useAdminSpaSections();

  const selectedSectionId = (() => {
    const paramId = searchParams.get("section");
    if (sections && sections.length > 0) {
      if (paramId && sections.some((s) => s.id === paramId)) {
        return paramId;
      }
      return sections[0]?.id || "";
    }
    return paramId || "";
  })();

  const handleSelectSection = (id: string) => {
    if (isSectionSelectionLocked) return;
    setSearchParams({ section: id });
  };

  const {
    data: blocks,
    isLoading: isBlocksLoading,
    error: blocksError,
    refetch: refetchBlocks,
  } = useAdminContentBlocks(selectedSectionId);

  const reorderMutation = useReorderContentBlocks();
  const [reorderError, setReorderError] = useState<AppApiError | null>(null);
  const [confirmationError, setConfirmationError] =
    useState<AppApiError | null>(null);
  const [isConfirmingRefetch, setIsConfirmingRefetch] = useState(false);
  const [reorderStatus, setReorderStatus] = useState<string>("");
  const [pendingAnnouncement, setPendingAnnouncement] =
    useState<PendingReorderAnnouncement>(null);
  const [lastReorderedAction, setLastReorderedAction] = useState<{
    blockId: string;
    action: "up" | "down";
  } | null>(null);

  const isReorderInFlight = reorderMutation.isPending || isConfirmingRefetch;
  const isSectionSelectionLocked =
    reorderMutation.isPending ||
    isConfirmingRefetch ||
    confirmationError !== null;

  useEffect(() => {
    if (lastReorderedAction && !isReorderInFlight) {
      const btnSelector = `[data-reorder-btn="${lastReorderedAction.blockId}-${lastReorderedAction.action}"]`;
      const btn = document.querySelector<HTMLButtonElement>(btnSelector);
      if (btn && !btn.disabled) {
        btn.focus();
      } else {
        const oppAction = lastReorderedAction.action === "up" ? "down" : "up";
        const oppBtn = document.querySelector<HTMLButtonElement>(
          `[data-reorder-btn="${lastReorderedAction.blockId}-${oppAction}"]`,
        );
        if (oppBtn && !oppBtn.disabled) {
          oppBtn.focus();
        }
      }
    }
  }, [blocks, isReorderInFlight, lastReorderedAction]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AdminContentBlockDto | null>(
    null,
  );
  const [deletingBlock, setDeletingBlock] =
    useState<AdminContentBlockDto | null>(null);

  const handleReorder = (
    reorderedBlocks: AdminContentBlockDto[],
    movedBlock: AdminContentBlockDto,
    direction: "up" | "down",
  ) => {
    if (!blocks || isSectionSelectionLocked) return;

    const items = buildReorderItems(blocks, reorderedBlocks);
    if (!items) {
      setReorderStatus("Unable to prepare content order.");
      return;
    }

    setReorderError(null);
    setConfirmationError(null);
    const label = movedBlock.title || movedBlock.id;
    const currentPending: PendingReorderAnnouncement = {
      spaSectionId: selectedSectionId,
      blockId: movedBlock.id,
      label,
    };
    setPendingAnnouncement(currentPending);
    setLastReorderedAction({ blockId: movedBlock.id, action: direction });

    reorderMutation.mutate(
      { spaSectionId: selectedSectionId, items },
      {
        onSuccess: async () => {
          setIsConfirmingRefetch(true);
          try {
            const refetchResult = await refetchBlocks();
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
              const freshBlocks = refetchResult.data;
              const canonicalIndex = freshBlocks.findIndex(
                (b) => b.id === movedBlock.id,
              );
              if (canonicalIndex >= 0) {
                setReorderStatus(
                  `Moved "${label}" to position ${
                    canonicalIndex + 1
                  } of ${freshBlocks.length}.`,
                );
              } else {
                setReorderStatus("Content order saved.");
              }
              setPendingAnnouncement(null);
              setConfirmationError(null);
            }
          } catch (error: unknown) {
            const normalized = normalizeApiError(error);
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
          setReorderStatus("Could not save content order.");
        },
      },
    );
  };

  const handleRetryConfirmation = async () => {
    if (
      pendingAnnouncement &&
      pendingAnnouncement.spaSectionId !== selectedSectionId
    ) {
      setConfirmationError({
        code: "SECTION_MISMATCH",
        message: "Unable to confirm the saved order for this section.",
      });
      return;
    }

    setIsConfirmingRefetch(true);
    try {
      const refetchResult = await refetchBlocks();
      if (refetchResult.isError || !refetchResult.data) {
        const normalized = normalizeApiError(refetchResult.error);
        setConfirmationError({
          ...normalized,
          message: "Order was saved, but the latest order could not be loaded.",
        });
      } else {
        const freshBlocks = refetchResult.data;
        if (pendingAnnouncement) {
          const canonicalIndex = freshBlocks.findIndex(
            (b) => b.id === pendingAnnouncement.blockId,
          );
          if (canonicalIndex >= 0) {
            setReorderStatus(
              `Moved "${pendingAnnouncement.label}" to position ${
                canonicalIndex + 1
              } of ${freshBlocks.length}.`,
            );
          } else {
            setReorderStatus("Latest content order loaded.");
          }
          setPendingAnnouncement(null);
        } else {
          setReorderStatus("Latest content order loaded.");
        }
        setConfirmationError(null);
      }
    } catch (error: unknown) {
      const normalized = normalizeApiError(error);
      setConfirmationError({
        ...normalized,
        message: "Order was saved, but the latest order could not be loaded.",
      });
    } finally {
      setIsConfirmingRefetch(false);
    }
  };

  return (
    <div className={styles.container}>
      <div aria-live="polite" className={styles.srOnly} role="status">
        {reorderStatus}
      </div>

      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Content Management</h2>
          <p className={styles.subtitle}>
            Manage content blocks and attached media inside public SPA sections.
          </p>
        </div>
      </header>

      {isSectionsLoading && (
        <div className={styles.card}>
          <LoadingSpinner label="Loading SPA sections..." />
        </div>
      )}

      {sectionsError && (
        <div className={styles.card}>
          <ErrorMessage
            error={sectionsError}
            onRetry={() => refetchSections()}
          />
        </div>
      )}

      {!isSectionsLoading &&
        !sectionsError &&
        sections &&
        sections.length === 0 && (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No SPA sections found</h3>
            <p className={styles.emptyDescription}>
              Create a section in Section Management before adding content
              blocks.
            </p>
          </div>
        )}

      {!isSectionsLoading &&
        !sectionsError &&
        sections &&
        sections.length > 0 && (
          <>
            <div className={styles.controlsRow}>
              <div className={styles.selectGroup}>
                <label htmlFor="section-select" className={styles.selectLabel}>
                  Select Section:
                </label>
                <select
                  id="section-select"
                  className={styles.selectInput}
                  value={selectedSectionId}
                  onChange={(e) => handleSelectSection(e.target.value)}
                  disabled={isSectionSelectionLocked}
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.key})
                    </option>
                  ))}
                </select>
              </div>

              <button
                ref={createButtonRef}
                type="button"
                className={styles.createButton}
                onClick={() => setIsCreateOpen(true)}
              >
                Create content block
              </button>
            </div>

            {reorderError && (
              <div className={styles.card}>
                <ErrorMessage
                  error={reorderError}
                  onRetry={() => {
                    setReorderError(null);
                    refetchBlocks();
                  }}
                />
              </div>
            )}

            {confirmationError && (
              <div className={styles.card}>
                <ErrorMessage
                  error={confirmationError}
                  onRetry={handleRetryConfirmation}
                />
              </div>
            )}

            {isBlocksLoading && (
              <div className={styles.card}>
                <LoadingSpinner label="Loading content blocks..." />
              </div>
            )}

            {blocksError && !confirmationError && (
              <div className={styles.card}>
                <ErrorMessage
                  error={blocksError}
                  onRetry={() => refetchBlocks()}
                />
              </div>
            )}

            {!isBlocksLoading &&
              !blocksError &&
              blocks &&
              blocks.length === 0 && (
                <div className={styles.emptyState}>
                  <h3 className={styles.emptyTitle}>
                    No content blocks in this section yet.
                  </h3>
                  <p className={styles.emptyDescription}>
                    Create the first block to populate this section on the
                    public single-page application.
                  </p>
                  <button
                    type="button"
                    className={styles.createButton}
                    onClick={() => setIsCreateOpen(true)}
                  >
                    Create content block
                  </button>
                </div>
              )}

            {!isBlocksLoading &&
              (!blocksError || confirmationError !== null) &&
              blocks &&
              blocks.length === 0 &&
              confirmationError !== null && (
                <div className={styles.emptyState}>
                  <h3 className={styles.emptyTitle}>
                    No content blocks in this section yet.
                  </h3>
                </div>
              )}

            {!isBlocksLoading &&
              (!blocksError || confirmationError !== null) &&
              blocks &&
              blocks.length > 0 && (
                <ContentBlocksList
                  blocks={blocks}
                  onEdit={(block) => setEditingBlock(block)}
                  onDelete={(block) => setDeletingBlock(block)}
                  onReorder={handleReorder}
                  isReordering={isSectionSelectionLocked}
                />
              )}

            <ContentBlockCreateModal
              spaSectionId={selectedSectionId}
              isOpen={isCreateOpen}
              onClose={() => setIsCreateOpen(false)}
            />

            <ContentBlockEditModal
              block={editingBlock}
              sections={sections}
              isOpen={editingBlock !== null}
              onClose={() => setEditingBlock(null)}
            />

            <ContentBlockDeleteModal
              block={deletingBlock}
              spaSectionId={selectedSectionId}
              isOpen={deletingBlock !== null}
              onClose={() => setDeletingBlock(null)}
              fallbackFocusRef={createButtonRef}
            />
          </>
        )}
    </div>
  );
};
