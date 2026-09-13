import React, { useEffect, useRef } from "react";
import { AdminContactMessageDto, ContactEmailStatus } from "../../../api/types";
import {
  useMarkContactMessageRead,
  useMarkContactMessageUnread,
} from "./contactMessageQueries";
import { useAdminDialog } from "../sections/useAdminDialog";
import styles from "./contactMessages.module.css";

interface ContactMessageDetailModalProps {
  message: AdminContactMessageDto | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "N/A";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function getDeliveryBadge(status: ContactEmailStatus) {
  switch (status) {
    case "sent":
      return (
        <span className={`${styles.statusBadge} ${styles.deliveryBadgeSent}`}>
          Sent
        </span>
      );
    case "failed":
      return (
        <span className={`${styles.statusBadge} ${styles.deliveryBadgeFailed}`}>
          Email delivery failed
        </span>
      );
    case "pending":
      return (
        <span
          className={`${styles.statusBadge} ${styles.deliveryBadgePending}`}
        >
          Pending
        </span>
      );
    case "disabled":
      return (
        <span
          className={`${styles.statusBadge} ${styles.deliveryBadgeDisabled}`}
        >
          Disabled
        </span>
      );
  }
}

export const ContactMessageDetailModal: React.FC<
  ContactMessageDetailModalProps
> = ({ message, isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const markReadMutation = useMarkContactMessageRead();
  const markUnreadMutation = useMarkContactMessageUnread();

  const isMutating = markReadMutation.isPending || markUnreadMutation.isPending;

  const { dialogRef } = useAdminDialog({
    isOpen: isOpen && message !== null,
    onClose,
    isSubmitting: isMutating,
    initialFocusRef: closeButtonRef,
  });

  // Auto-mark read when intentionally opened and currently unread
  const messageId = message?.id;
  const isRead = message?.is_read;
  const { mutate: markRead } = markReadMutation;

  useEffect(() => {
    if (isOpen && messageId && isRead === false) {
      markRead(messageId);
    }
  }, [isOpen, messageId, isRead, markRead]);

  if (!isOpen || !message) {
    return null;
  }

  // Derive display status reflecting immediate mutation if in flight/succeeded
  const currentlyRead =
    markUnreadMutation.isSuccess && markUnreadMutation.variables === message.id
      ? false
      : markReadMutation.isSuccess && markReadMutation.variables === message.id
        ? true
        : message.is_read;

  const handleToggleUnread = async () => {
    if (isMutating) return;
    try {
      await markUnreadMutation.mutateAsync(message.id);
    } catch {
      // Handled by query/error boundary
    }
  };

  const handleToggleRead = async () => {
    if (isMutating) return;
    try {
      await markReadMutation.mutateAsync(message.id);
    } catch {
      // Handled by query/error boundary
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-message-detail-title"
      >
        <div className={styles.modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h3 id="contact-message-detail-title" className={styles.modalTitle}>
              Contact Message
            </h3>
            {currentlyRead ? (
              <span className={`${styles.statusBadge} ${styles.badgeRead}`}>
                Read
              </span>
            ) : (
              <span className={`${styles.statusBadge} ${styles.badgeUnread}`}>
                Unread
              </span>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isMutating}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailMetaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Sender Name</span>
              <span className={styles.metaValue}>{message.name}</span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Sender Email</span>
              <span className={styles.metaValue}>
                <a
                  href={`mailto:${message.email}`}
                  className={styles.emailLink}
                >
                  {message.email}
                </a>
              </span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Subject</span>
              <span className={styles.metaValue}>
                {message.subject || "(No subject)"}
              </span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Received At</span>
              <span className={styles.metaValue}>
                {formatDateTime(message.created_at)}
              </span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Email Delivery Status</span>
              <div style={{ marginTop: "0.15rem" }}>
                {getDeliveryBadge(message.email_status)}
              </div>
            </div>

            {message.email_sent_at && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Email Sent At</span>
                <span className={styles.metaValue}>
                  {formatDateTime(message.email_sent_at)}
                </span>
              </div>
            )}

            {currentlyRead && message.read_at && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Read At</span>
                <span className={styles.metaValue}>
                  {formatDateTime(message.read_at)}
                </span>
              </div>
            )}
          </div>

          {message.email_status === "failed" && message.email_error && (
            <div className={styles.emailErrorAlert} role="alert">
              <span className={styles.emailErrorTitle}>
                Email delivery failed
              </span>
              <span className={styles.emailErrorMessage}>
                {message.email_error}
              </span>
            </div>
          )}

          <div className={styles.messageContentSection}>
            <span className={styles.messageLabel}>Message Body</span>
            <div className={styles.messageText}>{message.message}</div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          {currentlyRead ? (
            <button
              type="button"
              className={styles.markUnreadButton}
              onClick={handleToggleUnread}
              disabled={isMutating}
            >
              {markUnreadMutation.isPending ? "Updating..." : "Mark as unread"}
            </button>
          ) : (
            <button
              type="button"
              className={styles.markUnreadButton}
              onClick={handleToggleRead}
              disabled={isMutating}
            >
              {markReadMutation.isPending ? "Updating..." : "Mark as read"}
            </button>
          )}

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={isMutating}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
