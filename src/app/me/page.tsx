import {
  BadgeCheck,
  Clock,
  Eye,
  EyeOff,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { updateProfileAction } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/avatar";
import { requireUser } from "@/lib/auth";
import { reviewLabels, roleLabels, userStatusLabels } from "@/lib/format";

export const dynamic = "force-dynamic";

type MePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MePage({ searchParams }: MePageProps) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};
  const profile = user.profile;
  const saved = params.saved === "profile";
  const registered = params.registered === "1";
  const error = typeof params.error === "string" ? params.error : "";
  const externalAvatarUrl = profile?.avatarUrl?.startsWith("http")
    ? profile.avatarUrl
    : "";

  return (
    <main className="page-shell grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="grid content-start gap-4">
        <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <Avatar
              src={profile?.avatarUrl}
              name={profile?.displayName ?? user.username}
              size="lg"
            />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black">
                {profile?.displayName ?? user.username}
              </h1>
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                @{user.username}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-sm">
            <StatusLine
              icon={<UserRound className="h-4 w-4" />}
              label="账号状态"
              value={userStatusLabels[user.status]}
            />
            <StatusLine
              icon={<ShieldAlert className="h-4 w-4" />}
              label="资料审核"
              value={
                profile ? reviewLabels[profile.reviewStatus] : "未填写"
              }
            />
            <StatusLine
              icon={<Eye className="h-4 w-4" />}
              label="公开内容"
              value="头像 / 昵称 / 宣言"
            />
            <StatusLine
              icon={<EyeOff className="h-4 w-4" />}
              label="私密内容"
              value="战网 / 联系方式"
            />
          </div>
        </section>

        {registered ? (
          <Message tone="info">注册已提交，请完善资料后等待管理员审核。</Message>
        ) : null}
        {saved ? <Message tone="success">资料已保存，公开信息等待审核。</Message> : null}
        {error === "avatar-size" ? (
          <Message tone="warning">头像不能超过 512 KB。</Message>
        ) : null}
        {error === "avatar-type" ? (
          <Message tone="warning">头像只支持 PNG、JPEG、WebP 或 GIF。</Message>
        ) : null}
        {error === "profile" ? (
          <Message tone="warning">资料格式有误，请检查后重新提交。</Message>
        ) : null}
        {profile?.reviewNote ? (
          <Message tone="warning">审核备注：{profile.reviewNote}</Message>
        ) : null}
      </aside>

      <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--teal)]">
              Profile
            </p>
            <h2 className="mt-1 text-2xl font-black">我的资料</h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm font-bold text-[var(--muted)]">
            <Clock className="h-4 w-4" />
            修改后重新审核
          </span>
        </div>

        <form action={updateProfileAction} className="mt-6 grid gap-6">
          <fieldset className="grid gap-4">
            <legend className="mb-1 text-base font-black">公开卡片</legend>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="公开昵称" name="displayName" required defaultValue={profile?.displayName ?? ""} maxLength={20} />
              <Label label="上传头像">
                <input
                  className="focus-ring min-h-11 rounded-md border border-black/15 px-3 py-2 text-sm"
                  name="avatarFile"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                />
                <span className="text-xs font-medium text-[var(--muted)]">
                  PNG、JPEG、WebP 或 GIF，最大 512 KB。新头像需管理员重新审核。
                </span>
              </Label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="或使用头像链接" name="avatarUrl" defaultValue={externalAvatarUrl} placeholder="https://..." />
              {profile?.avatarUrl ? (
                <label className="flex items-center gap-2 self-end rounded-md bg-[#f5f7fb] px-3 py-3 text-sm font-semibold">
                  <input name="removeAvatar" type="checkbox" />
                  删除当前头像
                </label>
              ) : null}
            </div>
            <Label label="公开宣言">
              <textarea
                className="focus-ring min-h-24 resize-y rounded-md border border-black/15 px-3 py-2 text-base"
                name="slogan"
                maxLength={80}
                required
                defaultValue={profile?.slogan ?? ""}
              />
            </Label>
          </fieldset>

          <fieldset className="grid gap-4">
            <legend className="mb-1 text-base font-black">管理员可见资料</legend>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="战网 ID" name="battleTag" defaultValue={profile?.battleTag ?? ""} />
              <Label label="常用位置">
                <select
                  className="focus-ring min-h-11 rounded-md border border-black/15 px-3 text-base"
                  name="mainRole"
                  defaultValue={profile?.mainRole ?? ""}
                >
                  <option value="">暂不选择</option>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Label>
              <Field
                label="常用英雄"
                name="mainHeroes"
                defaultValue={profile?.mainHeroes.join("，") ?? ""}
                placeholder="安娜，源氏，莱因哈特"
              />
              <Field label="段位" name="rank" defaultValue={profile?.rank ?? ""} />
              <Field
                label="常在线时间"
                name="onlineTime"
                defaultValue={profile?.onlineTime ?? ""}
                placeholder="周五/周六晚"
              />
              <Field
                label="联系方式"
                name="contact"
                defaultValue={profile?.contact ?? ""}
                placeholder="QQ / 微信 / Discord，可留空"
              />
            </div>
            <Label label="补充备注">
              <textarea
                className="focus-ring min-h-28 resize-y rounded-md border border-black/15 px-3 py-2 text-base"
                name="extraNote"
                maxLength={300}
                defaultValue={profile?.extraNote ?? ""}
              />
            </Label>
          </fieldset>

          <div className="flex justify-end">
            <ActionButton className="bg-[var(--orange)] text-white hover:bg-[#dd6815]">
              保存资料
            </ActionButton>
          </div>
        </form>
      </section>
    </main>
  );
}

function StatusLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[#f5f7fb] px-3 py-2">
      <span className="inline-flex items-center gap-2 font-semibold text-[var(--muted)]">
        {icon}
        {label}
      </span>
      <span className="font-black">{value}</span>
    </div>
  );
}

function Message({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "info" | "success" | "warning";
}) {
  const styles = {
    info: "border-[var(--teal)]/30 bg-cyan-50 text-[#0c6f7b]",
    success: "border-[var(--green)]/30 bg-green-50 text-[#387a47]",
    warning: "border-[var(--orange)]/30 bg-orange-50 text-[#9b4f12]",
  };

  return (
    <p className={`rounded-md border px-4 py-3 text-sm font-semibold ${styles[tone]}`}>
      {tone === "success" ? (
        <BadgeCheck className="mr-2 inline h-4 w-4 align-text-bottom" />
      ) : null}
      {children}
    </p>
  );
}

function Label({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <Label label={label}>
      <input
        className="focus-ring min-h-11 rounded-md border border-black/15 px-3 text-base"
        name={name}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </Label>
  );
}
