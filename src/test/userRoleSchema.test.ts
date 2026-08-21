import { describe, it, expect } from "vitest";
import { UserDtoSchema } from "../api/types";

describe("Strict User Role Contract Validation", () => {
  const baseUser = {
    id: "813876e5-42d8-4fbb-91ea-72223a3bc990",
    email: "admin@spasax.com",
    display_name: "Admin User",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('accepts valid admin roles ("admin" and "super_admin")', () => {
    const adminUser = { ...baseUser, role: "admin" };
    const superAdminUser = { ...baseUser, role: "super_admin" };

    const parseAdmin = UserDtoSchema.safeParse(adminUser);
    expect(parseAdmin.success).toBe(true);
    if (parseAdmin.success) {
      expect(parseAdmin.data.role).toBe("admin");
    }

    const parseSuperAdmin = UserDtoSchema.safeParse(superAdminUser);
    expect(parseSuperAdmin.success).toBe(true);
    if (parseSuperAdmin.success) {
      expect(parseSuperAdmin.data.role).toBe("super_admin");
    }
  });

  it('rejects unsupported user roles cleanly ("root", "mega_admin", "viewer")', () => {
    const invalidRoles = ["root", "mega_admin", "viewer", "guest", ""];

    for (const invalidRole of invalidRoles) {
      const invalidUser = { ...baseUser, role: invalidRole };
      const result = UserDtoSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    }
  });
});
