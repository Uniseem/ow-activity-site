import { hasPermission, type AdminActor } from "@/lib/admin-permissions";

export const SETUP_BACKUP_OWNER_ID = "setup";

const SETUP_BACKUP_OPERATIONS = [
  "import",
  "upload",
  "preview",
  "restore",
  "cancel",
] as const;

export type BackupAccess =
  | { ok: true; ownerId: string; setup: boolean; canExport: boolean }
  | { ok: false; status: 401 | 403; message: string };

export function resolveBackupAccess(input: {
  user: AdminActor;
  setupOpen: boolean;
}): BackupAccess {
  if (hasPermission(input.user, "backup") && input.user.id) {
    return {
      ok: true,
      ownerId: input.user.id,
      setup: false,
      canExport: true,
    };
  }
  if (input.setupOpen) {
    return {
      ok: true,
      ownerId: SETUP_BACKUP_OWNER_ID,
      setup: true,
      canExport: false,
    };
  }
  if (!input.user) {
    return { ok: false, status: 401, message: "请先登录管理员账号。" };
  }
  return {
    ok: false,
    status: 403,
    message: "只有获得备份权限的管理员可以备份或恢复网站。",
  };
}

export function canRunBackupOperation(
  access: Extract<BackupAccess, { ok: true }>,
  operation: string,
) {
  return access.canExport || SETUP_BACKUP_OPERATIONS.some((item) => item === operation);
}
