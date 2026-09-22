import { describe, expect, it } from "vitest";
import { BOX_TYPES, type BoxRole } from "../types.js";
import { boxVisibleForRole, ROLE_LABELS, SIDEBAR_ROLES, sidebarRoleFromStored } from "./boxRoles.js";

describe("sidebar box-role filtering", () => {
  it("exposes Security as a selectable palette role and falls back on stale values", () => {
    const security: BoxRole = "security";
    expect(SIDEBAR_ROLES).toContain(security);
    expect(ROLE_LABELS.security).toMatch(/Security/);
    expect(sidebarRoleFromStored("security")).toBe("security");
    expect(sidebarRoleFromStored("old-role")).toBe("all");
    expect(sidebarRoleFromStored(null)).toBe("all");
  });

  it("shows all security workers and shared inputs without changing everyone semantics", () => {
    for (const type of ["assetmapper", "reqelicitor", "nistgap", "securityadvisor"] as const) {
      expect(boxVisibleForRole(BOX_TYPES[type], "security")).toBe(true);
      expect(boxVisibleForRole(BOX_TYPES[type], "developer")).toBe(true);
    }
    expect(boxVisibleForRole(BOX_TYPES.idea, "security")).toBe(true);
    expect(boxVisibleForRole(BOX_TYPES.documents, "security")).toBe(true);
  });

  it("keeps unrelated role-only boxes out of Security", () => {
    expect(boxVisibleForRole(BOX_TYPES["sdlc-intent"], "security")).toBe(false);
    expect(boxVisibleForRole(BOX_TYPES["sdlc-intent"], "sdlc")).toBe(true);
  });
});
