import React from "react";
import { AdminSpaSectionDto } from "../../../api/types";
import styles from "./sections.module.css";

interface SpaSectionsListProps {
  sections: AdminSpaSectionDto[];
  onEdit: (section: AdminSpaSectionDto) => void;
  onDelete: (section: AdminSpaSectionDto) => void;
}

export const SpaSectionsList: React.FC<SpaSectionsListProps> = ({
  sections,
  onEdit,
  onDelete,
}) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Order</th>
            <th>Title</th>
            <th>Nav Label</th>
            <th>Key</th>
            <th>Status</th>
            <th>Blocks</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <tr key={section.id}>
              <td style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>
                #{section.sort_order}
              </td>
              <td style={{ fontWeight: 600 }}>{section.title}</td>
              <td>{section.navigation_label || "—"}</td>
              <td>
                <span className={styles.keyChip}>{section.key}</span>
              </td>
              <td>
                <span
                  className={`${styles.badge} ${
                    section.is_visible
                      ? styles.badgeVisible
                      : styles.badgeHidden
                  }`}
                >
                  {section.is_visible ? "Visible" : "Hidden"}
                </span>
              </td>
              <td>{section.content_block_count}</td>
              <td>
                <div
                  className={styles.actionGroup}
                  style={{ justifyContent: "flex-end" }}
                >
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={() => onEdit(section)}
                    aria-label={`Edit section ${section.title}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => onDelete(section)}
                    aria-label={`Delete section ${section.title}`}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
