"use client";

import { assignStaffAction } from "@/app/actions";
import { AdminUserForm } from "@/components/admin-user-form";
import { ActionButton } from "@/components/action-button";
import { CheckField } from "@/components/ui";
import {
  ADMIN_PERMISSIONS,
  adminPermissionLabels,
  type AdminPermission,
} from "@/lib/admin-permissions";

export function AdminStaffForm({
  userId,
  returnTo,
  current,
}: {
  userId: string;
  returnTo: string;
  current: AdminPermission[];
}) {
  return (
    <AdminUserForm
      action={assignStaffAction}
      className="admin-disclosure-body grid gap-4"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">派发权限</legend>
        <p className="text-xs text-muted">
          首位管理员始终拥有全部权限。这里只决定这位次级管理员能进哪些后台。
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ADMIN_PERMISSIONS.map((permission) => (
            <CheckField
              key={permission}
              name={"permission-" + permission}
              defaultSelected={current.includes(permission)}
            >
              {adminPermissionLabels[permission]}
            </CheckField>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <ActionButton
          name="staffAction"
          value="save"
          variant="secondary"
          pendingLabel="正在保存…"
        >
          保存为次级管理员
        </ActionButton>
        {current.length ? (
          <ActionButton
            name="staffAction"
            value="revoke"
            variant="danger-soft"
            pendingLabel="正在撤销…"
          >
            撤销管理员
          </ActionButton>
        ) : null}
      </div>
    </AdminUserForm>
  );
}
