import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BackgroundPosition,
  BackgroundSize,
  UpdatePageAppearanceRequest,
} from "../../../api/types";
import { mediaApi } from "../../../api/mediaApi";
import {
  usePageAppearance,
  useUpdatePageAppearance,
} from "./appearanceQueries";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { isAppApiError, AppApiError } from "../../../api/errors";
import styles from "./appearance.module.css";

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const PageAppearancePage: React.FC = () => {
  const { data, isLoading, error, refetch } = usePageAppearance();
  const updateMutation = useUpdatePageAppearance();

  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.35);
  const [backgroundPosition, setBackgroundPosition] =
    useState<BackgroundPosition>("center");
  const [backgroundSize, setBackgroundSize] = useState<BackgroundSize>("cover");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<AppApiError | string | null>(
    null,
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when data loads or updates
  useEffect(() => {
    if (data) {
      setOverlayOpacity(data.overlay_opacity);
      setBackgroundPosition(data.background_position);
      setBackgroundSize(data.background_size);
    }
  }, [data]);

  // Determine if form settings differ from canonical server state
  const isDirty = useMemo(() => {
    if (!data) return false;
    const currentRounded = Math.round(overlayOpacity * 100) / 100;
    const dataRounded = Math.round(data.overlay_opacity * 100) / 100;
    return (
      currentRounded !== dataRounded ||
      backgroundPosition !== data.background_position ||
      backgroundSize !== data.background_size
    );
  }, [data, overlayOpacity, backgroundPosition, backgroundSize]);

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      setUploadError(
        "Invalid file type. Please select a JPEG, PNG, or WebP image.",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setSaveSuccess(false);

    try {
      const uploadedMedia = await mediaApi.uploadImageMedia(file);
      await updateMutation.mutateAsync({
        background_media_id: uploadedMedia.id,
      });
      setSaveSuccess(true);
    } catch (err) {
      if (isAppApiError(err)) {
        setUploadError(err);
      } else if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError("Failed to upload image.");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveBackground = async () => {
    if (isUploading || updateMutation.isPending) return;
    setUploadError(null);
    setSaveSuccess(false);
    try {
      await updateMutation.mutateAsync({
        background_media_id: null,
      });
      setSaveSuccess(true);
    } catch (err) {
      if (isAppApiError(err)) {
        setUploadError(err);
      } else if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError("Failed to remove background image.");
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !isDirty || updateMutation.isPending || isUploading) return;

    setSaveSuccess(false);
    const patch: UpdatePageAppearanceRequest = {};

    const currentRounded = Math.round(overlayOpacity * 100) / 100;
    const dataRounded = Math.round(data.overlay_opacity * 100) / 100;

    if (currentRounded !== dataRounded) {
      patch.overlay_opacity = currentRounded;
    }
    if (backgroundPosition !== data.background_position) {
      patch.background_position = backgroundPosition;
    }
    if (backgroundSize !== data.background_size) {
      patch.background_size = backgroundSize;
    }

    try {
      await updateMutation.mutateAsync(patch);
      setSaveSuccess(true);
    } catch {
      // Error is tracked via updateMutation.error
      setSaveSuccess(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Page Appearance</h2>
            <p className={styles.subtitle}>
              Manage the visual theme, background image, and overlay for the
              public SPA.
            </p>
          </div>
        </header>
        <div className={styles.card}>
          <LoadingSpinner label="Loading page appearance settings..." />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Page Appearance</h2>
            <p className={styles.subtitle}>
              Manage the visual theme, background image, and overlay for the
              public SPA.
            </p>
          </div>
        </header>
        <div className={styles.card}>
          <ErrorMessage
            error={error || "Failed to load appearance settings"}
            onRetry={() => void refetch()}
          />
        </div>
      </div>
    );
  }

  const hasBackground = Boolean(data.background_media);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Page Appearance</h2>
          <p className={styles.subtitle}>
            Configure the background image, overlay opacity, and positioning for
            the public page.
          </p>
        </div>
      </header>

      {saveSuccess && (
        <div className={styles.successNotice} role="status">
          ✓ Appearance settings saved successfully.
        </div>
      )}

      {uploadError && <ErrorMessage error={uploadError} />}
      {!uploadError && updateMutation.error && (
        <ErrorMessage error={updateMutation.error} />
      )}

      {/* Background Image Card */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Background Image</h3>
        <p className={styles.cardSubtitle}>
          Upload a high-resolution photograph to display as the background
          across the public site.
        </p>

        <div className={styles.imageControls}>
          {hasBackground ? (
            <img
              src={data.background_media?.url}
              alt="Current background preview thumbnail"
              className={styles.imageThumbnail}
              data-testid="appearance-current-image"
            />
          ) : (
            <div
              className={styles.emptyImagePlaceholder}
              data-testid="appearance-no-image"
            >
              No background image configured
            </div>
          )}

          <div className={styles.imageActions}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleFileChange}
              data-testid="appearance-file-input"
            />
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleFileClick}
              disabled={isUploading || updateMutation.isPending}
              data-testid="appearance-upload-button"
            >
              {isUploading
                ? "Uploading..."
                : hasBackground
                  ? "Replace Image"
                  : "Upload Background Image"}
            </button>

            {hasBackground && (
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleRemoveBackground}
                disabled={isUploading || updateMutation.isPending}
                data-testid="appearance-remove-button"
              >
                Remove Background
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Appearance Controls Form */}
      <form onSubmit={handleSaveSettings} className={styles.card}>
        <h3 className={styles.cardTitle}>Overlay & Positioning</h3>

        {/* Overlay Opacity Slider */}
        <div className={styles.formGroup}>
          <label htmlFor="appearance-overlay-slider" className={styles.label}>
            Overlay Opacity
          </label>
          <span className={styles.helperText}>
            A soft ivory overlay ensures contrast and readability over the
            background image.
          </span>
          <div className={styles.sliderRow}>
            <input
              id="appearance-overlay-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(overlayOpacity * 100)}
              onChange={(e) => {
                setOverlayOpacity(Number(e.target.value) / 100);
                setSaveSuccess(false);
              }}
              className={styles.rangeSlider}
              aria-label="Overlay opacity"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(overlayOpacity * 100)}
              data-testid="appearance-opacity-slider"
            />
            <span
              className={styles.sliderValueBadge}
              data-testid="appearance-opacity-badge"
            >
              {Math.round(overlayOpacity * 100)}%
            </span>
          </div>
        </div>

        {/* Background Position */}
        <div className={styles.formGroup}>
          <label className={styles.label} id="position-label">
            Background Position
          </label>
          <div
            className={styles.segmentedGroup}
            role="radiogroup"
            aria-labelledby="position-label"
          >
            {(["center", "top", "bottom"] as const).map((pos) => {
              const isSelected = backgroundPosition === pos;
              const displayLabel = pos.charAt(0).toUpperCase() + pos.slice(1);
              return (
                <button
                  key={pos}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`${styles.segmentedOption} ${
                    isSelected ? styles.segmentedOptionActive : ""
                  }`}
                  onClick={() => {
                    setBackgroundPosition(pos);
                    setSaveSuccess(false);
                  }}
                  data-testid={`appearance-position-${pos}`}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Background Size */}
        <div className={styles.formGroup}>
          <label className={styles.label} id="size-label">
            Background Size
          </label>
          <span className={styles.helperText}>
            Cover fills the entire screen (may crop edges); Contain shows the
            full image without cropping.
          </span>
          <div
            className={styles.segmentedGroup}
            role="radiogroup"
            aria-labelledby="size-label"
          >
            {(["cover", "contain"] as const).map((sz) => {
              const isSelected = backgroundSize === sz;
              const displayLabel = sz.charAt(0).toUpperCase() + sz.slice(1);
              return (
                <button
                  key={sz}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`${styles.segmentedOption} ${
                    isSelected ? styles.segmentedOptionActive : ""
                  }`}
                  onClick={() => {
                    setBackgroundSize(sz);
                    setSaveSuccess(false);
                  }}
                  data-testid={`appearance-size-${sz}`}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Preview Card */}
        <div className={styles.formGroup}>
          <span className={styles.label}>Live Preview</span>
          <span className={styles.helperText}>
            Preview reacts immediately to slider and position controls before
            saving.
          </span>
          <div
            className={styles.previewContainer}
            style={{
              backgroundImage: data.background_media
                ? `url(${data.background_media.url})`
                : "none",
              backgroundPosition,
              backgroundSize,
              backgroundRepeat: "no-repeat",
            }}
            data-testid="appearance-live-preview"
          >
            <div
              className={styles.previewOverlay}
              style={{
                opacity: overlayOpacity,
              }}
              aria-hidden="true"
              data-testid="appearance-preview-overlay"
            />
            <div className={styles.previewContent}>
              <div className={styles.previewHeader}>
                <span className={styles.previewBrand}>SPA Saxophone</span>
                <div className={styles.previewNavLinks}>
                  <span>About</span>
                  <span>Gallery</span>
                  <span>Contact</span>
                </div>
              </div>
              <h4 className={styles.previewHeroTitle}>
                World-Class Performances
              </h4>
              <p className={styles.previewHeroSubtitle}>
                Experience the rich harmonies and dynamic repertoire of the SPA
                Saxophone Ensemble. Sample text illustrating contrast and
                readability.
              </p>
              <div className={styles.previewSampleButton}>Discover Music</div>
            </div>
          </div>
        </div>

        <div className={styles.footerBar}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={!isDirty || updateMutation.isPending || isUploading}
            data-testid="appearance-save-button"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};
