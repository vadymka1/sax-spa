import { FontFamily, FontSize } from "../../api/types";
import styles from "./blocks/ContentBlock.module.css";

export const FONT_FAMILY_CLASS: Record<FontFamily, string> = {
  sans: styles.fontSans ?? "",
  serif: styles.fontSerif ?? "",
  display: styles.fontDisplay ?? "",
  mono: styles.fontMono ?? "",
};

export const FONT_SIZE_CLASS: Record<FontSize, string> = {
  sm: styles.fontSizeSm ?? "",
  md: styles.fontSizeMd ?? "",
  lg: styles.fontSizeLg ?? "",
  xl: styles.fontSizeXl ?? "",
  "2xl": styles.fontSize2xl ?? "",
};

export const FONT_FAMILY_LABELS: Record<FontFamily, string> = {
  sans: "Sans Serif",
  serif: "Serif",
  display: "Display",
  mono: "Monospace",
};

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
  xl: "Extra Large",
  "2xl": "2× Large",
};
