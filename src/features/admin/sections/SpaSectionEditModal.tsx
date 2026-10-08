import React, { useEffect, useRef, useState } from "react";
import {
  AdminSpaSectionDto,
  UpdateSpaSectionRequest,
  UpdateSpaSectionTranslations,
} from "../../../api/types";
import { useUpdateSpaSection } from "./sectionQueries";
import { useAdminDialog } from "./useAdminDialog";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { validateGermanSectionTranslation } from "./sectionValidation";
import styles from "./sections.module.css";

interface SpaSectionEditModalProps {
  section: AdminSpaSectionDto | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SpaSectionEditModal: React.FC<SpaSectionEditModalProps> = ({
  section,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"en" | "de">("en");
  const [enName, setEnName] = useState("");
  const [enNav, setEnNav] = useState("");
  const [deName, setDeName] = useState("");
  const [deNav, setDeNav] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const initialEnNameRef = useRef("");
  const initialEnNavRef = useRef("");
  const initialDeNameRef = useRef("");
  const initialDeNavRef = useRef("");
  const initialVisibleRef = useRef(true);

  const updateMutation = useUpdateSpaSection();
  const enInputRef = useRef<HTMLInputElement | null>(null);

  const { dialogRef } = useAdminDialog({
    isOpen: isOpen && section !== null,
    onClose,
    isSubmitting: updateMutation.isPending,
    initialFocusRef: enInputRef,
  });

  const hasGermanTranslation = Boolean(section?.translations?.de != null);

  useEffect(() => {
    if (section) {
      const enVal = section.translations?.en.name || section.title || "";
      const enNavVal =
        section.translations?.en.navigation_label ??
        section.navigation_label ??
        "";
      const deVal = section.translations?.de?.name || "";
      const deNavVal = section.translations?.de?.navigation_label || "";
      const visVal = section.is_visible;

      setEnName(enVal);
      setEnNav(enNavVal);
      setDeName(deVal);
      setDeNav(deNavVal);
      setFormError(null);
      setIsVisible(visVal);

      initialEnNameRef.current = enVal;
      initialEnNavRef.current = enNavVal;
      initialDeNameRef.current = deVal;
      initialDeNavRef.current = deNavVal;
      initialVisibleRef.current = visVal;
      setActiveTab("en");
    }
  }, [section]);

  if (!isOpen || !section) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedEn = enName.trim();
    if (!trimmedEn || updateMutation.isPending) {
      return;
    }

    const trimmedEnNav = enNav.trim();
    const trimmedDe = deName.trim();
    const trimmedDeNav = deNav.trim();

    const deExists = section.translations?.de != null;
    const deValidationError = validateGermanSectionTranslation({
      exists: deExists,
      name: trimmedDe,
      navigationLabel: trimmedDeNav,
    });

    if (deValidationError) {
      setFormError(deValidationError);
      setActiveTab("de");
      return;
    }

    const enNameChanged = trimmedEn !== initialEnNameRef.current;
    const enNavChanged = trimmedEnNav !== initialEnNavRef.current;
    const enChanged = enNameChanged || enNavChanged;

    const deNameChanged = trimmedDe !== initialDeNameRef.current;
    const deNavChanged = trimmedDeNav !== initialDeNavRef.current;
    const deChanged = deNameChanged || deNavChanged;

    const payload: UpdateSpaSectionRequest = {};
    const translationsPayload: UpdateSpaSectionTranslations = {};

    if (enChanged) {
      translationsPayload.en = {
        ...(enNameChanged ? { name: trimmedEn } : {}),
        ...(enNavChanged ? { navigation_label: trimmedEnNav || null } : {}),
      };
      if (enNameChanged) {
        payload.title = trimmedEn;
        payload.name = trimmedEn;
      }
      if (enNavChanged) {
        payload.navigation_label = trimmedEnNav || null;
      }
    }

    if (deChanged) {
      translationsPayload.de = {
        ...(deNameChanged ? { name: trimmedDe || undefined } : {}),
        ...(deNavChanged ? { navigation_label: trimmedDeNav || null } : {}),
      };
    }

    if (Object.keys(translationsPayload).length > 0) {
      payload.translations = translationsPayload;
    }

    if (isVisible !== initialVisibleRef.current) {
      payload.is_visible = isVisible;
    }

    try {
      await updateMutation.mutateAsync({ id: section.id, payload });
      setFormError(null);
      onClose();
    } catch {
      // Error is caught and displayed by ErrorMessage without resetting form draft
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-section-dialog-title"
    >
      <div ref={dialogRef} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 id="edit-section-dialog-title" className={styles.modalTitle}>
            Edit SPA Section
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={updateMutation.isPending}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.modalBody}>
            {formError && <ErrorMessage error={formError} />}
            {updateMutation.error && !formError && (
              <ErrorMessage error={updateMutation.error} />
            )}

            <div className={styles.formGroup}>
              <label htmlFor="edit-section-key" className={styles.label}>
                Section Key (Read-Only)
              </label>
              <input
                id="edit-section-key"
                type="text"
                className={styles.input}
                value={section.key}
                readOnly
                disabled
              />
              <span className={styles.helperText}>
                Section key is immutable and used for public page anchors.
              </span>
            </div>

            {/* Language Selection Tabs */}
            <div
              className={styles.langTabs}
              role="tablist"
              aria-label="Section language tabs"
            >
              <button
                type="button"
                role="tab"
                id="edit-tab-en"
                aria-selected={activeTab === "en"}
                aria-controls="edit-panel-en"
                className={`${styles.langTab} ${activeTab === "en" ? styles.activeLangTab : ""}`}
                onClick={() => setActiveTab("en")}
              >
                🇬🇧 English *
              </button>
              <button
                type="button"
                role="tab"
                id="edit-tab-de"
                aria-selected={activeTab === "de"}
                aria-controls="edit-panel-de"
                className={`${styles.langTab} ${activeTab === "de" ? styles.activeLangTab : ""}`}
                onClick={() => setActiveTab("de")}
              >
                🇩🇪 Deutsch {hasGermanTranslation ? "✓" : "(Missing)"}
              </button>
            </div>

            {activeTab === "en" ? (
              <div
                id="edit-panel-en"
                role="tabpanel"
                aria-labelledby="edit-tab-en"
              >
                <div className={styles.formGroup}>
                  <label
                    htmlFor="edit-section-name-en"
                    className={styles.label}
                  >
                    Section Title *
                  </label>
                  <input
                    ref={enInputRef}
                    id="edit-section-name-en"
                    type="text"
                    className={styles.input}
                    value={enName}
                    onChange={(e) => setEnName(e.target.value)}
                    required
                    disabled={updateMutation.isPending}
                    data-testid="edit-section-name-en"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label
                    htmlFor="edit-section-nav-label-en"
                    className={styles.label}
                  >
                    Navigation Label
                  </label>
                  <input
                    id="edit-section-nav-label-en"
                    type="text"
                    className={styles.input}
                    value={enNav}
                    onChange={(e) => setEnNav(e.target.value)}
                    disabled={updateMutation.isPending}
                    data-testid="edit-section-nav-en"
                  />
                  <span className={styles.helperText}>
                    Defaults to section title on public site if left blank.
                  </span>
                </div>
              </div>
            ) : (
              <div
                id="edit-panel-de"
                role="tabpanel"
                aria-labelledby="edit-tab-de"
              >
                {!hasGermanTranslation && !deName && !deNav && (
                  <div className={styles.missingNotice} role="status">
                    No German translation yet
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label
                    htmlFor="edit-section-name-de"
                    className={styles.label}
                  >
                    German Section Name
                  </label>
                  <input
                    id="edit-section-name-de"
                    type="text"
                    className={styles.input}
                    value={deName}
                    onChange={(e) => {
                      setDeName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Über uns"
                    disabled={updateMutation.isPending}
                    data-testid="edit-section-name-de"
                  />
                  <span className={styles.helperText}>
                    Enter German translation for this section.
                  </span>
                </div>
                <div className={styles.formGroup}>
                  <label
                    htmlFor="edit-section-nav-label-de"
                    className={styles.label}
                  >
                    German Navigation Label
                  </label>
                  <input
                    id="edit-section-nav-label-de"
                    type="text"
                    className={styles.input}
                    value={deNav}
                    onChange={(e) => {
                      setDeNav(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="e.g. Über uns"
                    disabled={updateMutation.isPending}
                    data-testid="edit-section-nav-de"
                  />
                  <span className={styles.helperText}>
                    Optional. If left blank, English navigation label or German
                    name is used as fallback.
                  </span>
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                  disabled={updateMutation.isPending}
                />
                Section Visible on Public Page
              </label>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={updateMutation.isPending || !enName.trim()}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
