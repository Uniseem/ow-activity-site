import { Check, Save, X } from "lucide-react";
import { reviewProfileAction, updateUserStatusAction } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { AdminNav } from "@/components/admin-nav";
import { Avatar } from "@/components/avatar";
import { EmptyState, PageHeading } from "@/components/page-heading";
import {
  Card,
  Chip,
  SelectField,
  StatusChip,
  TextAreaField,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { reviewLabels, roleLabels, userStatusLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { profile: true },
  });
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="Player management"
        title="用户与资料审核"
        description="审核玩家卡片，查看私密资料并管理账号状态。"
        action={<Chip variant="secondary">{users.length} 位用户</Chip>}
      />
      <AdminNav />
      <section className="grid gap-5" aria-label="用户列表">
        {users.length ? (
          users.map((user) => {
            const profile = user.profile;
            return (
              <Card
                key={user.id}
                className="grid gap-7 border border-border p-6 shadow-none lg:grid-cols-[1fr_290px]"
              >
                <div className="grid min-w-0 content-start gap-5">
                  <div className="flex items-start gap-4">
                    <Avatar
                      src={profile?.avatarUrl}
                      name={profile?.displayName ?? user.username}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <h2 className="break-words text-xl font-semibold">
                        {profile?.displayName ?? user.username}
                      </h2>
                      <p className="mt-1 text-xs text-muted">
                        @{user.username} ·{" "}
                        {user.role === "ADMIN" ? "管理员" : "玩家"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
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
                  </div>
                  {profile?.slogan ? (
                    <p className="text-sm leading-7 text-muted">
                      {profile.slogan}
                    </p>
                  ) : null}
                  {profile ? (
                    <dl className="grid gap-x-5 gap-y-4 rounded-2xl bg-surface-secondary p-5 sm:grid-cols-2">
                      <Info label="战网 ID" value={profile.battleTag} />
                      <Info
                        label="常用位置"
                        value={
                          profile.mainRole ? roleLabels[profile.mainRole] : null
                        }
                      />
                      <Info
                        label="常用英雄"
                        value={profile.mainHeroes.join("，")}
                      />
                      <Info label="段位" value={profile.rank} />
                      <Info label="在线时间" value={profile.onlineTime} />
                      <Info label="联系方式" value={profile.contact} />
                      <Info label="补充备注" value={profile.extraNote} />
                      <Info label="审核备注" value={profile.reviewNote} />
                    </dl>
                  ) : (
                    <p className="rounded-xl bg-surface-secondary p-5 text-sm text-muted">
                      用户还没有填写资料。
                    </p>
                  )}
                </div>
                <div className="grid content-start gap-6">
                  {profile ? (
                    <form action={reviewProfileAction} className="grid gap-4">
                      <input
                        type="hidden"
                        name="profileId"
                        value={profile.id}
                      />
                      <TextAreaField
                        label="审核备注"
                        name="reviewNote"
                        defaultValue={profile.reviewNote ?? ""}
                        placeholder="说明审核结果，玩家可以看到这条备注"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <ActionButton
                          name="decision"
                          value="APPROVED"
                          pendingLabel="处理中…"
                        >
                          <Check size={16} />
                          通过
                        </ActionButton>
                        <ActionButton
                          name="decision"
                          value="REJECTED"
                          variant="danger-soft"
                          pendingLabel="处理中…"
                        >
                          <X size={16} />
                          拒绝
                        </ActionButton>
                      </div>
                    </form>
                  ) : null}
                  <form
                    action={updateUserStatusAction}
                    className="grid gap-4 border-t border-separator pt-5"
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <SelectField
                      label="账号状态"
                      name="status"
                      options={userStatusLabels}
                      defaultValue={user.status}
                    />
                    <ActionButton variant="secondary" pendingLabel="更新中…">
                      <Save size={15} />
                      更新状态
                    </ActionButton>
                  </form>
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="暂无用户"
            description="新注册的玩家会出现在这里。"
          />
        )}
      </section>
    </main>
  );
}
function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6">
        {value || "未填写"}
      </dd>
    </div>
  );
}
