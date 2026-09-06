export const ADMIN_PERMISSIONS = [
  "events",
  "articles",
  "users",
  "customize",
  "oauth",
  "updates",
  "backup",
  "ai",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const adminPermissionLabels: Record<AdminPermission, string> = {
  events: "活动管理",
  articles: "文章管理",
  users: "用户与审核",
  customize: "基本设置",
  oauth: "第三方登录",
  updates: "版本更新",
  backup: "备份与恢复",
  ai: "AI 审核",
};

export const adminHrefPermission: Record<string, AdminPermission> = {
  "/admin/events": "events",
  "/admin/articles": "articles",
  "/admin/users": "users",
  "/admin/customize": "customize",
  "/admin/oauth": "oauth",
  "/admin/updates": "updates",
  "/admin/backup": "backup",
  "/admin/ai": "ai",
};

export type AdminActor = {
  id?: string;
  role?: string | null;
  status?: string | null;
  primaryAdmin?: boolean | null;
  adminPermissions?: readonly string[] | unknown;
} | null;

function permissionList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function isApprovedAdmin(user: AdminActor): boolean {
  return user?.role === "ADMIN" && user.status === "APPROVED";
}

export function isPrimaryAdmin(user: AdminActor): boolean {
  return isApprovedAdmin(user) && Boolean(user?.primaryAdmin);
}

export function parseGrantedPermissions(values: string[]): AdminPermission[] {
  return ADMIN_PERMISSIONS.filter((permission) => values.includes(permission));
}

export function grantedPermissions(user: AdminActor): AdminPermission[] {
  if (!isApprovedAdmin(user)) return [];
  if (user?.primaryAdmin) return [...ADMIN_PERMISSIONS];
  const listed = parseGrantedPermissions(permissionList(user?.adminPermissions));
  return listed.length ? listed : [...ADMIN_PERMISSIONS];
}

export function hasPermission<T extends AdminActor>(
  user: T,
  permission: AdminPermission,
): user is Exclude<T, null | undefined> {
  return grantedPermissions(user).includes(permission);
}

export function canSeeAdminHref(href: string, user: AdminActor): boolean {
  const path = href.split("?")[0] ?? href;
  const match = Object.keys(adminHrefPermission)
    .sort((left, right) => right.length - left.length)
    .find((prefix) => path === prefix || path.startsWith(prefix + "/"));
  return match ? hasPermission(user, adminHrefPermission[match]) : true;
}

export function adminRankLabel(user: {
  role?: string | null;
  primaryAdmin?: boolean | null;
}): string {
  if (user.role !== "ADMIN") return "";
  return user.primaryAdmin ? "首位管理员" : "次级管理员";
}

export function planStaffAssignment(input: {
  actor: AdminActor;
  target: {
    id: string;
    role: string;
    status: string;
    primaryAdmin: boolean;
  };
  action: "save" | "revoke";
  permissions: string[];
}):
  | { error: string }
  | {
      data: {
        role: "ADMIN" | "USER";
        status?: "APPROVED";
        primaryAdmin: false;
        adminPermissions: AdminPermission[];
      };
    } {
  if (!isPrimaryAdmin(input.actor))
    return { error: "只有首位管理员可以指定次级管理员并派发权限。" };
  if (input.actor?.id && input.actor.id === input.target.id)
    return { error: "不能修改自己的管理员身份。" };
  if (input.target.primaryAdmin)
    return { error: "首位管理员始终拥有全部权限，不能被改派或撤销。" };
  if (input.action === "revoke") {
    if (input.target.role !== "ADMIN")
      return { error: "该玩家还不是次级管理员。" };
    return {
      data: { role: "USER", primaryAdmin: false, adminPermissions: [] },
    };
  }
  const adminPermissions = parseGrantedPermissions(input.permissions);
  if (!adminPermissions.length)
    return { error: "请至少勾选一项要派发的权限。" };
  if (input.target.status === "BANNED")
    return { error: "已封禁的账号不能指定为管理员。" };
  return {
    data: {
      role: "ADMIN",
      status: "APPROVED",
      primaryAdmin: false,
      adminPermissions,
    },
  };
}

export function normalizeRestoredAdmins(
  users: Array<Record<string, unknown>>,
): void {
  const admins = users.filter((row) => row.role === "ADMIN");
  if (!admins.length) return;
  const primaries = admins.filter((row) => row.primaryAdmin === true);
  const primary = primaries[0] ?? admins[0];
  for (const admin of admins) {
    admin.primaryAdmin = admin === primary;
    const listed = parseGrantedPermissions(
      permissionList(admin.adminPermissions),
    );
    admin.adminPermissions = listed;
  }
}
