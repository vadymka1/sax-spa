import React, { useEffect, useRef, useState } from "react";
import { AdminTestimonialDto } from "../../../api/types";
import { useUpdateTestimonial } from "./testimonialQueries";
import { useUploadImageMedia } from "../content/contentQueries";
import { useAdminDialog } from "../sections/useAdminDialog";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./testimonials.module.css";

interface TestimonialEditModalProps {
  testimonial: AdminTestimonialDto | null;
  isOpen: boolean;
  onClose: () => void;
}

interface NewAvatarUploadState {
  file: File;
  previewUrl: string;
  status: "uploading" | "uploaded" | "failed";
  mediaId?: string;
  error?: string;
}

export const TestimonialEditModal: React.FC<TestimonialEditModalProps> = ({
  testimonial,
  isOpen,
  onClose,
}) => {
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [text, setText] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  // Track if user explicitly clicked remove existing avatar
  const [isAvatarRemoved, setIsAvatarRemoved] = useState(false);
  // New avatar uploaded during edit
  const [newAvatarUpload, setNewAvatarUpload] =
    useState<NewAvatarUploadState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const authorNameInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSubmittingRef = useRef(false);

  const updateMutation = useUpdateTestimonial();
  const uploadImageMutation = useUploadImageMedia();

  useEffect(() => {
    if (testimonial) {
      setAuthorName(testimonial.author_name);
      setAuthorRole(testimonial.author_role ?? "");
      setText(testimonial.text);
      setIsVisible(testimonial.is_visible);
      setIsAvatarRemoved(false);
      setNewAvatarUpload(null);
      setFormError(null);
    }
  }, [testimonial]);

  const isUploading = newAvatarUpload?.status === "uploading";
  const isSubmitting = updateMutation.isPending || isUploading;
  const isSaveDisabled = isSubmitting || newAvatarUpload?.status === "failed";

  const { dialogRef } = useAdminDialog({
    isOpen: isOpen && testimonial !== null,
    onClose,
    isSubmitting,
    initialFocusRef: authorNameInputRef,
  });

  if (!isOpen || !testimonial) {
    return null;
  }

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
    const currentUpload: NewAvatarUploadState = {
      file,
      previewUrl,
      status: "uploading",
    };
    setNewAvatarUpload(currentUpload);

    try {
      const result = await uploadImageMutation.mutateAsync(file);
      setNewAvatarUpload((prev) =>
        prev
          ? {
              ...prev,
              status: "uploaded",
              mediaId: result.id,
            }
          : null,
      );
    } catch {
      setNewAvatarUpload((prev) =>
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
    if (
      !newAvatarUpload ||
      newAvatarUpload.status !== "failed" ||
      isSubmitting
    ) {
      return;
    }
    setFormError(null);
    setNewAvatarUpload((prev) =>
      prev
        ? {
            ...prev,
            status: "uploading",
            error: undefined,
          }
        : null,
    );

    try {
      const result = await uploadImageMutation.mutateAsync(
        newAvatarUpload.file,
      );
      setNewAvatarUpload((prev) =>
        prev
          ? {
              ...prev,
              status: "uploaded",
              mediaId: result.id,
            }
          : null,
      );
    } catch {
      setNewAvatarUpload((prev) =>
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

  const handleRemoveExistingAvatar = () => {
    if (isSubmitting) return;
    setIsAvatarRemoved(true);
  };

  const handleRemoveNewAvatar = () => {
    if (isSubmitting) return;
    setNewAvatarUpload(null);
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

    if (newAvatarUpload && newAvatarUpload.status === "failed") {
      setFormError("Please retry or remove the failed avatar upload.");
      return;
    }

    setFormError(null);
    isSubmittingRef.current = true;

    // Determine avatar_media_id for update:
    // If a new avatar was uploaded, use newAvatarUpload.mediaId.
    // Else if existing avatar was explicitly removed, send null.
    // Otherwise leave undefined so it is not updated.
    let avatarMediaIdToSend: string | null | undefined = undefined;
    if (newAvatarUpload?.status === "uploaded" && newAvatarUpload.mediaId) {
      avatarMediaIdToSend = newAvatarUpload.mediaId;
    } else if (isAvatarRemoved) {
      avatarMediaIdToSend = null;
    }

    const payload: {
      author_name?: string;
      author_role?: string | null;
      text?: string;
      avatar_media_id?: string | null;
      is_visible?: boolean;
    } = {};

    if (trimmedName !== testimonial.author_name) {
      payload.author_name = trimmedName;
    }
    const currentRole = testimonial.author_role ?? "";
    if (trimmedRole !== currentRole) {
      payload.author_role = trimmedRole || null;
    }
    if (trimmedText !== testimonial.text) {
      payload.text = trimmedText;
    }
    if (avatarMediaIdToSend !== undefined) {
      payload.avatar_media_id = avatarMediaIdToSend;
    }
    if (isVisible !== testimonial.is_visible) {
      payload.is_visible = isVisible;
    }

    try {
      await updateMutation.mutateAsync({
        id: testimonial.id,
        payload,
      });

      onClose();
    } catch {
      // Error handled by ErrorMessage display
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const hasExistingAvatar = Boolean(testimonial.avatar && !isAvatarRemoved);

  return (
    <div className={styles.modalBackdrop}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-testimonial-title"
      >
        <div className={styles.modalHeader}>
          <h3 id="edit-testimonial-title" className={styles.modalTitle}>
            Edit Testimonial
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

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.modalBody}>
            {formError && (
              <p style={{ color: "#dc2626", margin: 0, fontSize: "0.9rem" }}>
                {formError}
              </p>
            )}
            {updateMutation.error && (
              <ErrorMessage error={updateMutation.error} />
            )}
            {uploadImageMutation.error && (
              <ErrorMessage error={uploadImageMutation.error} />
            )}

            <div className={styles.formGroup}>
              <label
                htmlFor="edit-testimonial-author-name"
                className={styles.label}
              >
                Author Name *
              </label>
              <input
                ref={authorNameInputRef}
                id="edit-testimonial-author-name"
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
              <label
                htmlFor="edit-testimonial-author-role"
                className={styles.label}
              >
                Author Role / Affiliation
              </label>
              <input
                id="edit-testimonial-author-role"
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
              <label htmlFor="edit-testimonial-text" className={styles.label}>
                Review Text *
              </label>
              <textarea
                id="edit-testimonial-text"
                className={styles.textarea}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter quote or review text..."
                maxLength={3000}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Existing Avatar section */}
            {hasExistingAvatar &&
              !newAvatarUpload &&
              testimonial.avatar?.type === "image" && (
                <div className={styles.formGroup}>
                  <span className={styles.label}>Current Avatar</span>
                  <div className={styles.avatarItemCard}>
                    <div className={styles.avatarItemInfo}>
                      <img
                        src={testimonial.avatar.url}
                        alt={testimonial.author_name}
                        className={styles.avatarItemThumbnail}
                      />
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-admin-text)",
                        }}
                      >
                        {testimonial.avatar.original_filename ||
                          "Current photo"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.miniDangerButton}
                      onClick={handleRemoveExistingAvatar}
                      disabled={isSubmitting}
                      aria-label="Remove avatar"
                    >
                      Remove avatar
                    </button>
                  </div>
                </div>
              )}

            {/* Upload or replace Avatar */}
            <div className={styles.formGroup}>
              <label
                htmlFor="edit-testimonial-avatar-file"
                className={styles.label}
              >
                {hasExistingAvatar ? "Replace Avatar" : "Avatar Image"}
              </label>
              <input
                ref={fileInputRef}
                id="edit-testimonial-avatar-file"
                type="file"
                className={styles.fileInput}
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isSubmitting}
              />
              <p className={styles.helperText}>
                Select a single square or portrait photo to replace or attach.
              </p>

              {newAvatarUpload && (
                <div className={styles.avatarItemCard}>
                  <div className={styles.avatarItemInfo}>
                    <img
                      src={newAvatarUpload.previewUrl}
                      alt="New avatar preview"
                      className={styles.avatarItemThumbnail}
                    />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--color-admin-text)",
                        }}
                      >
                        {newAvatarUpload.file.name}
                      </span>
                      {newAvatarUpload.status === "uploading" && (
                        <span className={styles.statusBadgeUploading}>
                          Uploading...
                        </span>
                      )}
                      {newAvatarUpload.status === "uploaded" && (
                        <span className={styles.statusBadgeUploaded}>
                          Uploaded
                        </span>
                      )}
                      {newAvatarUpload.status === "failed" && (
                        <span className={styles.statusBadgeFailed}>
                          {newAvatarUpload.error || "Upload failed"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.avatarActions}>
                    {newAvatarUpload.status === "failed" && (
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
                      onClick={handleRemoveNewAvatar}
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
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={isSaveDisabled}
              aria-label="Save Changes"
            >
              {updateMutation.isPending
                ? "Saving..."
                : isUploading
                  ? "Uploading avatar..."
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
