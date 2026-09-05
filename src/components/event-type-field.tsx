"use client";

import { useState } from "react";
import { Button, Label, ListBox, Modal, Select } from "@heroui/react";
import { InputField } from "@/components/ui";
import { eventTypeLabels } from "@/lib/format";

export function EventTypeField({
  defaultType = "FUN",
  defaultCustomType = "",
}: {
  defaultType?: string;
  defaultCustomType?: string | null;
}) {
  const [type, setType] = useState(defaultType);
  const [customType, setCustomType] = useState(defaultCustomType ?? "");
  const [draft, setDraft] = useState(customType);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  function openEditor() {
    setDraft(customType);
    setError("");
    setIsOpen(true);
  }
  function confirm() {
    const name = draft.trim();
    if (!name || name.length > 30) {
      setError("请输入 1–30 字的活动类型。");
      return;
    }
    setCustomType(name);
    setType("CUSTOM");
    setIsOpen(false);
  }
  return (
    <div className="grid min-w-0 gap-2">
      <input
        type="hidden"
        name="customType"
        value={type === "CUSTOM" ? customType : ""}
      />
      <Select
        name="type"
        value={type}
        onChange={(key) => {
          if (key === "CUSTOM") openEditor();
          else setType(String(key));
        }}
        isRequired
        variant="secondary"
        className="w-full"
      >
        <Label>活动类型</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {Object.entries(eventTypeLabels).map(([key, label]) => (
              <ListBox.Item key={key} id={key} textValue={label}>
                {label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {type === "CUSTOM" ? (
        <div className="flex items-center justify-between gap-2">
          <span className="break-words text-sm text-muted">
            {customType || "请填写活动类型"}
          </span>
          <Button type="button" size="sm" variant="ghost" onPress={openEditor}>
            编辑类型
          </Button>
        </div>
      ) : null}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭" />
            <Modal.Header>
              <Modal.Heading>自定义活动类型</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <InputField
                label="活动类型名称"
                value={draft}
                autoFocus
                maxLength={30}
                error={error}
                placeholder="例如：新手教学、英雄挑战"
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    confirm();
                  }
                }}
              />
              <p className="mt-3 text-xs leading-6 text-muted">
                这个名称会显示在活动卡片和详情页。
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                type="button"
                variant="secondary"
                onPress={() => setIsOpen(false)}
              >
                取消
              </Button>
              <Button type="button" onPress={confirm}>
                确定
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
