export type ReportWorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type ReportAction =
  "read" | "update-status" | "delete" | "manage-access";

const permissions: Record<ReportWorkspaceRole, Set<ReportAction>> = {
  owner: new Set(["read", "update-status", "delete", "manage-access"]),
  admin: new Set(["read", "update-status", "delete"]),
  member: new Set(["read", "update-status"]),
  viewer: new Set(["read"]),
};

export function canAccessWorkspaceReport(
  role: ReportWorkspaceRole,
  action: ReportAction,
): boolean {
  return permissions[role].has(action);
}
