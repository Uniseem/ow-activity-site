import { Check, X } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { reviewProfileAction, updateUserStatusAction } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { AdminUserForm } from "@/components/admin-user-form";
import { Avatar } from "@/components/avatar";
import { EmptyState, PageHeading } from "@/components/page-heading";
import {
  Button,
  ButtonLink,
  InputField,
  Notice,
  SelectField,
  StatusChip,
  TextAreaField,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { reviewLabels, roleLabels, userStatusLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const query = searchParams ? await searchParams : {};
  const status =
    typeof query.status === "string" &&
    ["PENDING", "APPROVED", "REJECTED", "BANNED"].includes(query.status)
      ? (query.status as keyof typeof userStatusLabels)
      : "all";
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const where: Prisma.UserWhereInput = {
    ...(status === "all"
      ? {}
      : status === "BANNED"
        ? { status: "BANNED" }
        : { profile: { is: { reviewStatus: status } } }),
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            {
              profile: {
                is: { displayName: { contains: q, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };
  const total = await prisma.user.count({ where });
  const page = Math.min(
    Math.max(1, Math.floor(Number(query.page) || 1)),
    Math.max(1, Math.ceil(total / 20)),
  );
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * 20,
    take: 20,
    include: { profile: true },
  });
  function href(nextStatus: string, nextPage = 1) {
    return (
      "/admin/users?" +
      new URLSearchParams({ status: nextStatus, q, page: String(nextPage) })
    );
  }
  const saved =
    query.saved === "APPROVED"
      ? "资料已通过审核，账号现已可参加活动。"
      : query.saved === "REJECTED"
        ? "资料已拒绝，玩家可查看备注后修改并重新提交。"
        : query.saved === "status"
          ? "账号状态已更新。"
          : "";
  const returnTo = href(status, page);
  return (
    <main className="page-shell">
      <PageHeading
        title="用户管理"
        description="展开玩家查看资料并审核，账号管理放在资料下方。"
      />
      <div className="admin-filter-bar">
        <nav aria-label="用户筛选" className="flex flex-wrap gap-1">
          {[
            ["all", "全部"],
            ["PENDING", "待审资料"],
            ["APPROVED", "已通过"],
            ["REJECTED", "已拒绝"],
            ["BANNED", "已封禁"],
          ].map(([value, label]) => (
            <ButtonLink
              key={value}
              href={href(value)}
              variant={status === value ? "primary" : "ghost"}
              size="sm"
            >
              {label}
            </ButtonLink>
          ))}
        </nav>
        <form action="/admin/users" className="flex items-end gap-2">
          <input type="hidden" name="status" value={status} />
          <InputField
            label="搜索用户"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="昵称或用户名"
          />
          <Button type="submit" variant="secondary">
            搜索
          </Button>
        </form>
      </div>
      {saved ? (
        <div className="mb-4">
          <Notice tone="success">{saved}</Notice>
        </div>
      ) : null}
      <section className="grid gap-3" aria-label="用户列表">
        {users.length ? (
          users.map((user) => {
            const profile = user.profile;
            const pending = profile?.reviewStatus === "PENDING";
            return (
              <details
                key={user.id}
                className="admin-disclosure admin-user-card rounded-xl border border-border bg-surface"
                open={status === "PENDING" && users.length === 1}
              >
                <summary>
                  <div className="admin-user-summary">
                    <Avatar
                      src={profile?.avatarUrl}
                      name={profile?.displayName ?? user.username}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words font-semibold">
                        {profile?.displayName ?? user.username}
                      </h2>
                      <p className="mt-1 break-all text-xs font-normal text-muted">
                        @{user.username}
                        {user.role === "ADMIN" ? " · 管理员" : ""}
                      </p>
                    </div>
                    <div className="admin-user-statuses flex flex-wrap gap-2">
                      <StatusChip
                        status={user.status}
                        label={"账号：" + userStatusLabels[user.status]}
                      />
                      <StatusChip
                        status={profile?.reviewStatus ?? "PENDING"}
                        label={
                          "资料：" +
                          (profile
                            ? reviewLabels[profile.reviewStatus]
                            : "未填写")
                        }
                      />
                    </div>
                  </div>
                </summary>
                <div className="admin-disclosure-body grid gap-5">
                  {profile ? (
                    <>
                      <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Info label="战网 ID" value={profile.battleTag} />
                        <Info
                          label="常用位置"
                          value={
                            profile.mainRole
                              ? roleLabels[profile.mainRole]
                              : null
                          }
                        />
                        <Info
                          label="常用英雄"
                          value={profile.mainHeroes.join("，")}
                        />
                        <Info label="段位" value={profile.rank} />
                        <Info label="在线时间" value={profile.onlineTime} />
                        <Info label="联系方式" value={profile.contact} />
                        <Info label="个人签名" value={profile.slogan} />
                        <Info label="补充备注" value={profile.extraNote} />
                        {!pending ? (
                          <Info label="审核备注" value={profile.reviewNote} />
                        ) : null}
                      </dl>
                      <details
                        className="admin-disclosure border-t border-border"
                        open={pending}
                      >
                        <summary>
                          {pending ? "审核资料" : "修改审核结果"}
                        </summary>
                        <AdminUserForm
                          action={reviewProfileAction}
                          className="admin-disclosure-body grid gap-4"
                        >
                          <input
                            type="hidden"
                            name="profileId"
                            value={profile.id}
                          />
                          <input
                            type="hidden"
                            name="returnTo"
                            value={returnTo}
                          />
                          <TextAreaField
                            label="审核备注（可选）"
                            name="reviewNote"
                            defaultValue={profile.reviewNote ?? ""}
                            placeholder="玩家会看到这条备注"
                          />
                          <div className="flex flex-wrap gap-2">
                            {profile.reviewStatus !== "APPROVED" ? (
                              <ActionButton
                                name="decision"
                                value="APPROVED"
                                pendingLabel="正在审核…"
                              >
                                <Check size={16} />
                                通过资料
                              </ActionButton>
                            ) : null}
                            {profile.reviewStatus !== "REJECTED" ? (
                              <ActionButton
                                name="decision"
                                value="REJECTED"
                                variant="danger-soft"
                                pendingLabel="正在审核…"
                              >
                                <X size={16} />
                                拒绝资料
                              </ActionButton>
                            ) : null}
                          </div>
                        </AdminUserForm>
                      </details>
                    </>
                  ) : (
                    <p className="text-sm text-muted">
                      用户尚未填写资料，无需审核。
                    </p>
                  )}
                  <details className="admin-disclosure border-t border-border">
                    <summary>账号状态管理</summary>
                    <AdminUserForm
                      key={`${user.id}:${user.status}`}
                      action={updateUserStatusAction}
                      className="admin-disclosure-body grid max-w-md gap-4"
                    >
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <SelectField
                        label="账号状态"
                        name="status"
                        options={userStatusLabels}
                        defaultValue={user.status}
                      />
                      <p className="text-xs text-muted">
                        封禁后，该用户将无法报名参加活动。
                      </p>
                      <ActionButton
                        className="w-fit"
                        variant="secondary"
                        pendingLabel="正在更新…"
                      >
                        保存账号状态
                      </ActionButton>
                    </AdminUserForm>
                  </details>
                </div>
              </details>
            );
          })
        ) : (
          <EmptyState
            title="没有符合条件的用户"
            description="试试其他筛选条件，新的资料申请会出现在“待审资料”中。"
          />
        )}
      </section>
      <div className="admin-pagination">
        <span>共 {total} 位用户</span>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <ButtonLink
              href={href(status, page - 1)}
              variant="secondary"
              size="sm"
            >
              上一页
            </ButtonLink>
          ) : null}
          <span>
            {page} / {Math.max(1, Math.ceil(total / 20))}
          </span>
          {page * 20 < total ? (
            <ButtonLink
              href={href(status, page + 1)}
              variant="secondary"
              size="sm"
            >
              下一页
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </main>
  );
}
function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
        {value || "未填写"}
      </dd>
    </div>
  );
}
