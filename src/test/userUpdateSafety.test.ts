import { describe, expect, it } from "vitest";
import { getUserUpdateSafetyError } from "../features/admin/users/userUpdateSafety";

describe("getUserUpdateSafetyError — self-deactivation safety rule", () => {
  const currentUserId = "10000000-0000-4000-8000-000000000001";
  const otherUserId = "20000000-0000-4000-8000-000000000002";

  it("rejects deactivating the currently authenticated user (currentUserId === targetUserId AND is_active === false)", () => {
    const error = getUserUpdateSafetyError(currentUserId, currentUserId, {
      is_active: false,
    });
    expect(error).toBe("You cannot deactivate your own active session.");
  });

  it("allows active updates to the currently authenticated user (currentUserId === targetUserId AND is_active === true)", () => {
    const error = getUserUpdateSafetyError(currentUserId, currentUserId, {
      display_name: "Updated Super Admin",
      is_active: true,
    });
    expect(error).toBeNull();
  });

  it("allows deactivating a different user (currentUserId !== targetUserId AND is_active === false)", () => {
    const error = getUserUpdateSafetyError(currentUserId, otherUserId, {
      is_active: false,
    });
    expect(error).toBeNull();
  });
});
