import { useState, useEffect } from "react";

export function useActiveSection(sectionKeys: string[]): string | null {
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);

  useEffect(() => {
    if (sectionKeys.length === 0) {
      setActiveSectionKey(null);
      return;
    }

    // Gracefully handle missing IntersectionObserver in test/legacy environments
    if (
      typeof window === "undefined" ||
      typeof window.IntersectionObserver === "undefined"
    ) {
      return;
    }

    const visibleRatios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = entry.target.id;
          if (entry.isIntersecting) {
            visibleRatios.set(key, entry.intersectionRatio);
          } else {
            visibleRatios.delete(key);
          }
        });

        if (visibleRatios.size === 0) {
          return;
        }

        // Deterministically select the section with the highest intersection ratio
        let bestKey: string | null = null;
        let highestRatio = -1;

        sectionKeys.forEach((key) => {
          const ratio = visibleRatios.get(key);
          if (ratio !== undefined && ratio > highestRatio) {
            highestRatio = ratio;
            bestKey = key;
          }
        });

        if (bestKey) {
          setActiveSectionKey(bestKey);
        }
      },
      {
        // Compensate for top sticky header (-20%) and bottom viewport (-65%)
        rootMargin: "-20% 0px -65% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      },
    );

    sectionKeys.forEach((key) => {
      const element = document.getElementById(key);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sectionKeys]);

  return activeSectionKey;
}
