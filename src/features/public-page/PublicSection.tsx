import React from "react";
import {
  PublicSpaSection,
  PublicContentBlock,
  PublicTestimonial,
} from "../../api/types";
import { ContactForm } from "./ContactForm";
import { ContentBlockRenderer } from "./ContentBlockRenderer";
import { LeaveReviewForm } from "./LeaveReviewForm";
import { TestimonialCarousel } from "./TestimonialCarousel";
import styles from "./PublicSection.module.css";

interface PublicSectionProps {
  section: PublicSpaSection;
  testimonials?: PublicTestimonial[];
}

export const PublicSection: React.FC<PublicSectionProps> = ({
  section,
  testimonials,
}) => {
  const isContactSection = section.key === "contact-us";
  const isTestimonialsSection = section.key === "testimonials";

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

      {isContactSection && <ContactForm />}
      {isTestimonialsSection && (
        <>
          <TestimonialCarousel testimonials={testimonials} />
          <LeaveReviewForm />
        </>
      )}
    </section>
  );
};
