import React, { useRef, useState } from "react";
import { useCreateTestimonial } from "./testimonialQueries";
import { useUploadImageMedia } from "../content/contentQueries";
import { useAdminDialog } from "../sections/useAdminDialog";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./testimonials.module.css";

interface TestimonialCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AvatarUploadState {
  file: File;
  previewUrl: string;
  status: "uploading" | "uploaded" | "failed";
  mediaId?: string;
  error?: string;
}

export const TestimonialCreateModal: React.FC<TestimonialCreateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [text, setText] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [avatarUpload, setAvatarUpload] = useState<AvatarUploadState | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const authorNameInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSubmittingRef = useRef(false);

  const createMutation = useCreateTestimonial();
  const uploadImageMutation = useUploadImageMedia();

  const isUploading = avatarUpload?.status === "uploading";
  const isSubmitting = createMutation.isPending || isUploading;
  const isCreateDisabled = isSubmitting || avatarUpload?.status === "failed";

  const { dialogRef } = useAdminDialog({
    isOpen,
    onClose,
    isSubmitting,
    initialFocusRef: authorNameInputRef,
  });

  if (!isOpen) {
    return null;
  }

  const handleResetAndClose = () => {
    if (isSubmitting) return;
    setAuthorName("");
    setAuthorRole("");
    setText("");
    setIsVisible(true);
    setAvatarUpload(null);
    setFormError(null);
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select a valid image file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFormError(null);
    const previewUrl =
      typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(file)
        : "";
    const currentUpload: AvatarUploadState = {
      file,
      previewUrl,
      status: "uploading",
    };
    setAvatarUpload(currentUpload);

    try {
      const result = await uploadImageMutation.mutateAsync(file);
      setAvatarUpload((prev) =>
        prev
          ? {
              ...prev,
              status: "uploaded",
              mediaId: result.id,
            }
          : null,
      );
    } catch {
      setAvatarUpload((prev) =>
        prev
          ? {
              ...prev,
              status: "failed",
              error: "Upload failed. Please retry or remove.",
            }
          : null,
      );
    }
  };

  const handleRetryUpload = async () => {
    if (!avatarUpload || avatarUpload.status !== "failed" || isSubmitting) {
      return;
    }
    setFormError(null);
    setAvatarUpload((prev) =>
      prev
        ? {
            ...prev,
            status: "uploading",
            error: undefined,
          }
        : null,
    );

    try {
      const result = await uploadImageMutation.mutateAsync(avatarUpload.file);
      setAvatarUpload((prev) =>
        prev
          ? {
              ...prev,
              status: "uploaded",
              mediaId: result.id,
            }
          : null,
      );
    } catch {
      setAvatarUpload((prev) =>
        prev
          ? {
              ...prev,
              status: "failed",
              error: "Upload failed. Please retry or remove.",
            }
          : null,
      );
    }
  };

  const handleRemoveAvatar = () => {
    if (isSubmitting) return;
    setAvatarUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isSubmittingRef.current) return;

    const trimmedName = authorName.trim();
    const trimmedRole = authorRole.trim();
    const trimmedText = text.trim();

    if (!trimmedName) {
      setFormError("Author name is required.");
      return;
    }
    if (trimmedName.length > 120) {
      setFormError("Author name must not exceed 120 characters.");
      return;
    }
    if (trimmedRole.length > 160) {
      setFormError("Author role must not exceed 160 characters.");
      return;
    }
    if (!trimmedText) {
      setFormError("Review text is required.");
      return;
    }
    if (trimmedText.length > 3000) {
      setFormError("Review text must not exceed 3000 characters.");
      return;
    }

    if (avatarUpload && avatarUpload.status === "failed") {
      setFormError("Please retry or remove the failed avatar upload.");
      return;
    }

    setFormError(null);
    isSubmittingRef.current = true;

    try {
      await createMutation.mutateAsync({
        author_name: trimmedName,
        author_role: trimmedRole || null,
        text: trimmedText,
        avatar_media_id: avatarUpload?.mediaId ?? null,
        is_visible: isVisible,
      });

      handleResetAndClose();
    } catch {
      // Error handled by ErrorMessage display
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-testimonial-title"
      >
        <div className={styles.modalHeader}>
          <h3 id="create-testimonial-title" className={styles.modalTitle}>
            Add Testimonial
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

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.modalBody}>
            {formError && (
              <p style={{ color: "#dc2626", margin: 0, fontSize: "0.9rem" }}>
                {formError}
              </p>
            )}
            {createMutation.error && (
              <ErrorMessage error={createMutation.error} />
            )}
            {uploadImageMutation.error && (
              <ErrorMessage error={uploadImageMutation.error} />
            )}

            <div className={styles.formGroup}>
              <label htmlFor="testimonial-author-name" className={styles.label}>
                Author Name *
              </label>
              <input
                ref={authorNameInputRef}
                id="testimonial-author-name"
                type="text"
                className={styles.input}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. John Coltrane"
                maxLength={120}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="testimonial-author-role" className={styles.label}>
                Author Role / Affiliation
              </label>
              <input
                id="testimonial-author-role"
                type="text"
                className={styles.input}
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="e.g. Principal Saxophonist, Berlin Philharmonic"
                maxLength={160}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="testimonial-text" className={styles.label}>
                Review Text *
              </label>
              <textarea
                id="testimonial-text"
                className={styles.textarea}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter quote or review text..."
                maxLength={3000}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="testimonial-avatar-file" className={styles.label}>
                Avatar Image
              </label>
              <input
                ref={fileInputRef}
                id="testimonial-avatar-file"
                type="file"
                className={styles.fileInput}
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isSubmitting}
              />
              <p className={styles.helperText}>
                Upload a single square or portrait photo.
              </p>

              {avatarUpload && (
                <div className={styles.avatarItemCard}>
                  <div className={styles.avatarItemInfo}>
                    <img
                      src={avatarUpload.previewUrl}
                      alt="Avatar preview"
                      className={styles.avatarItemThumbnail}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-admin-text)",
                        }}
                      >
                        {avatarUpload.file.name}
                      </span>
                      {avatarUpload.status === "uploading" && (
                        <span className={styles.statusBadgeUploading}>
                          Uploading...
                        </span>
                      )}
                      {avatarUpload.status === "uploaded" && (
                        <span className={styles.statusBadgeUploaded}>
                          Uploaded
                        </span>
                      )}
                      {avatarUpload.status === "failed" && (
                        <span className={styles.statusBadgeFailed}>
                          {avatarUpload.error || "Upload failed"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.avatarActions}>
                    {avatarUpload.status === "failed" && (
                      <button
                        type="button"
                        className={styles.retryButton}
                        onClick={handleRetryUpload}
                        disabled={isSubmitting}
                        aria-label="Retry upload"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.miniDangerButton}
                      onClick={handleRemoveAvatar}
                      disabled={isSubmitting}
                      aria-label="Remove avatar"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span>Visible on public site</span>
              </label>
            </div>
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
              aria-label="Create Testimonial"
            >
              {createMutation.isPending
                ? "Creating..."
                : isUploading
                  ? "Uploading avatar..."
                  : "Create Testimonial"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
