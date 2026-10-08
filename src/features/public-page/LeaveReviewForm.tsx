import { useState, type FormEvent } from "react";
import { isAppApiError } from "../../api/errors";
import { publicApi } from "../../api/publicApi";
import { useLocale } from "./useLocale";
import { t } from "../../lib/translations";
import styles from "./LeaveReviewForm.module.css";

interface ReviewFormState {
  author_name: string;
  author_role: string;
  text: string;
}

interface ReviewFormErrors {
  author_name?: string;
  author_role?: string;
  text?: string;
}

export function LeaveReviewForm() {
  const { locale } = useLocale();
  const [formData, setFormData] = useState<ReviewFormState>({
    author_name: "",
    author_role: "",
    text: "",
  });

  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const validate = (): boolean => {
    const nextErrors: ReviewFormErrors = {};

    const trimmedName = formData.author_name.trim();
    if (!trimmedName) {
      nextErrors.author_name = t(locale, "review", "nameRequired");
    } else if (trimmedName.length > 120) {
      nextErrors.author_name = t(locale, "review", "nameMaxLength");
    }

    const trimmedRole = formData.author_role.trim();
    if (trimmedRole.length > 160) {
      nextErrors.author_role = t(locale, "review", "roleMaxLength");
    }

    const trimmedText = formData.text.trim();
    if (!trimmedText) {
      nextErrors.text = t(locale, "review", "textRequired");
    } else if (trimmedText.length > 3000) {
      nextErrors.text = t(locale, "review", "textMaxLength");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setRequestId(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await publicApi.submitTestimonial({
        author_name: formData.author_name.trim(),
        author_role: formData.author_role.trim() || undefined,
        text: formData.text.trim(),
      });

      setIsSuccess(true);
      setFormData({
        author_name: "",
        author_role: "",
        text: "",
      });
      setErrors({});
    } catch (err) {
      if (isAppApiError(err)) {
        setErrorMessage(err.message || t(locale, "review", "errorFallback"));
        setRequestId(err.requestId || null);
      } else {
        setErrorMessage(t(locale, "review", "unexpectedError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.reviewContainer}>
      <h3 className={styles.title}>{t(locale, "review", "title")}</h3>
      <p className={styles.subtitle}>{t(locale, "review", "subtitle")}</p>

      {isSuccess && (
        <div role="status" className={styles.successAlert}>
          <h4 className={styles.successTitle}>
            {t(locale, "review", "successTitle")}
          </h4>
          <p className={styles.successText}>
            {t(locale, "review", "successBody")}
          </p>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className={styles.errorAlert}>
          <h4 className={styles.errorTitle}>
            {t(locale, "review", "errorTitle")}
          </h4>
          <p className={styles.errorText}>{errorMessage}</p>
          {requestId && (
            <div className={styles.requestId}>Request ID: {requestId}</div>
          )}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.fieldGroup}>
          <label htmlFor="review-author-name" className={styles.label}>
            {t(locale, "review", "authorNameLabel")}{" "}
            <span className={styles.requiredMark}>*</span>
          </label>
          <input
            id="review-author-name"
            type="text"
            className={`${styles.input} ${errors.author_name ? styles.fieldError : ""}`}
            placeholder={t(locale, "review", "authorNamePlaceholder")}
            value={formData.author_name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, author_name: e.target.value }));
              if (errors.author_name) {
                setErrors((prev) => ({ ...prev, author_name: undefined }));
              }
            }}
            disabled={isSubmitting}
            aria-required="true"
            aria-invalid={Boolean(errors.author_name)}
            aria-describedby={
              errors.author_name ? "review-name-error" : undefined
            }
          />
          {errors.author_name && (
            <p id="review-name-error" className={styles.errorMessage}>
              {errors.author_name}
            </p>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="review-author-role" className={styles.label}>
            {t(locale, "review", "authorRoleLabel")}
          </label>
          <input
            id="review-author-role"
            type="text"
            className={`${styles.input} ${errors.author_role ? styles.fieldError : ""}`}
            placeholder={t(locale, "review", "authorRolePlaceholder")}
            value={formData.author_role}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, author_role: e.target.value }));
              if (errors.author_role) {
                setErrors((prev) => ({ ...prev, author_role: undefined }));
              }
            }}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.author_role)}
            aria-describedby={
              errors.author_role ? "review-role-error" : undefined
            }
          />
          {errors.author_role && (
            <p id="review-role-error" className={styles.errorMessage}>
              {errors.author_role}
            </p>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="review-text" className={styles.label}>
            {t(locale, "review", "reviewTextLabel")}{" "}
            <span className={styles.requiredMark}>*</span>
          </label>
          <textarea
            id="review-text"
            className={`${styles.textarea} ${errors.text ? styles.fieldError : ""}`}
            placeholder={t(locale, "review", "reviewTextPlaceholder")}
            value={formData.text}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, text: e.target.value }));
              if (errors.text) {
                setErrors((prev) => ({ ...prev, text: undefined }));
              }
            }}
            disabled={isSubmitting}
            aria-required="true"
            aria-invalid={Boolean(errors.text)}
            aria-describedby={errors.text ? "review-text-error" : undefined}
          />
          {errors.text && (
            <p id="review-text-error" className={styles.errorMessage}>
              {errors.text}
            </p>
          )}
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? t(locale, "review", "submittingReview")
            : t(locale, "review", "submitReview")}
        </button>
      </form>
    </div>
  );
}
