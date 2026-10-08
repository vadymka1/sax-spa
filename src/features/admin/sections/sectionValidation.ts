export interface ValidateGermanSectionTranslationParams {
  exists: boolean;
  name: string;
  navigationLabel: string;
}

/**
 * Validates German translation input for SPA section create and edit modals.
 *
 * Rules:
 * - When creating a new German translation (it does not exist yet):
 *   German section name is required if German navigation label is entered.
 *   If both fields are empty, German translation is omitted (valid).
 * - When editing an existing German translation:
 *   German section name cannot be empty if German navigation label is entered.
 *   Changing only navigation label is valid (existing name is preserved).
 */
export function validateGermanSectionTranslation({
  exists,
  name,
  navigationLabel,
}: ValidateGermanSectionTranslationParams): string | null {
  const trimmedName = name.trim();
  const trimmedNav = navigationLabel.trim();

  // If German translation does not exist yet:
  // German section name is required when creating a German translation.
  if (!exists) {
    if (!trimmedName && trimmedNav) {
      return "German section name is required when creating a German translation.";
    }
  } else {
    // If German translation already exists:
    // German section name cannot be empty if navigation label is provided.
    if (!trimmedName && trimmedNav) {
      return "German section name is required.";
    }
  }

  return null;
}
