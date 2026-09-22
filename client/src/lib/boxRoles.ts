import type { BoxRole, BoxTypeMeta } from "../types.js";

export type SidebarRole = "all" | Exclude<BoxRole, "everyone">;

export const SIDEBAR_ROLES: readonly Exclude<BoxRole, "everyone">[] = [
  "designer",
  "developer",
  "product",
  "security",
  "sdlc",
];

export const ROLE_LABELS: Record<Exclude<BoxRole, "everyone">, string> = {
  designer: "🎨 Designer",
  developer: "💻 Developer",
  product: "📊 Product",
  security: "🔐 Security",
  sdlc: "🔁 SDLC",
};

export function sidebarRoleFromStored(value: string | null): SidebarRole {
  return SIDEBAR_ROLES.includes(value as Exclude<BoxRole, "everyone">)
    ? value as Exclude<BoxRole, "everyone">
    : "all";
}

/** Palette discovery filter only; it does not grant access or authorize actions. */
export function boxVisibleForRole(meta: BoxTypeMeta, role: SidebarRole): boolean {
  return role === "all" || meta.roles.includes("everyone") || meta.roles.includes(role);
}
