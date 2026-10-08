import { Locale } from "./locale";

const rawMessages = {
  en: {
    header: {
      brandFallback: "SPA Saxophone Ensemble",
      menuToggle: "Toggle navigation",
      menuClose: "✕ Menu",
      menuOpen: "☰ Menu",
      switchToEn: "Switch language to English",
      switchToDe: "Switch language to German",
      languageSelection: "Language selection",
    },
    nav: {
      mainNav: "Main navigation",
    },
    common: {
      loadingPage: "Loading page content...",
      errorLoadingPage: "Failed to load public page",
      retry: "Retry",
      noContentTitle: "No Content Available",
      noContentBody: "No content is available yet.",
      allRightsReserved: "All rights reserved.",
    },
    contact: {
      title: "Get in Touch",
      subtitle:
        "Have a question or looking to book a performance? Send a message below.",
      nameLabel: "Name",
      emailLabel: "Email",
      subjectLabel: "Subject (optional)",
      messageLabel: "Message",
      nameRequired: "Name is required.",
      nameMaxLength: "Name must not exceed 100 characters.",
      emailRequired: "Email is required.",
      emailInvalid: "Please enter a valid email address.",
      emailMaxLength: "Email must not exceed 255 characters.",
      subjectMaxLength: "Subject must not exceed 200 characters.",
      messageRequired: "Message is required.",
      messageMinLength: "Message must be at least 10 characters long.",
      messageMaxLength: "Message must not exceed 5000 characters.",
      sendMessage: "Send Message",
      sendingMessage: "Sending...",
      successTitle: "Thank you!",
      successBody:
        "Your message has been sent successfully. We will get back to you soon.",
      sendAnother: "Send another message",
      errorFallback: "Failed to send your message. Please try again.",
      unexpectedError: "An unexpected error occurred. Please try again later.",
      requestId: "Request ID",
    },
    review: {
      title: "Leave a Review",
      subtitle: "Share your experience with our performances and recordings.",
      authorNameLabel: "Your name",
      authorNamePlaceholder: "e.g., Jane Doe",
      authorRoleLabel: "Your role / company",
      authorRolePlaceholder: "e.g., Festival Director, Critic (optional)",
      reviewTextLabel: "Your review",
      reviewTextPlaceholder: "Write your review here...",
      submitReview: "Submit review",
      submittingReview: "Submitting...",
      successTitle: "Review Submitted",
      successBody:
        "Thank you! Your review was submitted for moderation. It will appear after approval.",
      errorTitle: "Submission Error",
      errorFallback: "Failed to submit your review. Please try again.",
      unexpectedError: "An unexpected error occurred. Please try again.",
      nameRequired: "Name is required.",
      nameMaxLength: "Name must not exceed 120 characters.",
      roleMaxLength: "Role/company must not exceed 160 characters.",
      textRequired: "Review is required.",
      textMaxLength: "Review must not exceed 3000 characters.",
    },
  },
  de: {
    header: {
      brandFallback: "SPA Saxophon-Ensemble",
      menuToggle: "Navigation umschalten",
      menuClose: "✕ Menü",
      menuOpen: "☰ Menü",
      switchToEn: "Sprache auf Englisch umstellen",
      switchToDe: "Sprache auf Deutsch umstellen",
      languageSelection: "Sprachauswahl",
    },
    nav: {
      mainNav: "Hauptnavigation",
    },
    common: {
      loadingPage: "Inhalte werden geladen...",
      errorLoadingPage: "Öffentliche Seite konnte nicht geladen werden",
      retry: "Wiederholen",
      noContentTitle: "Kein Inhalt verfügbar",
      noContentBody: "Derzeit sind keine Inhalte verfügbar.",
      allRightsReserved: "Alle Rechte vorbehalten.",
    },
    contact: {
      title: "Kontaktieren Sie uns",
      subtitle:
        "Haben Sie eine Frage oder möchten Sie einen Auftritt buchen? Senden Sie uns eine Nachricht.",
      nameLabel: "Name",
      emailLabel: "E-Mail",
      subjectLabel: "Betreff (optional)",
      messageLabel: "Nachricht",
      nameRequired: "Name ist erforderlich.",
      nameMaxLength: "Name darf maximal 100 Zeichen lang sein.",
      emailRequired: "E-Mail ist erforderlich.",
      emailInvalid: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
      emailMaxLength: "E-Mail darf maximal 255 Zeichen lang sein.",
      subjectMaxLength: "Betreff darf maximal 200 Zeichen lang sein.",
      messageRequired: "Nachricht ist erforderlich.",
      messageMinLength: "Nachricht muss mindestens 10 Zeichen lang sein.",
      messageMaxLength: "Nachricht darf maximal 5000 Zeichen lang sein.",
      sendMessage: "Nachricht senden",
      sendingMessage: "Wird gesendet...",
      successTitle: "Vielen Dank!",
      successBody:
        "Ihre Nachricht wurde erfolgreich gesendet. Wir werden uns in Kürze bei Ihnen melden.",
      sendAnother: "Weitere Nachricht senden",
      errorFallback:
        "Ihre Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
      unexpectedError:
        "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
      requestId: "Anfrage-ID",
    },
    review: {
      title: "Bewertung abgeben",
      subtitle:
        "Teilen Sie Ihre Erfahrungen mit unseren Auftritten und Aufnahmen.",
      authorNameLabel: "Ihr Name",
      authorNamePlaceholder: "z. B. Max Mustermann",
      authorRoleLabel: "Ihre Rolle / Unternehmen",
      authorRolePlaceholder: "z. B. Festivalleiter, Kritiker (optional)",
      reviewTextLabel: "Ihre Bewertung",
      reviewTextPlaceholder: "Schreiben Sie Ihre Bewertung hier...",
      submitReview: "Bewertung abschicken",
      submittingReview: "Wird gesendet...",
      successTitle: "Bewertung eingereicht",
      successBody:
        "Vielen Dank! Ihre Bewertung wurde zur Moderation eingereicht. Sie wird nach Genehmigung erscheinen.",
      errorTitle: "Fehler beim Absenden",
      errorFallback:
        "Ihre Bewertung konnte nicht eingereicht werden. Bitte versuchen Sie es erneut.",
      unexpectedError:
        "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
      nameRequired: "Name ist erforderlich.",
      nameMaxLength: "Name darf maximal 120 Zeichen lang sein.",
      roleMaxLength: "Rolle/Unternehmen darf maximal 160 Zeichen lang sein.",
      textRequired: "Bewertung ist erforderlich.",
      textMaxLength: "Bewertung darf maximal 3000 Zeichen lang sein.",
    },
  },
};

export type Messages = typeof rawMessages.en;
export type MessageSection = keyof Messages;

export const uiMessages: Record<Locale, Messages> = rawMessages;

export function t<
  S extends MessageSection,
  K extends keyof (typeof rawMessages.en)[S],
>(locale: Locale, section: S, key: K): string {
  const sectionMsgs = uiMessages[locale]?.[section] ?? uiMessages.en[section];
  const msg = sectionMsgs[key];
  return typeof msg === "string" ? msg : "";
}
