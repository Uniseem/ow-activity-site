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
      previous: Parameters<typeof saveOAuthSettingsAction>[0] & {
        savedClientId: string;
      },
      form: FormData,
    ) => {
      const result = await saveOAuthSettingsAction(previous, form);
      if (result.ok) {
        setSecret("");
        setClearSecret(false);
        setEnabled(result.enabled);
      }
      return {
        ...result,
        savedClientId: result.ok
          ? String(form.get("clientId") ?? "").trim()
          : previous.savedClientId,
      };
    },
    {
      ok: true,
      message: "",
      revision: initial.revision,
      hasSecret: initial.hasSecret,
      enabled: initial.enabled,
      savedClientId: initial.clientId,
    },
  );
  const name = oauthNames[initial.provider];
  const dirty =
    clientId.trim() !== state.savedClientId ||
    Boolean(secret) ||
    clearSecret ||
    enabled !== state.enabled;
  return (
    <Card className="gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">{name} 登录</h2>
        <Chip color={state.enabled ? "success" : "default"} variant="soft">
          {state.enabled ? "已启用" : state.hasSecret ? "未启用" : "未配置"}
        </Chip>
      </div>
      <p className="text-sm text-muted">
        {state.enabled
          ? "登录页已开放此登录方式。"
          : "配置完成并启用后，登录页按钮才可使用。"}
      </p>
      <details
        className="admin-disclosure border-t border-border"
        open={!initial.hasSecret}
      >
        <summary>{state.hasSecret ? "修改登录配置" : "填写登录配置"}</summary>
        <form
          action={action}
          className="admin-disclosure-body grid gap-5"
          onResetCapture={(event) => event.preventDefault()}
        >
          <input type="hidden" name="provider" value={initial.provider} />
          <input type="hidden" name="revision" value={state.revision} />
          <fieldset disabled={pending} className="grid min-w-0 gap-5">
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
              description="密钥加密保存，不会回显。"
            />
            <Checkbox
              name="enabled"
              value="on"
              isSelected={enabled}
              isDisabled={pending}
              onChange={setEnabled}
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                启用 {name} 一键登录
              </Checkbox.Content>
            </Checkbox>
            <details className="admin-disclosure border-t border-border">
              <summary>回调地址与配置说明</summary>
              <div className="admin-disclosure-body grid gap-3 text-sm leading-7 text-muted">
                <InputField label="授权回调地址" value={callbackUrl} readOnly />
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
                    创建 Web 应用 OAuth
                    客户端，完成同意屏幕配置，将上面的地址完整填入 Authorized
                    redirect URIs。测试模式下需添加测试用户。
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
                    创建 OAuth App，将上面的地址完整填入 Authorization callback
                    URL。
                  </p>
                )}
              </div>
            </details>
            {state.hasSecret ? (
              <details className="admin-disclosure border-t border-border">
                <summary>清除密钥</summary>
                <div className="admin-disclosure-body">
                  <Checkbox
                    name="clearSecret"
                    value="on"
                    isSelected={clearSecret}
                    isDisabled={pending}
                    onChange={setClearSecret}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      清除已保存的密钥
                    </Checkbox.Content>
                  </Checkbox>
                </div>
              </details>
            ) : null}
          </fieldset>
          <div className="admin-settings-footer">
            <p className="text-xs text-muted">
              {dirty
                ? "有未保存的修改"
                : state.revision > 0
                  ? "配置已保存"
                  : "尚未保存配置"}
            </p>
            <Button
              type="submit"
              isDisabled={pending || !dirty}
              isPending={pending}
            >
              {pending ? "正在保存…" : "保存配置"}
            </Button>
          </div>
          {state.message && (!state.ok || !dirty) ? (
            <Notice tone={state.ok ? "success" : "danger"}>
              {state.message}
            </Notice>
          ) : null}
        </form>
      </details>
    </Card>
  );
}
