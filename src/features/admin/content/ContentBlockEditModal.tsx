import React, { useEffect, useRef, useState } from "react";
import {
  AdminContentBlockDto,
  AdminSpaSectionDto,
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
  useCreateYoutubeMedia,
  useUpdateContentBlock,
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

interface ContentBlockEditModalProps {
  block: AdminContentBlockDto | null;
  sections: AdminSpaSectionDto[];
  isOpen: boolean;
  onClose: () => void;
}

interface AttachedImageItem {
  id: string;
  filename: string;
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
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans");
  const [fontSize, setFontSize] = useState<FontSize>("md");

  // Multi-image state for text_image
  const [attachedImages, setAttachedImages] = useState<AttachedImageItem[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Single media state for video/youtube
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      setFontFamily(block.font_family || "sans");
      setFontSize(block.font_size || "md");

      const mediaList = Array.isArray(block.media)
        ? block.media
        : block.media
          ? [block.media]
          : [];
      const images: AttachedImageItem[] = mediaList
        .filter((m) => m.media_type === "image")
        .map((m) => ({
          id: m.id,
          filename: m.original_filename || m.stored_filename || m.id,
        }));
      setAttachedImages(images);

      setMediaFile(null);
      setYoutubeUrl("");
      setFormError(null);
      setUploadError(null);
    }
  }, [block]);

  const isSubmitting =
    updateBlockMutation.isPending ||
    uploadImageMutation.isPending ||
    uploadVideoMutation.isPending ||
    createYoutubeMutation.isPending ||
    isUploadingFiles;

  const { dialogRef } = useAdminDialog({
    isOpen: isOpen && block !== null,
    onClose,
    isSubmitting,
    initialFocusRef: titleInputRef,
  });

  if (!isOpen || !block) {
    return null;
  }

  const handleMultiImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFiles(true);
    setUploadError(null);

    const newlyUploaded: AttachedImageItem[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name}: not an image`);
        continue;
      }

      try {
        const result = await uploadImageMutation.mutateAsync(file);
        newlyUploaded.push({
          id: result.id,
          filename: file.name,
        });
      } catch {
        errors.push(`${file.name}: upload failed`);
      }
    }

    if (newlyUploaded.length > 0) {
      setAttachedImages((prev) => [...prev, ...newlyUploaded]);
    }

    if (errors.length > 0) {
      setUploadError(errors.join(", "));
    }

    setIsUploadingFiles(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMoveImageUp = (index: number) => {
    if (index <= 0) return;
    setAttachedImages((prev) => {
      const next = [...prev];
      const item = next.splice(index, 1)[0];
      if (item) {
        next.splice(index - 1, 0, item);
      }
      return next;
    });
  };

  const handleMoveImageDown = (index: number) => {
    setAttachedImages((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const item = next.splice(index, 1)[0];
      if (item) {
        next.splice(index + 1, 0, item);
      }
      return next;
    });
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
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
      existingMedia: block.media,
      newFile: blockType === "text_image" ? null : mediaFile,
      attachedMediaIds:
        blockType === "text_image"
          ? attachedImages.map((img) => img.id)
          : undefined,
      youtubeUrl,
      isEdit: true,
    });

    if (validationError) {
      setFormError(validationError);
      return;
    }

    let updatedMediaId: string | null | undefined = undefined;

    try {
      if (blockType === "text_video" && mediaFile) {
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

      const payload: {
        spa_section_id?: string;
        block_type?: ContentBlockType;
        title?: string;
        text: string;
        media_id?: string | null;
        media_ids?: string[];
        font_family?: FontFamily;
        font_size?: FontSize;
      } = {
        spa_section_id:
          spaSectionId !== block.spa_section_id ? spaSectionId : undefined,
        block_type: blockType !== block.block_type ? blockType : undefined,
        title: title.trim() || undefined,
        text,
      };

      if (blockType === "text_image") {
        payload.media_ids = attachedImages.map((img) => img.id);
      } else if (blockType === "text" && block.media) {
        payload.media_id = null;
      } else if (updatedMediaId !== undefined) {
        payload.media_id = updatedMediaId;
      }

      if (fontFamily !== (block.font_family || "sans")) {
        payload.font_family = fontFamily;
      }
      if (fontSize !== (block.font_size || "md")) {
        payload.font_size = fontSize;
      }

      await updateBlockMutation.mutateAsync({
        id: block.id,
        sourceSpaSectionId: block.spa_section_id,
        payload,
      });

      onClose();
    } catch {
      // Errors handled by mutation state / displayed in UI
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
            {uploadError && (
              <p style={{ color: "#dc2626", margin: 0 }}>{uploadError}</p>
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
              <label htmlFor="edit-block-section" className={styles.label}>
                Section
              </label>
              <select
                id="edit-block-section"
                className={styles.select}
                value={spaSectionId}
                onChange={(e) => setSpaSectionId(e.target.value)}
                disabled={isSubmitting}
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title} ({section.key})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="edit-block-type" className={styles.label}>
                Block Type
              </label>
              <select
                id="edit-block-type"
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
                placeholder="e.g. Festival Highlights"
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
                placeholder="Enter block paragraph content..."
              />
            </div>

            {/* Typography Controls */}
            <div className={styles.formGroup}>
              <div className={styles.typographyGrid}>
                <div>
                  <label htmlFor="edit-font-family" className={styles.label}>
                    Font Family
                  </label>
                  <select
                    id="edit-font-family"
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
                  <label htmlFor="edit-font-size" className={styles.label}>
                    Font Size
                  </label>
                  <select
                    id="edit-font-size"
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
                <label htmlFor="edit-block-images" className={styles.label}>
                  Attach Additional Images
                </label>
                <input
                  ref={fileInputRef}
                  id="edit-block-images"
                  type="file"
                  multiple
                  className={styles.fileInput}
                  accept="image/*"
                  onChange={handleMultiImageSelect}
                  disabled={isSubmitting}
                />
                <p className={styles.helperText}>
                  {isUploadingFiles
                    ? "Uploading selected image(s)..."
                    : "Select one or multiple images to attach to this block."}
                </p>

                {attachedImages.length > 0 && (
                  <div className={styles.mediaQueue}>
                    <span
                      className={styles.label}
                      style={{ fontSize: "0.8rem" }}
                    >
                      Attached Images ({attachedImages.length})
                    </span>
                    {attachedImages.map((img, idx) => (
                      <div key={img.id} className={styles.mediaQueueItem}>
                        <div className={styles.mediaQueueInfo}>
                          <span className={styles.mediaQueueIndex}>
                            {idx + 1}
                          </span>
                          <span>{img.filename}</span>
                        </div>
                        <div className={styles.mediaQueueActions}>
                          <button
                            type="button"
                            className={styles.miniButton}
                            onClick={() => handleMoveImageUp(idx)}
                            disabled={idx === 0 || isSubmitting}
                            aria-label={`Move ${img.filename} up`}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className={styles.miniButton}
                            onClick={() => handleMoveImageDown(idx)}
                            disabled={
                              idx === attachedImages.length - 1 || isSubmitting
                            }
                            aria-label={`Move ${img.filename} down`}
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className={styles.miniDangerButton}
                            onClick={() => handleRemoveImage(idx)}
                            disabled={isSubmitting}
                            aria-label={`Remove ${img.filename}`}
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
                <label htmlFor="edit-block-file" className={styles.label}>
                  Replace Video File
                </label>
                <input
                  id="edit-block-file"
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
                  Leave blank to keep existing video attachment.
                </p>
              </div>
            )}

            {blockType === "text_youtube" && (
              <div className={styles.formGroup}>
                <label htmlFor="edit-block-youtube" className={styles.label}>
                  Update YouTube URL or ID (Optional)
                </label>
                <input
                  id="edit-block-youtube"
                  type="text"
                  className={styles.input}
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Leave blank to keep existing YouTube video"
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
