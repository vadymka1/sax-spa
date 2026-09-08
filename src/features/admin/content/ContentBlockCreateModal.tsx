import React, { useRef, useState } from "react";
import {
  ContentBlockType,
  ContentBlockTypeSchema,
  FONT_FAMILY_VALUES,
  FONT_SIZE_VALUES,
  FontFamily,
  FontFamilySchema,
  FontSize,
  FontSizeSchema,
} from "../../../api/types";
import { useAdminDialog } from "../sections/useAdminDialog";
import {
  useCreateContentBlock,
  useCreateYoutubeMedia,
  useUploadImageMedia,
  useUploadVideoMedia,
} from "./contentQueries";
import { validateContentBlockDraft } from "../../../lib/mediaGuards";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import {
  FONT_FAMILY_CLASS,
  FONT_SIZE_CLASS,
  FONT_FAMILY_LABELS,
  FONT_SIZE_LABELS,
} from "../../public-page/typography";
import publicBlockStyles from "../../public-page/blocks/ContentBlock.module.css";
import styles from "./content.module.css";

export interface PendingImageUpload {
  id: string;
  file: File;
  status: "pending" | "uploading" | "uploaded" | "failed";
  mediaId?: string;
  error?: string;
}

function getUploadedMediaIds(uploads: PendingImageUpload[]): string[] {
  const ids: string[] = [];
  for (const item of uploads) {
    if (item.status === "uploaded" && typeof item.mediaId === "string") {
      ids.push(item.mediaId);
    }
  }
  return ids;
}

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
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans");
  const [fontSize, setFontSize] = useState<FontSize>("md");

  // Per-file upload queue for text_image
  const [uploads, setUploads] = useState<PendingImageUpload[]>([]);

  // Single media state for video/youtube
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSubmittingRef = useRef(false);

  const createBlockMutation = useCreateContentBlock();
  const uploadImageMutation = useUploadImageMedia();
  const uploadVideoMutation = useUploadVideoMedia();
  const createYoutubeMutation = useCreateYoutubeMedia();

  const isUploadingAny = uploads.some((u) => u.status === "uploading");
  const hasFailedUploads = uploads.some((u) => u.status === "failed");

  const isSubmitting =
    createBlockMutation.isPending ||
    uploadVideoMutation.isPending ||
    createYoutubeMutation.isPending ||
    isUploadingAny;

  const isCreateDisabled =
    isSubmitting ||
    (blockType === "text_image" && (isUploadingAny || hasFailedUploads));

  const { dialogRef } = useAdminDialog({
    isOpen,
    onClose,
    isSubmitting,
    initialFocusRef: titleInputRef,
  });

  if (!isOpen) {
    return null;
  }

  const uploadSingleFile = async (uploadId: string, file: File) => {
    setUploads((prev) =>
      prev.map((item) =>
        item.id === uploadId
          ? { ...item, status: "uploading", error: undefined }
          : item,
      ),
    );

    try {
      const result = await uploadImageMutation.mutateAsync(file);
      setUploads((prev) =>
        prev.map((item) =>
          item.id === uploadId
            ? {
                ...item,
                status: "uploaded",
                mediaId: result.id,
                error: undefined,
              }
            : item,
        ),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Upload failed. Please retry.";
      setUploads((prev) =>
        prev.map((item) =>
          item.id === uploadId
            ? { ...item, status: "failed", error: message }
            : item,
        ),
      );
    }
  };

  const handleResetAndClose = () => {
    setBlockType("text");
    setTitle("");
    setText("");
    setFontFamily("sans");
    setFontSize("md");
    setUploads([]);
    setMediaFile(null);
    setYoutubeUrl("");
    setFormError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setFormError(null);

    const newItems: PendingImageUpload[] = files.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${file.name}`,
      file,
      status: "uploading" as const,
    }));

    setUploads((prev) => [...prev, ...newItems]);

    newItems.forEach((item) => {
      void uploadSingleFile(item.id, item.file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRetryUpload = (uploadId: string) => {
    const target = uploads.find((u) => u.id === uploadId);
    if (!target || target.status !== "failed") return;
    void uploadSingleFile(target.id, target.file);
  };

  const handleRemoveUpload = (uploadId: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
  };

  const handleMoveUploadUp = (index: number) => {
    if (index <= 0) return;
    setUploads((prev) => {
      const next = [...prev];
      const item = next.splice(index, 1)[0];
      if (item) next.splice(index - 1, 0, item);
      return next;
    });
  };

  const handleMoveUploadDown = (index: number) => {
    setUploads((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const item = next.splice(index, 1)[0];
      if (item) next.splice(index + 1, 0, item);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isCreateDisabled || isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setFormError(null);

    if (!text.trim()) {
      setFormError("Text content is required.");
      isSubmittingRef.current = false;
      return;
    }

    const primaryFile =
      blockType === "text_image" ? uploads[0]?.file || null : mediaFile;

    const uploadedMediaIds =
      blockType === "text_image" ? getUploadedMediaIds(uploads) : [];

    const validationError = validateContentBlockDraft({
      blockType,
      newFile: primaryFile,
      attachedMediaIds:
        blockType === "text_image" && uploads.length > 0
          ? uploadedMediaIds
          : undefined,
      youtubeUrl,
      isEdit: false,
    });

    if (validationError) {
      setFormError(validationError);
      isSubmittingRef.current = false;
      return;
    }

    if (blockType === "text_image") {
      if (isUploadingAny) {
        setFormError("Please wait for all images to finish uploading.");
        isSubmittingRef.current = false;
        return;
      }
      if (hasFailedUploads) {
        setFormError(
          "Please retry or remove failed image uploads before creating.",
        );
        isSubmittingRef.current = false;
        return;
      }

      if (uploadedMediaIds.length === 0) {
        setFormError("An image file is required for Text + Image blocks.");
        isSubmittingRef.current = false;
        return;
      }
    }

    try {
      const payload: {
        spa_section_id: string;
        block_type: ContentBlockType;
        title?: string;
        text: string;
        media_id?: string;
        media_ids?: string[];
        font_family?: FontFamily;
        font_size?: FontSize;
      } = {
        spa_section_id: spaSectionId,
        block_type: blockType,
        title: title.trim() || undefined,
        text,
      };

      if (blockType === "text_image") {
        payload.media_ids = uploadedMediaIds;
        // Canonical contract: media_ids is used, legacy media_id is omitted.
      } else if (blockType === "text_video" && mediaFile) {
        const mediaResult = await uploadVideoMutation.mutateAsync(mediaFile);
        payload.media_id = mediaResult.id;
      } else if (blockType === "text_youtube" && youtubeUrl.trim()) {
        const youtubeResult = await createYoutubeMutation.mutateAsync({
          youtube_url: youtubeUrl.trim(),
        });
        payload.media_id = youtubeResult.id;
      }

      if (fontFamily !== "sans") {
        payload.font_family = fontFamily;
      }
      if (fontSize !== "md") {
        payload.font_size = fontSize;
      }

      await createBlockMutation.mutateAsync(payload);
      handleResetAndClose();
    } catch {
      // Errors handled by mutation state / displayed in UI
    } finally {
      isSubmittingRef.current = false;
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
                onChange={(e) => {
                  const parsed = ContentBlockTypeSchema.safeParse(
                    e.target.value,
                  );
                  if (parsed.success) {
                    setBlockType(parsed.data);
                  }
                }}
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

            {/* Typography Controls */}
            <div className={styles.formGroup}>
              <div className={styles.typographyGrid}>
                <div>
                  <label htmlFor="create-font-family" className={styles.label}>
                    Font Family
                  </label>
                  <select
                    id="create-font-family"
                    className={styles.select}
                    value={fontFamily}
                    onChange={(e) => {
                      const parsed = FontFamilySchema.safeParse(e.target.value);
                      if (parsed.success) {
                        setFontFamily(parsed.data);
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    {FONT_FAMILY_VALUES.map((f) => (
                      <option key={f} value={f}>
                        {FONT_FAMILY_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="create-font-size" className={styles.label}>
                    Font Size
                  </label>
                  <select
                    id="create-font-size"
                    className={styles.select}
                    value={fontSize}
                    onChange={(e) => {
                      const parsed = FontSizeSchema.safeParse(e.target.value);
                      if (parsed.success) {
                        setFontSize(parsed.data);
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    {FONT_SIZE_VALUES.map((s) => (
                      <option key={s} value={s}>
                        {FONT_SIZE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Typography Preview */}
              <div className={styles.typographyPreview}>
                <span className={styles.previewLabel}>Typography Preview</span>
                <p
                  className={`${publicBlockStyles.blockText} ${FONT_FAMILY_CLASS[fontFamily]} ${FONT_SIZE_CLASS[fontSize]}`}
                  style={{ margin: 0 }}
                >
                  {text.trim()
                    ? text
                    : "The quick brown fox jumps over the lazy dog. 0123456789."}
                </p>
              </div>
            </div>

            {blockType === "text_image" && (
              <div className={styles.formGroup}>
                <label htmlFor="create-block-file" className={styles.label}>
                  Upload Image File
                </label>
                <input
                  ref={fileInputRef}
                  id="create-block-file"
                  type="file"
                  multiple
                  className={styles.fileInput}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  disabled={isSubmitting}
                />
                <p className={styles.helperText}>
                  Select one or multiple images to attach to this block.
                </p>

                {uploads.length > 0 && (
                  <div className={styles.mediaQueue}>
                    <span
                      className={styles.label}
                      style={{ fontSize: "0.8rem" }}
                    >
                      Selected Images ({uploads.length})
                    </span>
                    {uploads.map((item, idx) => (
                      <div key={item.id} className={styles.mediaQueueItem}>
                        <div className={styles.mediaQueueInfo}>
                          <span className={styles.mediaQueueIndex}>
                            {idx + 1}
                          </span>
                          <span>{item.file.name}</span>
                          {item.status === "uploading" && (
                            <span className={styles.statusBadgeUploading}>
                              Uploading...
                            </span>
                          )}
                          {item.status === "uploaded" && (
                            <span className={styles.statusBadgeUploaded}>
                              Uploaded
                            </span>
                          )}
                          {item.status === "failed" && (
                            <span className={styles.statusBadgeFailed}>
                              Upload failed
                              {item.error ? `: ${item.error}` : ""}
                            </span>
                          )}
                        </div>
                        <div className={styles.mediaQueueActions}>
                          {uploads.length > 1 && (
                            <>
                              <button
                                type="button"
                                className={styles.miniButton}
                                onClick={() => handleMoveUploadUp(idx)}
                                disabled={idx === 0 || isSubmitting}
                                aria-label={`Move ${item.file.name} up`}
                              >
                                &uarr;
                              </button>
                              <button
                                type="button"
                                className={styles.miniButton}
                                onClick={() => handleMoveUploadDown(idx)}
                                disabled={
                                  idx === uploads.length - 1 || isSubmitting
                                }
                                aria-label={`Move ${item.file.name} down`}
                              >
                                &darr;
                              </button>
                            </>
                          )}
                          {item.status === "failed" && (
                            <button
                              type="button"
                              className={styles.retryButton}
                              onClick={() => handleRetryUpload(item.id)}
                              disabled={isSubmitting}
                              aria-label={`Retry ${item.file.name}`}
                            >
                              Retry
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.miniDangerButton}
                            onClick={() => handleRemoveUpload(item.id)}
                            disabled={isSubmitting}
                            aria-label={`Remove ${item.file.name}`}
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {blockType === "text_video" && (
              <div className={styles.formGroup}>
                <label htmlFor="create-block-file" className={styles.label}>
                  Upload Video File
                </label>
                <input
                  id="create-block-file"
                  type="file"
                  className={styles.fileInput}
                  accept="video/*"
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
              disabled={isCreateDisabled}
              aria-label="Create Block"
            >
              {createBlockMutation.isPending
                ? "Creating..."
                : isUploadingAny
                  ? "Uploading media..."
                  : "Create Block"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
