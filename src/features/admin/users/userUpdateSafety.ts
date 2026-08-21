import { UpdateUserRequest } from "../../../api/types";

/**
 * Validates self-deactivation safety rule for user update operations.
 * Returns a safety error message string if the current user attempts to deactivate their own active session,
 * or null if the update is allowed.
 */
export function getUserUpdateSafetyError(
  currentUserId: string | undefined,
  targetUserId: string,
  payload: UpdateUserRequest,
): string | null {
  if (
    currentUserId &&
    currentUserId === targetUserId &&
    payload.is_active === false
  ) {
    return "You cannot deactivate your own active session.";
  }
  return null;
}
