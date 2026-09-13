import React, { useEffect, useMemo, useState } from "react";
import { AdminContactMessageDto } from "../../../api/types";
import { useAdminContactMessages } from "./contactMessageQueries";
import { ContactMessagesList } from "./ContactMessagesList";
import { ContactMessageDetailModal } from "./ContactMessageDetailModal";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import styles from "./contactMessages.module.css";

type MessageFilterTab = "all" | "unread" | "read";

export const ContactMessagesPage: React.FC = () => {
  const {
    data: messages,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminContactMessages();

  const [activeTab, setActiveTab] = useState<MessageFilterTab>("all");
  const [hasSetInitialTab, setHasSetInitialTab] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );

  // Default to Unread if unread messages exist, otherwise All
  useEffect(() => {
    if (!hasSetInitialTab && messages) {
      const unread = messages.filter((m) => !m.is_read).length;
      if (unread > 0) {
        setActiveTab("unread");
      } else {
        setActiveTab("all");
      }
      setHasSetInitialTab(true);
    }
  }, [messages, hasSetInitialTab]);

  // Sort messages newest first
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [messages]);

  const unreadCount = useMemo(
    () => sortedMessages.filter((m) => !m.is_read).length,
    [sortedMessages],
  );
  const readCount = useMemo(
    () => sortedMessages.filter((m) => m.is_read).length,
    [sortedMessages],
  );
  const allCount = sortedMessages.length;

  const filteredMessages = useMemo(() => {
    if (activeTab === "unread") {
      return sortedMessages.filter((m) => !m.is_read);
    }
    if (activeTab === "read") {
      return sortedMessages.filter((m) => m.is_read);
    }
    return sortedMessages;
  }, [sortedMessages, activeTab]);

  // Keep selected message in sync with query cache updates
  const selectedMessage = useMemo(() => {
    if (!selectedMessageId) return null;
    return sortedMessages.find((m) => m.id === selectedMessageId) || null;
  }, [sortedMessages, selectedMessageId]);

  if (isLoading && !messages) {
    return (
      <div className={styles.container}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "4rem 0",
          }}
        >
          <LoadingSpinner label="Loading contact messages..." />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.container}>
        <div style={{ margin: "2rem 0" }}>
          <ErrorMessage
            error={error || "Unable to load contact messages."}
            onRetry={() => void refetch()}
          />
        </div>
      </div>
    );
  }

  const emptyMessage =
    activeTab === "unread"
      ? "No unread messages."
      : activeTab === "read"
        ? "No read messages."
        : "No contact messages yet.";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Contact Messages</h2>
          <p className={styles.subtitle}>
            Inquiries and messages received through the public Contact Us form.
          </p>
        </div>
      </header>

      {/* Filter Tabs */}
      <nav className={styles.tabGroup} aria-label="Message status filter">
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "all" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("all")}
          aria-current={activeTab === "all" ? "page" : undefined}
        >
          All <span className={styles.tabCount}>({allCount})</span>
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "unread" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("unread")}
          aria-current={activeTab === "unread" ? "page" : undefined}
        >
          Unread <span className={styles.tabCount}>({unreadCount})</span>
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "read" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("read")}
          aria-current={activeTab === "read" ? "page" : undefined}
        >
          Read <span className={styles.tabCount}>({readCount})</span>
        </button>
      </nav>

      <ContactMessagesList
        messages={filteredMessages}
        onSelectMessage={(msg: AdminContactMessageDto) =>
          setSelectedMessageId(msg.id)
        }
        emptyMessage={emptyMessage}
      />

      <ContactMessageDetailModal
        message={selectedMessage}
        isOpen={selectedMessage !== null}
        onClose={() => setSelectedMessageId(null)}
      />
    </div>
  );
};
