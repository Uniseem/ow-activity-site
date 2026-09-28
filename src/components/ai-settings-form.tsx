"use client";

import { useActionState, useState, useTransition } from "react";
import { Checkbox } from "@heroui/react";
import {
  listAiModelsAction,
  saveAiSettingsAction,
} from "@/app/admin/ai/actions";
import {
  Button,
  Card,
  CheckField,
  Chip,
  InputField,
  Notice,
  SelectField,
} from "@/components/ui";
import { aiPresetLabels, presetBaseUrl } from "@/lib/ai/presets";
import type { AiSettingsView } from "@/lib/ai/settings";

export function AiSettingsForm({ initial }: { initial: AiSettingsView }) {
  const [preset, setPreset] = useState(initial.preset);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initial.model);
  const [autoReview, setAutoReview] = useState(initial.autoReview);
  const [clearKey, setClearKey] = useState(false);
  const [models, setModels] = useState<string[]>(
    initial.model ? [initial.model] : [],
  );
  const [listMessage, setListMessage] = useState("");
  const [listing, startListing] = useTransition();
  const [state, action, pending] = useActionState(
    async (
      previous: Awaited<ReturnType<typeof saveAiSettingsAction>>,
      form: FormData,
    ) => {
      const saved = await saveAiSettingsAction(previous, form);
      if (saved.ok) {
        setApiKey("");
        setClearKey(false);
        setPreset(saved.preset);
        setBaseUrl(saved.baseUrl);
        setModel(saved.model);
        setAutoReview(saved.autoReview);
        if (saved.model && !models.includes(saved.model))
          setModels((current) =>
            [...new Set([...current, saved.model])].sort((left, right) =>
              left.localeCompare(right),
            ),
          );
      }
      return saved;
    },
    {
      ok: false,
      message: "",
      ...initial,
    },
  );

  function pullModels() {
    const form = new FormData();
    form.set("baseUrl", baseUrl);
    form.set("apiKey", apiKey);
    startListing(async () => {
      const result = await listAiModelsAction(form);
      setListMessage(result.message);
      if (result.ok) {
        setModels((current) =>
          [...new Set([...current, ...result.models, model].filter(Boolean))].sort(
            (left, right) => left.localeCompare(right),
          ),
        );
      }
    });
  }

  const modelOptions = Object.fromEntries(
    [...new Set([...models, model].filter(Boolean))].map((id) => [id, id]),
  );

  return (
    <Card className="mx-auto max-w-2xl gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">模型接口</h2>
          <p className="mt-1 text-sm text-muted">
            兼容 One API、New API、LiteLLM、OpenRouter 以及各家官方的 OpenAI 格式接口。
          </p>
        </div>
        <Chip
          color={state.autoReview && state.hasKey ? "success" : "default"}
          variant="soft"
        >
          {state.autoReview && state.hasKey ? "自动审核已开" : "人工审核"}
        </Chip>
      </div>
      <form action={action} className="grid gap-5">
        <input type="hidden" name="revision" value={state.revision} />
        <SelectField
          key={"preset-" + state.revision}
          label="渠道"
          name="preset"
          options={aiPresetLabels}
          defaultValue={preset}
          onChange={(value) => {
            const next = String(value ?? "openai");
            setPreset(next);
            const url = presetBaseUrl(next);
            if (url) setBaseUrl(url);
          }}
        />
        <InputField
          label="接口地址"
          name="baseUrl"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder="https://api.openai.com/v1"
          description="One API / New API 填网关地址；官方接口填对应兼容地址。"
        />
        <InputField
          label="API Key"
          name="apiKey"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={state.hasKey ? "已保存，留空则保持不变" : "sk-..."}
        />
        {state.hasKey ? (
          <Checkbox
            name="clearKey"
            value="on"
            isSelected={clearKey}
            onChange={setClearKey}
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              清除已保存的 API Key
            </Checkbox.Content>
          </Checkbox>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          {Object.keys(modelOptions).length ? (
            <SelectField
              key={"model-" + state.revision + "-" + Object.keys(modelOptions).join()}
              label="默认模型"
              name="model"
              options={modelOptions}
              defaultValue={model}
              onChange={(value) => setModel(String(value ?? ""))}
            />
          ) : (
            <InputField
              label="默认模型"
              name="model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="先拉取模型，或手动填写模型名"
            />
          )}
          <Button
            type="button"
            variant="secondary"
            isDisabled={pending || listing}
            onPress={pullModels}
          >
            {listing ? "正在拉取…" : "拉取模型列表"}
          </Button>
        </div>
        {listMessage ? (
          <Notice tone={listMessage.includes("已拉取") ? "success" : "warning"}>
            {listMessage}
          </Notice>
        ) : null}
        <CheckField
          key={"auto-" + state.revision}
          name="autoReview"
          defaultSelected={autoReview}
        >
          开启自动审核审批。玩家提交资料后，由默认模型先审一遍；拿不准的仍留给人工。
        </CheckField>
        {state.message ? (
          <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>
        ) : null}
        <Button type="submit" isDisabled={pending} isPending={pending}>
          {pending ? "正在保存…" : "保存设置"}
        </Button>
      </form>
    </Card>
  );
}
