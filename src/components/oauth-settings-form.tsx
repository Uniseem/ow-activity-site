"use client";
import { useActionState, useState } from "react";
import { Checkbox } from "@heroui/react";
import { saveOAuthSettingsAction } from "@/app/admin/oauth/actions";
import { Button, Card, Chip, InputField, Notice } from "@/components/ui";
import { oauthNames, type OAuthProvider } from "@/lib/oauth/shared";

export function OAuthSettingsForm({
  initial,
  callbackUrl,
}: {
  initial: {
    provider: OAuthProvider;
    clientId: string;
    hasSecret: boolean;
    enabled: boolean;
    revision: number;
  };
  callbackUrl: string;
}) {
  const [clientId, setClientId] = useState(initial.clientId);
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(initial.enabled);
  const [clearSecret, setClearSecret] = useState(false);
  const [state, action, pending] = useActionState(
    async (
      previous: Parameters<typeof saveOAuthSettingsAction>[0],
      form: FormData,
    ) => {
      const result = await saveOAuthSettingsAction(previous, form);
      if (result.ok) {
        setSecret("");
        setClearSecret(false);
      }
      return result;
    },
    {
      ok: true,
      message: "",
      revision: initial.revision,
      hasSecret: initial.hasSecret,
      enabled: initial.enabled,
    },
  );
  const name = oauthNames[initial.provider];
  return (
    <Card className="gap-6 border border-border p-6 shadow-none sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{name} 登录</h2>
        <Chip color={state.enabled ? "success" : "default"} variant="soft">
          {state.enabled ? "已启用" : state.hasSecret ? "未启用" : "未配置"}
        </Chip>
      </div>
      <div className="grid gap-3 text-sm leading-7 text-muted">
        {initial.provider === "google" ? (
          <p>
            在{" "}
            <a
              className="text-accent underline"
              href="https://console.cloud.google.com/auth/clients"
              target="_blank"
              rel="noreferrer"
            >
              Google Cloud
            </a>{" "}
            创建“Web 应用”OAuth
            客户端，完成同意屏幕配置。如果应用处于测试模式，请添加测试用户。
          </p>
        ) : (
          <p>
            在{" "}
            <a
              className="text-accent underline"
              href="https://github.com/settings/developers"
              target="_blank"
              rel="noreferrer"
            >
              GitHub Developer Settings
            </a>{" "}
            中创建 OAuth App，将站点网址设为首页地址。
          </p>
        )}
        <InputField
          label="授权回调地址"
          value={callbackUrl}
          readOnly
          description={
            initial.provider === "google"
              ? "将此地址完整填入 Google 的 Authorized redirect URIs。"
              : "将此地址完整填入 GitHub 的 Authorization callback URL。"
          }
        />
      </div>
      <form
        action={action}
        className="grid gap-5"
        onResetCapture={(event) => event.preventDefault()}
      >
        <input type="hidden" name="provider" value={initial.provider} />
        <input type="hidden" name="revision" value={state.revision} />
        <InputField
          label="Client ID"
          name="clientId"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          autoComplete="off"
          maxLength={500}
          placeholder={`填写 ${name} Client ID`}
        />
        <InputField
          label="Client Secret"
          name="clientSecret"
          type="password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          autoComplete="new-password"
          maxLength={2000}
          placeholder={
            state.hasSecret
              ? "已保存，留空保留原密钥"
              : `填写 ${name} Client Secret`
          }
          description="密钥加密保存，保存后不会回显。"
        />
        {state.hasSecret ? (
          <Checkbox
            name="clearSecret"
            value="on"
            isSelected={clearSecret}
            onChange={setClearSecret}
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              清除已保存的密钥
            </Checkbox.Content>
          </Checkbox>
        ) : null}
        <Checkbox
          name="enabled"
          value="on"
          isSelected={enabled}
          onChange={setEnabled}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            启用 {name} 一键登录
          </Checkbox.Content>
        </Checkbox>
        {state.message ? (
          <Notice tone={state.ok ? "success" : "danger"}>
            {state.message}
          </Notice>
        ) : null}
        <Button
          type="submit"
          isDisabled={pending}
          isPending={pending}
          className="w-fit"
        >
          {pending ? "正在保存…" : `保存 ${name} 配置`}
        </Button>
      </form>
    </Card>
  );
}
