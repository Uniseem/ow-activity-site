"use client";
import { useActionState, useEffect, useState } from "react";
import { Button, Card, InputField, Notice } from "@/components/ui";
import { Checkbox } from "@heroui/react";
import { UpdateDetails } from "@/components/update-details";
import { saveUpdateSettingsAction } from "@/app/admin/updates/actions";
import {
  DEFAULT_REPOSITORY,
  type UpdateCheck,
  type UpdateSettingsView,
} from "@/lib/updates/shared";

export function UpdateSettingsForm({
  initial,
  currentSha,
}: {
  initial: UpdateSettingsView;
  currentSha: string;
}) {
  const [repository, setRepository] = useState(initial.repositoryUrl);
  const [branch, setBranch] = useState(initial.branch);
  const [hook, setHook] = useState("");
  const [clearHook, setClearHook] = useState(false);
  const [result, setResult] = useState<UpdateCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [state, action, pending] = useActionState(
    async (
      previous: Awaited<ReturnType<typeof saveUpdateSettingsAction>>,
      form: FormData,
    ) => {
      const saved = await saveUpdateSettingsAction(previous, form);
      if (saved.ok) {
        setRepository(saved.settings.repositoryUrl);
        setBranch(saved.settings.branch);
        setHook("");
        setClearHook(false);
        setResult(null);
        window.dispatchEvent(new Event("ow-update-settings-saved"));
      }
      return saved;
    },
    { ok: false, message: "", settings: initial },
  );
  useEffect(() => {
    function receive(event: Event) {
      setResult((event as CustomEvent<UpdateCheck>).detail);
    }
    window.addEventListener("ow-update-result", receive);
    return () => window.removeEventListener("ow-update-result", receive);
  }, []);
  async function check() {
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/admin/updates?force=1", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "检查失败，请稍后重试。");
    } finally {
      setChecking(false);
    }
  }
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card className="gap-5 border border-border p-6 shadow-none">
        <div>
          <h2 className="section-title">更新来源</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            登录后自动检查；保持登录时每 5
            分钟检查一次。有更新时列出当前部署之后的提交。
          </p>
        </div>
        <form
          action={action}
          onResetCapture={(event) => event.preventDefault()}
          className="grid gap-5"
        >
          <input
            type="hidden"
            name="revision"
            value={state.settings.revision}
          />
          <InputField
            label="GitHub 仓库链接"
            name="repositoryUrl"
            type="url"
            required
            value={repository}
            onChange={(event) => setRepository(event.target.value)}
            maxLength={300}
            description="支持公开仓库，填写仓库首页链接。"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-fit"
            onPress={() => {
              setRepository(DEFAULT_REPOSITORY);
              setBranch("");
            }}
          >
            使用默认仓库
          </Button>
          <InputField
            label="监测分支（可选）"
            name="branch"
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
            maxLength={200}
            placeholder="留空使用仓库默认分支"
          />
          <InputField
            label="Vercel Deploy Hook"
            name="deployHook"
            type="password"
            autoComplete="new-password"
            value={hook}
            onChange={(event) => setHook(event.target.value)}
            maxLength={1000}
            placeholder={
              state.settings.hasDeployHook
                ? "已配置，留空保留"
                : "未配置，填写后才能一键更新"
            }
            description="链接加密保存，不会回显。"
          />
          {state.settings.hasDeployHook ? (
            <Checkbox
              name="clearDeployHook"
              value="on"
              isSelected={clearHook}
              onChange={setClearHook}
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                清除已保存的 Deploy Hook
              </Checkbox.Content>
            </Checkbox>
          ) : null}
          <p className="text-xs leading-6 text-muted">
            更换仓库或分支后，请重新填写对应的 Deploy Hook。留空保存会清除旧
            Hook。
          </p>
          {state.message ? (
            <Notice tone={state.ok ? "success" : "danger"}>
              {state.message}
            </Notice>
          ) : null}
          <Button type="submit" isPending={pending}>
            保存更新设置
          </Button>
        </form>
        <div className="space-y-2 border-t border-border pt-4 text-sm leading-6 text-muted">
          <p>
            在 Vercel 项目 Settings → Git → Deploy Hooks 创建生产分支的
            Hook，再复制到这里。
          </p>
          <p>
            Hook
            会部署它绑定的仓库和分支。如果监测的是另一个上游仓库，需要先将改动同步到本站部署仓库。
          </p>
          <a
            href="https://vercel.com/docs/deploy-hooks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            查看 Vercel 配置说明
          </a>
        </div>
      </Card>
      <Card className="gap-5 border border-border p-6 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">版本状态</h2>
          <Button
            variant="secondary"
            size="sm"
            isPending={checking}
            onPress={check}
          >
            立即检查
          </Button>
        </div>
        {error ? <Notice tone="warning">{error}</Notice> : null}
        {result ? (
          <UpdateDetails
            key={`${result.revision}:${result.latestSha}:${result.checkedAt}`}
            result={result}
          />
        ) : (
          <p className="text-sm leading-6 text-muted">
            当前部署：<code>{currentSha.slice(0, 7) || "未识别"}</code>
            。可以点击“立即检查”查看详细状态。
          </p>
        )}
      </Card>
    </div>
  );
}
