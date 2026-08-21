import React, { useEffect, useRef, useState } from "react";
import {
  AdminContentBlockDto,
  AdminSpaSectionDto,
  ContentBlockType,
} from "../../../api/types";
import { useAdminDialog } from "../sections/useAdminDialog";
import {
  useCreateYoutubeMedia,
  useUpdateContentBlock,
  useUploadImageMedia,
  useUploadVideoMedia,
} from "./contentQueries";
import { validateContentBlockDraft } from "../../../lib/mediaGuards";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./content.module.css";

interface ContentBlockEditModalProps {
  block: AdminContentBlockDto | null;
  sections: AdminSpaSectionDto[];
  isOpen: boolean;
  onClose: () => void;
}

export const ContentBlockEditModal: React.FC<ContentBlockEditModalProps> = ({
  block,
  sections,
  isOpen,
  onClose,
}) => {
  const [spaSectionId, setSpaSectionId] = useState("");
  const [blockType, setBlockType] = useState<ContentBlockType>("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const updateBlockMutation = useUpdateContentBlock();
  const uploadImageMutation = useUploadImageMedia();
  const uploadVideoMutation = useUploadVideoMedia();
  const createYoutubeMutation = useCreateYoutubeMedia();

  useEffect(() => {
    if (block) {
      setSpaSectionId(block.spa_section_id);
      setBlockType(block.block_type);
      setTitle(block.title || "");
      setText(block.text);
      setMediaFile(null);
      setYoutubeUrl("");
      setFormError(null);
    }
  }, [block]);

  const isSubmitting =
    updateBlockMutation.isPending ||
    uploadImageMutation.isPending ||
    uploadVideoMutation.isPending ||
    createYoutubeMutation.isPending;

  const { dialogRef } = useAdminDialog({
    isOpen: isOpen && block !== null,
    onClose,
    isSubmitting,
    initialFocusRef: titleInputRef,
  });

  if (!isOpen || !block) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }
    setFormError(null);

    if (!text.trim()) {
      setFormError("Text content is required.");
      return;
    }

    const validationError = validateContentBlockDraft({
      blockType,
      existingMedia: block.media,
      newFile: mediaFile,
      youtubeUrl,
      isEdit: true,
    });

    if (validationError) {
      setFormError(validationError);
      return;
    }

    let updatedMediaId: string | null | undefined = undefined;

    try {
      if (blockType === "text_image" && mediaFile) {
        const mediaResult = await uploadImageMutation.mutateAsync(mediaFile);
        updatedMediaId = mediaResult.id;
      } else if (blockType === "text_video" && mediaFile) {
        const mediaResult = await uploadVideoMutation.mutateAsync(mediaFile);
        updatedMediaId = mediaResult.id;
      } else if (blockType === "text_youtube" && youtubeUrl.trim()) {
        const youtubeResult = await createYoutubeMutation.mutateAsync({
          youtube_url: youtubeUrl.trim(),
        });
        updatedMediaId = youtubeResult.id;
      } else if (blockType === "text" && block.media) {
        // Detach media explicitly when type converted to text
        updatedMediaId = null;
      }

      await updateBlockMutation.mutateAsync({
        id: block.id,
        sourceSpaSectionId: block.spa_section_id,
        payload: {
          spa_section_id:
            spaSectionId !== block.spa_section_id ? spaSectionId : undefined,
          block_type: blockType !== block.block_type ? blockType : undefined,
          title: title.trim() || undefined,
          text,
          media_id: updatedMediaId,
        },
      });

      onClose();
    } catch {
      // Errors caught by mutation state
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-block-modal-title"
    >
      <div ref={dialogRef} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 id="edit-block-modal-title" className={styles.modalTitle}>
            Edit Content Block
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {formError && (
              <p style={{ color: "#dc2626", margin: 0 }}>{formError}</p>
            )}
            {uploadImageMutation.error && (
              <ErrorMessage error={uploadImageMutation.error} />
            )}
            {uploadVideoMutation.error && (
              <ErrorMessage error={uploadVideoMutation.error} />
            )}
            {createYoutubeMutation.error && (
              <ErrorMessage error={createYoutubeMutation.error} />
            )}
            {updateBlockMutation.error && (
              <ErrorMessage error={updateBlockMutation.error} />
            )}

            <div className={styles.formGroup}>
              <label htmlFor="edit-section-select" className={styles.label}>
                Section
              </label>
              <select
                id="edit-section-select"
                className={styles.select}
                value={spaSectionId}
                onChange={(e) => setSpaSectionId(e.target.value)}
                disabled={isSubmitting}
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.key})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-block-type-select" className={styles.label}>
                Block Type
              </label>
              <select
                id="edit-block-type-select"
                className={styles.select}
                value={blockType}
                onChange={(e) =>
                  setBlockType(e.target.value as ContentBlockType)
                }
                disabled={isSubmitting}
              >
                <option value="text">Text Only</option>
                <option value="text_image">Text + Image</option>
                <option value="text_video">Text + Video</option>
                <option value="text_youtube">Text + YouTube</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-block-title" className={styles.label}>
                Title (Optional)
              </label>
              <input
                ref={titleInputRef}
                id="edit-block-title"
                type="text"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-block-text" className={styles.label}>
                Text Content *
              </label>
              <textarea
                id="edit-block-text"
                className={styles.textarea}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            {(blockType === "text_image" || blockType === "text_video") && (
              <div className={styles.formGroup}>
                <label htmlFor="edit-block-file" className={styles.label}>
                  Replace {blockType === "text_image" ? "Image" : "Video"} File
                </label>
                <input
                  id="edit-block-file"
                  type="file"
                  className={styles.fileInput}
                  accept={blockType === "text_image" ? "image/*" : "video/*"}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setMediaFile(file);
                  }}
                  disabled={isSubmitting}
                />
                {block.media && !mediaFile && (
                  <p className={styles.helperText}>
                    Currently attached:{" "}
                    {block.media.original_filename || block.media.id}
                  </p>
                )}
              </div>
            )}

            {blockType === "text_youtube" && (
              <div className={styles.formGroup}>
                <label htmlFor="edit-block-youtube" className={styles.label}>
                  Replace YouTube Video URL or ID
                </label>
                <input
                  id="edit-block-youtube"
                  type="text"
                  className={styles.input}
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={
                    block.media?.youtube_url ||
                    "https://www.youtube.com/watch?v=..."
                  }
                />
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
