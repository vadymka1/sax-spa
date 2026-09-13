import React from "react";
import { AdminContactMessageDto, ContactEmailStatus } from "../../../api/types";
import styles from "./contactMessages.module.css";

interface ContactMessagesListProps {
  messages: AdminContactMessageDto[];
  onSelectMessage: (message: AdminContactMessageDto) => void;
  emptyMessage?: string;
}

function formatDate(isoString: string): string {
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
          Failed
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

export const ContactMessagesList: React.FC<ContactMessagesListProps> = ({
  messages,
  onSelectMessage,
  emptyMessage = "No contact messages yet.",
}) => {
  if (messages.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>{emptyMessage}</p>
        <p className={styles.emptyDescription}>
          Messages submitted from the public Contact Us form will appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      className={styles.messagesList}
      role="list"
      aria-label="Contact Messages"
    >
      {messages.map((message) => {
        const isUnread = !message.is_read;

        return (
          <button
            key={message.id}
            type="button"
            className={`${styles.messageCard} ${isUnread ? styles.unreadCard : ""}`}
            onClick={() => onSelectMessage(message)}
            aria-label={`Message from ${message.name}, subject: ${message.subject || "No subject"}${isUnread ? ", unread" : ""}`}
            role="listitem"
          >
            <div className={styles.cardHeader}>
              <div className={styles.senderInfo}>
                {isUnread && (
                  <span
                    className={styles.unreadDot}
                    aria-label="Unread message indicator"
                  />
                )}
                <span
                  className={`${styles.senderName} ${!isUnread ? styles.readSenderName : ""}`}
                >
                  {message.name}
                </span>
                <span className={styles.senderEmail}>
                  &lt;{message.email}&gt;
                </span>
              </div>

              <div className={styles.headerMeta}>
                <span className={styles.receivedTime}>
                  {formatDate(message.created_at)}
                </span>
              </div>
            </div>

            <p
              className={`${styles.subjectLine} ${!isUnread ? styles.readSubjectLine : ""}`}
            >
              {message.subject || "(No subject)"}
            </p>

            <p className={styles.previewText}>{message.message}</p>

            <div className={styles.cardFooter}>
              <div className={styles.badgesGroup}>
                {isUnread ? (
                  <span
                    className={`${styles.statusBadge} ${styles.badgeUnread}`}
                  >
                    Unread
                  </span>
                ) : (
                  <span className={`${styles.statusBadge} ${styles.badgeRead}`}>
                    Read
                  </span>
                )}
                {getDeliveryBadge(message.email_status)}
              </div>

              <span
                style={{
                  fontSize: "0.85rem",
                  color: "var(--color-admin-primary)",
                  fontWeight: 500,
                }}
              >
                View details &rarr;
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
