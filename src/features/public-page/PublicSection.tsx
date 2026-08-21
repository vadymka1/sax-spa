import React from "react";
import { PublicSpaSection, PublicContentBlock } from "../../api/types";
import { ContentBlockRenderer } from "./ContentBlockRenderer";
import styles from "./PublicSection.module.css";

interface PublicSectionProps {
  section: PublicSpaSection;
}

export const PublicSection: React.FC<PublicSectionProps> = ({ section }) => {
  return (
    <section id={section.key} className={styles.section}>
      <h2 className={styles.sectionTitle}>{section.title}</h2>

      {section.blocks.length > 0 && (
        <div className={styles.blocksContainer}>
          {section.blocks.map((block: PublicContentBlock) => (
            <ContentBlockRenderer key={block.id} block={block} />
          ))}
        </div>
      )}
    </section>
  );
};
