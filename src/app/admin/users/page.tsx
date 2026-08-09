import { Ban, Check, Clock, X } from "lucide-react";

import {
  reviewProfileAction,
  updateUserStatusAction,
} from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/avatar";
import { requireAdmin } from "@/lib/auth";
import {
  reviewLabels,
  roleLabels,
  userStatusLabels,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { profile: true },
  });

  return (
    <main className="page-shell grid gap-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--teal)]">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-black">用户与资料审核</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          公开展示只取审核通过的头像、昵称和宣言；详细资料只在这里给管理员查看。
        </p>
      </div>

      <section className="grid gap-4">
        {users.map((user) => {
          const profile = user.profile;

          return (
            <article
              key={user.id}
              className="grid gap-5 rounded-md border border-black/10 bg-white p-5 shadow-sm lg:grid-cols-[1fr_320px]"
            >
              <div className="grid gap-4">
                <div className="flex items-start gap-4">
                  <Avatar
                    src={profile?.avatarUrl}
                    name={profile?.displayName ?? user.username}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black">
                        {profile?.displayName ?? user.username}
                      </h2>
                      <StatusPill value={userStatusLabels[user.status]} />
                      <StatusPill
                        value={
                          profile ? reviewLabels[profile.reviewStatus] : "未填资料"
                        }
                      />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                      @{user.username} · {user.role === "ADMIN" ? "管理员" : "玩家"}
                    </p>
                    {profile?.slogan ? (
                      <p className="mt-3 text-base leading-7 text-[#2f3542]">
                        {profile.slogan}
                      </p>
                    ) : null}
                  </div>
                </div>

                {profile ? (
                  <div className="grid gap-3 rounded-md bg-[#f5f7fb] p-4 text-sm md:grid-cols-2">
                    <InfoLine label="战网 ID" value={profile.battleTag} />
                    <InfoLine
                      label="常用位置"
                      value={
                        profile.mainRole
                          ? roleLabels[profile.mainRole]
                          : null
                      }
                    />
                    <InfoLine
                      label="常用英雄"
                      value={profile.mainHeroes.join("，")}
                    />
                    <InfoLine label="段位" value={profile.rank} />
                    <InfoLine label="在线时间" value={profile.onlineTime} />
                    <InfoLine label="联系方式" value={profile.contact} />
                    <InfoLine label="备注" value={profile.extraNote} wide />
                    <InfoLine label="审核备注" value={profile.reviewNote} wide />
                  </div>
                ) : (
                  <p className="rounded-md bg-[#f5f7fb] p-4 text-sm font-semibold text-[var(--muted)]">
                    用户还没有填写资料。
                  </p>
                )}
              </div>

              <div className="grid content-start gap-3">
                {profile ? (
                  <form action={reviewProfileAction} className="grid gap-3">
                    <input type="hidden" name="profileId" value={profile.id} />
                    <label className="grid gap-2 text-sm font-semibold">
                      审核备注
                      <textarea
                        className="focus-ring min-h-24 resize-y rounded-md border border-black/15 px-3 py-2 text-base"
                        name="reviewNote"
                        defaultValue={profile.reviewNote ?? ""}
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton
                        name="decision"
                        value="APPROVED"
                        className="bg-[var(--green)] text-white hover:bg-[#3f884f]"
                      >
                        <Check className="h-4 w-4" />
                        通过
                      </ActionButton>
                      <ActionButton
                        name="decision"
                        value="REJECTED"
                        className="bg-[var(--red)] text-white hover:bg-[#aa4444]"
                      >
                        <X className="h-4 w-4" />
                        拒绝
                      </ActionButton>
                    </div>
                  </form>
                ) : null}

                <form action={updateUserStatusAction} className="grid gap-3">
                  <input type="hidden" name="userId" value={user.id} />
                  <label className="grid gap-2 text-sm font-semibold">
                    账号状态
                    <select
                      className="focus-ring min-h-11 rounded-md border border-black/15 px-3 text-base"
                      name="status"
                      defaultValue={user.status}
                    >
                      {Object.entries(userStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ActionButton className="border border-black/10 bg-white text-[#3d4451] hover:bg-black/5">
                    <Ban className="h-4 w-4" />
                    更新状态
                  </ActionButton>
                </form>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-black/10 px-2 py-1 text-xs font-bold text-[#3d4451]">
      <Clock className="h-3 w-3" />
      {value}
    </span>
  );
}

function InfoLine({
  label,
  value,
  wide,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
}) {
  return (
    <p className={wide ? "md:col-span-2" : ""}>
      <span className="font-black">{label}：</span>
      <span className="text-[var(--muted)]">{value || "未填写"}</span>
    </p>
  );
}
