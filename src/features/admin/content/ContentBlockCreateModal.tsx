import React, { useRef, useState } from "react";
import { ContentBlockType } from "../../../api/types";
import { useAdminDialog } from "../sections/useAdminDialog";
import {
  useCreateContentBlock,
  useCreateYoutubeMedia,
  useUploadImageMedia,
  useUploadVideoMedia,
} from "./contentQueries";
import { validateContentBlockDraft } from "../../../lib/mediaGuards";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./content.module.css";

interface ContentBlockCreateModalProps {
  spaSectionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ContentBlockCreateModal: React.FC<
  ContentBlockCreateModalProps
> = ({ spaSectionId, isOpen, onClose }) => {
  const [blockType, setBlockType] = useState<ContentBlockType>("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const createBlockMutation = useCreateContentBlock();
  const uploadImageMutation = useUploadImageMedia();
  const uploadVideoMutation = useUploadVideoMedia();
  const createYoutubeMutation = useCreateYoutubeMedia();

  const isSubmitting =
    createBlockMutation.isPending ||
    uploadImageMutation.isPending ||
    uploadVideoMutation.isPending ||
    createYoutubeMutation.isPending;

  const { dialogRef } = useAdminDialog({
    isOpen,
    onClose,
    isSubmitting,
    initialFocusRef: titleInputRef,
  });

  if (!isOpen) {
    return null;
  }

  const handleResetAndClose = () => {
    setBlockType("text");
    setTitle("");
    setText("");
    setMediaFile(null);
    setYoutubeUrl("");
    setFormError(null);
    onClose();
  };

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
      newFile: mediaFile,
      youtubeUrl,
      isEdit: false,
    });

    if (validationError) {
      setFormError(validationError);
      return;
    }

    let uploadedMediaId: string | undefined = undefined;

    try {
      if (blockType === "text_image" && mediaFile) {
        const mediaResult = await uploadImageMutation.mutateAsync(mediaFile);
        uploadedMediaId = mediaResult.id;
      } else if (blockType === "text_video" && mediaFile) {
        const mediaResult = await uploadVideoMutation.mutateAsync(mediaFile);
        uploadedMediaId = mediaResult.id;
      } else if (blockType === "text_youtube" && youtubeUrl.trim()) {
        const youtubeResult = await createYoutubeMutation.mutateAsync({
          youtube_url: youtubeUrl.trim(),
        });
        uploadedMediaId = youtubeResult.id;
      }

      await createBlockMutation.mutateAsync({
        spa_section_id: spaSectionId,
        block_type: blockType,
        title: title.trim() || undefined,
        text,
        media_id: uploadedMediaId,
      });

      handleResetAndClose();
    } catch {
      // Errors handled by mutation state / displayed in UI
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-block-modal-title"
    >
      <div ref={dialogRef} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 id="create-block-modal-title" className={styles.modalTitle}>
            Create Content Block
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleResetAndClose}
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
            {createBlockMutation.error && (
              <ErrorMessage error={createBlockMutation.error} />
            )}

            <div className={styles.formGroup}>
              <label htmlFor="block-type-select" className={styles.label}>
                Block Type
              </label>
              <select
                id="block-type-select"
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
              <label htmlFor="create-block-title" className={styles.label}>
                Title (Optional)
              </label>
              <input
                ref={titleInputRef}
                id="create-block-title"
                type="text"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. Festival Highlights"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="create-block-text" className={styles.label}>
                Text Content *
              </label>
              <textarea
                id="create-block-text"
                className={styles.textarea}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isSubmitting}
                required
                placeholder="Enter block paragraph content..."
              />
            </div>

            {(blockType === "text_image" || blockType === "text_video") && (
              <div className={styles.formGroup}>
                <label htmlFor="create-block-file" className={styles.label}>
                  Upload {blockType === "text_image" ? "Image" : "Video"} File
                </label>
                <input
                  id="create-block-file"
                  type="file"
                  className={styles.fileInput}
                  accept={blockType === "text_image" ? "image/*" : "video/*"}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setMediaFile(file);
                  }}
                  disabled={isSubmitting}
                />
                <p className={styles.helperText}>
                  File will be uploaded to backend media storage.
                </p>
              </div>
            )}

            {blockType === "text_youtube" && (
              <div className={styles.formGroup}>
                <label htmlFor="create-block-youtube" className={styles.label}>
                  YouTube Video URL or ID
                </label>
                <input
                  id="create-block-youtube"
                  type="text"
                  className={styles.input}
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleResetAndClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Block"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
