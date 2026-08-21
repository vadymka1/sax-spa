import { useEffect, useRef } from "react";

export type FocusRestoreTarget = "trigger" | "fallback";

interface UseAdminDialogOptions {
  isOpen: boolean;
  onClose: () => void;
  isSubmitting?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  fallbackFocusRef?: React.RefObject<HTMLElement | null>;
  restoreFocusTarget?: FocusRestoreTarget;
}

export function useAdminDialog({
  isOpen,
  onClose,
  isSubmitting = false,
  initialFocusRef,
  fallbackFocusRef,
  restoreFocusTarget = "trigger",
}: UseAdminDialogOptions) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const restoreTargetRef = useRef<FocusRestoreTarget>(restoreFocusTarget);

  if (isOpen) {
    // Synchronously reset default restore target to "trigger" when opening, unless caller set fallback
    if (!restoreTargetRef.current || restoreTargetRef.current === "fallback") {
      restoreTargetRef.current = restoreFocusTarget;
    }
  }

  const prepareFocusRestore = (target: FocusRestoreTarget) => {
    restoreTargetRef.current = target;
  };

  useEffect(() => {
    if (isOpen) {
      restoreTargetRef.current = restoreFocusTarget;
      if (
        document.activeElement &&
        document.activeElement !== document.body &&
        !dialogRef.current?.contains(document.activeElement)
      ) {
        triggerRef.current = document.activeElement as HTMLElement;
      }

      const timer = setTimeout(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else if (dialogRef.current) {
          const focusables = getFocusableElements(dialogRef.current);
          if (focusables.length > 0 && focusables[0]) {
            focusables[0].focus();
          }
        }
      }, 0);

      const fallbackEl = fallbackFocusRef?.current ?? null;

      return () => {
        clearTimeout(timer);

        const trigger = triggerRef.current;
        const fallback = fallbackEl;
        const target = restoreTargetRef.current;

        setTimeout(() => {
          if (target === "fallback") {
            if (fallback && document.body.contains(fallback)) {
              fallback.focus();
            } else if (trigger && document.body.contains(trigger)) {
              trigger.focus();
            }
          } else {
            if (trigger && document.body.contains(trigger)) {
              trigger.focus();
            } else if (fallback && document.body.contains(fallback)) {
              fallback.focus();
            }
          }
        }, 0);
      };
    }
    return undefined;
  }, [isOpen, initialFocusRef, fallbackFocusRef, restoreFocusTarget]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!isSubmitting) {
          event.preventDefault();
          prepareFocusRestore("trigger");
          onClose();
        }
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusables = getFocusableElements(dialogRef.current);
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (
            document.activeElement === firstElement ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (
            document.activeElement === lastElement ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  return { dialogRef, prepareFocusRestore };
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    },
  );
}
