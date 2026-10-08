import React, { useRef, useState } from "react";
import { useCreateSpaSection } from "./sectionQueries";
import { useAdminDialog } from "./useAdminDialog";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { CreateSpaSectionRequest } from "../../../api/types";
import { validateGermanSectionTranslation } from "./sectionValidation";
import styles from "./sections.module.css";

interface SpaSectionCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpaSectionCreateModal: React.FC<SpaSectionCreateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"en" | "de">("en");
  const [enName, setEnName] = useState("");
  const [enNav, setEnNav] = useState("");
  const [deName, setDeName] = useState("");
  const [deNav, setDeNav] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const createMutation = useCreateSpaSection();
  const enNameInputRef = useRef<HTMLInputElement | null>(null);
  const isSubmittingRef = useRef(false);

  const { dialogRef } = useAdminDialog({
    isOpen,
    onClose,
    isSubmitting: createMutation.isPending,
    initialFocusRef: enNameInputRef,
  });

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedEn = enName.trim();
    if (!trimmedEn || createMutation.isPending || isSubmittingRef.current) {
      return;
    }

    const trimmedEnNav = enNav.trim();
    const trimmedDe = deName.trim();
    const trimmedDeNav = deNav.trim();

    const deValidationError = validateGermanSectionTranslation({
      exists: false,
      name: trimmedDe,
      navigationLabel: trimmedDeNav,
    });

    if (deValidationError) {
      setFormError(deValidationError);
      setActiveTab("de");
      return;
    }

    const deTranslations = trimmedDe
      ? {
          name: trimmedDe,
          ...(trimmedDeNav ? { navigation_label: trimmedDeNav } : {}),
        }
      : undefined;

    const payload: CreateSpaSectionRequest = {
      title: trimmedEn,
      name: trimmedEn,
      navigation_label: trimmedEnNav || undefined,
      translations: {
        en: {
          name: trimmedEn,
          ...(trimmedEnNav ? { navigation_label: trimmedEnNav } : {}),
        },
        ...(deTranslations ? { de: deTranslations } : {}),
      },
    };

    isSubmittingRef.current = true;
    try {
      await createMutation.mutateAsync(payload);
      setEnName("");
      setEnNav("");
      setDeName("");
      setDeNav("");
      setFormError(null);
      setActiveTab("en");
      onClose();
    } catch {
      // Error is caught and displayed by ErrorMessage without resetting form draft
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleClose = () => {
    setEnName("");
    setEnNav("");
    setDeName("");
    setDeNav("");
    setFormError(null);
    setActiveTab("en");
    onClose();
  };

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-section-dialog-title"
    >
      <div ref={dialogRef} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 id="create-section-dialog-title" className={styles.modalTitle}>
            Create SPA Section
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={createMutation.isPending}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.modalBody}>
            {formError && <ErrorMessage error={formError} />}
            {createMutation.error && !formError && (
              <ErrorMessage error={createMutation.error} />
            )}

            {/* Language Selection Tabs */}
            <div
              className={styles.langTabs}
              role="tablist"
              aria-label="Section language tabs"
            >
              <button
                type="button"
                role="tab"
                id="tab-en"
                aria-selected={activeTab === "en"}
                aria-controls="panel-en"
                className={`${styles.langTab} ${activeTab === "en" ? styles.activeLangTab : ""}`}
                onClick={() => setActiveTab("en")}
              >
                🇬🇧 English *
              </button>
              <button
                type="button"
                role="tab"
                id="tab-de"
                aria-selected={activeTab === "de"}
                aria-controls="panel-de"
                className={`${styles.langTab} ${activeTab === "de" ? styles.activeLangTab : ""}`}
                onClick={() => setActiveTab("de")}
              >
                🇩🇪 Deutsch {deName.trim() || deNav.trim() ? "✓" : "(Optional)"}
              </button>
            </div>

            {activeTab === "en" ? (
              <div id="panel-en" role="tabpanel" aria-labelledby="tab-en">
                <div className={styles.formGroup}>
                  <label
                    htmlFor="create-section-title"
                    className={styles.label}
                  >
                    Section Title *
                  </label>
                  <input
                    ref={enNameInputRef}
                    id="create-section-title"
                    type="text"
                    className={styles.input}
                    value={enName}
                    onChange={(e) => setEnName(e.target.value)}
                    placeholder="e.g. Festival 2027"
                    required
                    disabled={createMutation.isPending}
                    data-testid="create-section-name-en"
                  />
                  <span className={styles.helperText}>
                    Canonical English section name required.
                  </span>
                </div>
                <div className={styles.formGroup}>
                  <label
                    htmlFor="create-section-nav-label-en"
                    className={styles.label}
                  >
                    Navigation Label
                  </label>
                  <input
                    id="create-section-nav-label-en"
                    type="text"
                    className={styles.input}
                    value={enNav}
                    onChange={(e) => setEnNav(e.target.value)}
                    placeholder="e.g. Festival"
                    disabled={createMutation.isPending}
                    data-testid="create-section-nav-en"
                  />
                  <span className={styles.helperText}>
                    Defaults to section name if left blank.
                  </span>
                </div>
              </div>
            ) : (
              <div id="panel-de" role="tabpanel" aria-labelledby="tab-de">
                <div className={styles.formGroup}>
                  <label
                    htmlFor="create-section-name-de"
                    className={styles.label}
                  >
                    German Section Name (Optional)
                  </label>
                  <input
                    id="create-section-name-de"
                    type="text"
                    className={styles.input}
                    value={deName}
                    onChange={(e) => {
                      setDeName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Festival 2027"
                    disabled={createMutation.isPending}
                    data-testid="create-section-name-de"
                  />
                  <span className={styles.helperText}>
                    Optional. If left blank, English is used as fallback.
                  </span>
                </div>
                <div className={styles.formGroup}>
                  <label
                    htmlFor="create-section-nav-label-de"
                    className={styles.label}
                  >
                    German Navigation Label (Optional)
                  </label>
                  <input
                    id="create-section-nav-label-de"
                    type="text"
                    className={styles.input}
                    value={deNav}
                    onChange={(e) => {
                      setDeNav(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Festival"
                    disabled={createMutation.isPending}
                    data-testid="create-section-nav-de"
                  />
                  <span className={styles.helperText}>
                    Optional. If left blank, English navigation label or German
                    name is used as fallback.
                  </span>
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <span className={styles.label}>Section Key</span>
              <span className={styles.helperText}>
                The section key is generated automatically by the server upon
                creation.
              </span>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={createMutation.isPending || !enName.trim()}
            >
              {createMutation.isPending ? "Creating..." : "Create Section"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
