import React from "react";
import { AdminContentBlockDto, ContentBlockType } from "../../../api/types";
import styles from "./content.module.css";

interface ContentBlocksListProps {
  blocks: AdminContentBlockDto[];
  onEdit: (block: AdminContentBlockDto) => void;
  onDelete: (block: AdminContentBlockDto) => void;
  onReorder: (
    reorderedBlocks: AdminContentBlockDto[],
    movedBlock: AdminContentBlockDto,
    direction: "up" | "down",
  ) => void;
  isReordering?: boolean;
}

const TYPE_LABELS: Record<ContentBlockType, string> = {
  text: "Text",
  text_image: "Text + Image",
  text_video: "Text + Video",
  text_youtube: "Text + YouTube",
};

export const ContentBlocksList: React.FC<ContentBlocksListProps> = ({
  blocks,
  onEdit,
  onDelete,
  onReorder,
  isReordering = false,
}) => {
  const handleMoveUp = (index: number) => {
    if (index <= 0 || isReordering) return;
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(index, 1);
    if (!movedBlock) return;
    newBlocks.splice(index - 1, 0, movedBlock);
    onReorder(newBlocks, movedBlock, "up");
  };

  const handleMoveDown = (index: number) => {
    if (index >= blocks.length - 1 || isReordering) return;
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(index, 1);
    if (!movedBlock) return;
    newBlocks.splice(index + 1, 0, movedBlock);
    onReorder(newBlocks, movedBlock, "down");
  };

  return (
    <div className={styles.blocksGrid}>
      {blocks.map((block, index) => {
        const typeLabel = TYPE_LABELS[block.block_type] || block.block_type;
        const accessibleBlockName = block.title || `${typeLabel} block`;

        const isFirst = index === 0;
        const isLast = index === blocks.length - 1;
        const isSingle = blocks.length <= 1;

        return (
          <div key={block.id} className={styles.blockCard}>
            <div className={styles.blockHeader}>
              <div className={styles.blockTitleArea}>
                <span className={styles.typeBadge}>{typeLabel}</span>
                <span className={styles.positionBadge}>
                  Position {index + 1} of {blocks.length}
                </span>
                <h3 className={styles.blockTitle}>
                  {block.title || `(Untitled Block)`}
                </h3>
              </div>
              <span className={styles.orderBadge}>
                Order: #{block.sort_order}
              </span>
            </div>

            <p className={styles.textPreview}>{block.text}</p>

            {(() => {
              const mediaList = Array.isArray(block.media)
                ? block.media
                : block.media
                  ? [block.media]
                  : [];
              const first = mediaList[0];
              if (!first) return null;
              return (
                <div className={styles.mediaSummary}>
                  <strong>Media ({first.media_type}):</strong>{" "}
                  {mediaList.length > 1
                    ? `${mediaList.length} files attached`
                    : first.original_filename || first.youtube_url || first.id}
                  {mediaList.length === 1 &&
                    first.mime_type &&
                    ` [${first.mime_type}]`}
                </div>
              );
            })()}

            <div className={styles.actions}>
              <div className={styles.reorderControls}>
                <button
                  type="button"
                  className={styles.reorderButton}
                  onClick={() => handleMoveUp(index)}
                  disabled={isReordering || isFirst || isSingle}
                  aria-label={`Move "${accessibleBlockName}" up`}
                  data-reorder-btn={`${block.id}-up`}
                >
                  ▲ Move up
                </button>
                <button
                  type="button"
                  className={styles.reorderButton}
                  onClick={() => handleMoveDown(index)}
                  disabled={isReordering || isLast || isSingle}
                  aria-label={`Move "${accessibleBlockName}" down`}
                  data-reorder-btn={`${block.id}-down`}
                >
                  ▼ Move down
                </button>
              </div>

              <div className={styles.crudControls}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => onEdit(block)}
                  aria-label={`Edit block ${block.title || block.id}`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => onDelete(block)}
                  aria-label={`Delete block ${block.title || block.id}`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
