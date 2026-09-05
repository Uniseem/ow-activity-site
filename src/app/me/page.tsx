import { Eye, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { updateProfileAction } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/avatar";
import { PageHeading } from "@/components/page-heading";
import {
  ButtonLink,
  Card,
  CheckField,
  InputField,
  Notice,
  SelectField,
  StatusChip,
  TextAreaField,
} from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { reviewLabels, roleLabels, userStatusLabels } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function MePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const query = searchParams ? await searchParams : {};
  const profile = user.profile;
  const errors: Record<string, string> = {
    "avatar-size": "头像不能超过 512 KB。",
    "avatar-type": "头像只支持 PNG、JPEG、WebP 或 GIF。",
    profile: "资料格式有误，请检查后重新提交。",
  };
  const error =
    typeof query.error === "string" ? errors[query.error] : undefined;
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="Your player profile"
        title="个人中心"
        description="让队友认识你，也让每一次组队更合拍。"
      />
      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="grid gap-4">
          <Card className="gap-5 border border-border p-6 shadow-none">
            <Avatar
              src={profile?.avatarUrl}
              name={profile?.displayName ?? user.username}
              size="lg"
            />
            <div>
              <h2 className="break-words text-xl font-semibold">
                {profile?.displayName ?? user.username}
              </h2>
              <p className="mt-1 text-sm text-muted">@{user.username}</p>
            </div>
            <p className="text-sm leading-6 text-muted">
              {profile?.slogan || "写一句宣言，让队友认识你。"}
            </p>
            <div className="grid gap-3 border-t border-separator pt-5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted">账号状态</span>
                <StatusChip
                  status={user.status}
                  label={userStatusLabels[user.status]}
                />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted">资料审核</span>
                <StatusChip
                  status={profile?.reviewStatus ?? "PENDING"}
                  label={
                    profile ? reviewLabels[profile.reviewStatus] : "未填写"
                  }
                />
              </div>
            </div>
            <ButtonLink href="/events" variant="secondary" className="w-full">
              去看看活动
            </ButtonLink>
          </Card>
          <Notice>
            <ShieldCheck size={16} className="mb-2" />
            资料保存后，管理员会审核你的公开信息。账号与资料均通过审核后即可报名。
          </Notice>
          {profile?.reviewNote ? (
            <Notice tone="warning">审核备注：{profile.reviewNote}</Notice>
          ) : null}
        </aside>
        <div className="grid min-w-0 gap-4">
          {query.registered === "1" ? (
            <Notice tone="success">
              注册成功！请完善资料，等待管理员审核。
            </Notice>
          ) : null}
          {query.saved === "profile" ? (
            <Notice tone="success">
              {user.role === "ADMIN"
                ? "资料已保存。"
                : "资料已保存，请等待管理员审核。"}
            </Notice>
          ) : null}
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <Card className="border border-border p-6 shadow-none sm:p-8">
            <form action={updateProfileAction} className="grid gap-8">
              <fieldset className="form-section">
                <legend>
                  <span className="flex items-center gap-2">
                    <Eye size={18} className="text-accent" />
                    公开玩家卡片
                  </span>
                </legend>
                <p className="text-xs leading-6 text-muted">
                  头像、昵称、宣言、常用位置和英雄，审核通过后会公开展示。
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  <InputField
                    label="公开昵称"
                    name="displayName"
                    required
                    minLength={2}
                    maxLength={20}
                    defaultValue={profile?.displayName ?? ""}
                  />
                  <SelectField
                    label="常用位置"
                    name="mainRole"
                    defaultValue={profile?.mainRole ?? ""}
                    options={{ "": "暂不选择", ...roleLabels }}
                  />
                  <InputField
                    label="上传头像"
                    name="avatarFile"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    description="PNG、JPEG、WebP 或 GIF，最大 512 KB。"
                    className="text-xs"
                  />
                  <InputField
                    label="或使用头像链接"
                    name="avatarUrl"
                    type="url"
                    defaultValue={
                      profile?.avatarUrl?.startsWith("http")
                        ? profile.avatarUrl
                        : ""
                    }
                    placeholder="https://…"
                  />
                </div>
                {profile?.avatarUrl ? (
                  <CheckField name="removeAvatar">删除当前头像</CheckField>
                ) : null}
                <InputField
                  label="常用英雄"
                  name="mainHeroes"
                  defaultValue={profile?.mainHeroes.join("，") ?? ""}
                  placeholder="安娜，源氏，莱因哈特"
                  description="多个英雄用逗号分隔。"
                />
                <TextAreaField
                  label="公开宣言"
                  name="slogan"
                  required
                  maxLength={80}
                  defaultValue={profile?.slogan ?? ""}
                  description="最多 80 字，分享你的开黑态度。"
                />
              </fieldset>
              <fieldset className="form-section border-t border-separator pt-7">
                <legend>
                  <span className="flex items-center gap-2">
                    <LockKeyhole size={18} className="text-accent" />
                    私密资料
                  </span>
                </legend>
                <p className="text-xs leading-6 text-muted">
                  仅你和管理员可见，用于安排活动与联系。
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  <InputField
                    label="战网 ID"
                    name="battleTag"
                    defaultValue={profile?.battleTag ?? ""}
                    placeholder="昵称#1234"
                  />
                  <InputField
                    label="段位"
                    name="rank"
                    defaultValue={profile?.rank ?? ""}
                    placeholder="填写你的当前段位"
                  />
                  <InputField
                    label="常在线时间"
                    name="onlineTime"
                    defaultValue={profile?.onlineTime ?? ""}
                    placeholder="周五、周六晚上"
                  />
                  <InputField
                    label="联系方式"
                    name="contact"
                    defaultValue={profile?.contact ?? ""}
                    placeholder="QQ / 微信 / Discord，可留空"
                  />
                </div>
                <TextAreaField
                  label="补充备注"
                  name="extraNote"
                  maxLength={300}
                  defaultValue={profile?.extraNote ?? ""}
                  placeholder="还有什么想告诉管理员的？"
                />
              </fieldset>
              <div className="flex justify-end border-t border-separator pt-5">
                <ActionButton pendingLabel="保存中…">
                  <Save size={16} />
                  保存资料
                </ActionButton>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
