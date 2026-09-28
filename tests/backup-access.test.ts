import test from "node:test";
import assert from "node:assert/strict";
import {
  SETUP_BACKUP_OWNER_ID,
  canRunBackupOperation,
  resolveBackupAccess,
} from "../src/lib/backup-access";

const primary = {
  id: "p1",
  role: "ADMIN" as const,
  status: "APPROVED" as const,
  primaryAdmin: true,
  adminPermissions: [] as string[],
};
const deputy = {
  id: "d1",
  role: "ADMIN" as const,
  status: "APPROVED" as const,
  primaryAdmin: false,
  adminPermissions: ["events"],
};

test("有备份权限的管理员仍走后台恢复，首次注册页不能下载当前站", () => {
  const admin = resolveBackupAccess({ user: primary, setupOpen: false });
  assert.equal(admin.ok, true);
  if (!admin.ok) return;
  assert.equal(admin.ownerId, "p1");
  assert.equal(admin.setup, false);
  assert.equal(admin.canExport, true);
  assert.equal(canRunBackupOperation(admin, "export"), true);

  const setup = resolveBackupAccess({ user: null, setupOpen: true });
  assert.equal(setup.ok, true);
  if (!setup.ok) return;
  assert.equal(setup.ownerId, SETUP_BACKUP_OWNER_ID);
  assert.equal(setup.setup, true);
  assert.equal(setup.canExport, false);
  assert.equal(canRunBackupOperation(setup, "import"), true);
  assert.equal(canRunBackupOperation(setup, "restore"), true);
  assert.equal(canRunBackupOperation(setup, "export"), false);
  assert.equal(canRunBackupOperation(setup, "download"), false);
});

test("入口关闭后，未登录或没有备份权限的人不能恢复", () => {
  const anonymous = resolveBackupAccess({ user: null, setupOpen: false });
  assert.deepEqual(anonymous, {
    ok: false,
    status: 401,
    message: "请先登录管理员账号。",
  });
  const denied = resolveBackupAccess({ user: deputy, setupOpen: false });
  assert.equal(denied.ok, false);
  if (denied.ok) return;
  assert.equal(denied.status, 403);
});
