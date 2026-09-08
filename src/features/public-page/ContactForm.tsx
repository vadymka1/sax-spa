import { useState, type FormEvent } from "react";
import { isAppApiError } from "../../api/errors";
import { publicApi } from "../../api/publicApi";
import styles from "./ContactForm.module.css";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const [formData, setFormData] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      nextErrors.name = "Name is required.";
    } else if (trimmedName.length > 100) {
      nextErrors.name = "Name must not exceed 100 characters.";
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address.";
    } else if (trimmedEmail.length > 255) {
      nextErrors.email = "Email must not exceed 255 characters.";
    }

    if (formData.subject.trim().length > 200) {
      nextErrors.subject = "Subject must not exceed 200 characters.";
    }

    const trimmedMessage = formData.message.trim();
    if (!trimmedMessage) {
      nextErrors.message = "Message is required.";
    } else if (trimmedMessage.length < 10) {
      nextErrors.message = "Message must be at least 10 characters long.";
    } else if (trimmedMessage.length > 5000) {
      nextErrors.message = "Message must not exceed 5000 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRequestId(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await publicApi.submitContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim() || undefined,
        message: formData.message.trim(),
      });

      setIsSuccess(true);
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setErrors({});
    } catch (err) {
      if (isAppApiError(err)) {
        setErrorMessage(
          err.message || "Failed to send your message. Please try again.",
        );
        if (err.requestId) {
          setRequestId(err.requestId);
        }
      } else {
        setErrorMessage(
          "An unexpected error occurred. Please try again later.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setErrorMessage(null);
    setRequestId(null);
  };

  return (
    <section
      className={styles.contactContainer}
      aria-labelledby="contact-form-title"
      data-testid="contact-form-section"
    >
      <h2 id="contact-form-title" className={styles.title}>
        Get in Touch
      </h2>
      <p className={styles.subtitle}>
        Have a question or looking to book a performance? Send a message below.
      </p>

      {isSuccess ? (
        <div
          className={`${styles.statusAlert} ${styles.statusAlertSuccess}`}
          role="status"
          aria-live="polite"
          data-testid="contact-success"
        >
          <p>
            <strong>Thank you!</strong> Your message has been sent successfully.
            We will get back to you soon.
          </p>
          <button
            type="button"
            className={styles.sendAnotherButton}
            onClick={handleReset}
          >
            Send another message
          </button>
        </div>
      ) : (
        <form
          className={styles.form}
          onSubmit={handleSubmit}
          noValidate
          data-testid="contact-form"
        >
          {errorMessage && (
            <div
              className={`${styles.statusAlert} ${styles.statusAlertError}`}
              role="alert"
              aria-live="assertive"
              data-testid="contact-error"
            >
              <p>{errorMessage}</p>
              {requestId && (
                <span className={styles.requestIdText}>
                  Request ID: {requestId}
                </span>
              )}
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label htmlFor="contact-name" className={styles.label}>
              Name{" "}
              <span className={styles.requiredMark} aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "contact-name-error" : undefined}
              data-testid="contact-name"
            />
            {errors.name && (
              <span
                id="contact-name-error"
                className={styles.errorText}
                role="alert"
              >
                {errors.name}
              </span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="contact-email" className={styles.label}>
              Email{" "}
              <span className={styles.requiredMark} aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              value={formData.email}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, email: e.target.value }));
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "contact-email-error" : undefined
              }
              data-testid="contact-email"
            />
            {errors.email && (
              <span
                id="contact-email-error"
                className={styles.errorText}
                role="alert"
              >
                {errors.email}
              </span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="contact-subject" className={styles.label}>
              Subject (optional)
            </label>
            <input
              id="contact-subject"
              name="subject"
              type="text"
              className={`${styles.input} ${errors.subject ? styles.inputError : ""}`}
              value={formData.subject}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, subject: e.target.value }));
                if (errors.subject) {
                  setErrors((prev) => ({ ...prev, subject: undefined }));
                }
              }}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={
                errors.subject ? "contact-subject-error" : undefined
              }
              data-testid="contact-subject"
            />
            {errors.subject && (
              <span
                id="contact-subject-error"
                className={styles.errorText}
                role="alert"
              >
                {errors.subject}
              </span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="contact-message" className={styles.label}>
              Message{" "}
              <span className={styles.requiredMark} aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              id="contact-message"
              name="message"
              className={`${styles.textarea} ${errors.message ? styles.textareaError : ""}`}
              value={formData.message}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, message: e.target.value }));
                if (errors.message) {
                  setErrors((prev) => ({ ...prev, message: undefined }));
                }
              }}
              disabled={isSubmitting}
              rows={5}
              aria-required="true"
              aria-invalid={Boolean(errors.message)}
              aria-describedby={
                errors.message ? "contact-message-error" : undefined
              }
              data-testid="contact-message"
            />
            {errors.message && (
              <span
                id="contact-message-error"
                className={styles.errorText}
                role="alert"
              >
                {errors.message}
              </span>
            )}
            <div className={styles.charCounter} aria-hidden="true">
              {formData.message.length} / 5000
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
            data-testid="contact-submit"
          >
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </form>
      )}
    </section>
  );
}
