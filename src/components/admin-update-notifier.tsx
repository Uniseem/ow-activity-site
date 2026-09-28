"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@heroui/react";
import { Button } from "@/components/ui";
import { UpdateDetails } from "@/components/update-details";
import { CHECK_INTERVAL_MS, type UpdateCheck } from "@/lib/updates/shared";

export function AdminUpdateNotifier({ sessionKey }: { sessionKey: string }) {
  const [result, setResult] = useState<UpdateCheck | null>(null);
  const [open, setOpen] = useState(false);
  const dismissed = useRef(new Set<string>());
  function noticeKey(value: UpdateCheck) {
    return `ow-update:${sessionKey}:${value.currentSha}:${value.repositoryUrl}:${value.revision}:${value.latestSha}`;
  }
  useEffect(() => {
    let active = true,
      busy = false,
      lastChecked = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    async function check() {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      lastChecked = Date.now();
      try {
        const response = await fetch("/api/admin/updates", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data: UpdateCheck = await response.json();
        if (!active) return;
        if (data.status === "checking") {
          retry = setTimeout(check, 5_000);
          return;
        }
        window.dispatchEvent(
          new CustomEvent("ow-update-result", { detail: data }),
        );
        const key = `ow-update:${sessionKey}:${data.currentSha}:${data.repositoryUrl}:${data.revision}:${data.latestSha}`;
        let skipped = dismissed.current.has(key);
        try {
          skipped ||= sessionStorage.getItem(key) === "dismissed";
        } catch {
          /* 禁用存储时使用内存记录。 */
        }
        if (
          (data.status === "available" ||
            (data.status === "diverged" && data.total > 0)) &&
          !skipped
        ) {
          setResult(data);
          setOpen(true);
        } else if (data.status !== "available" && data.status !== "diverged") {
          setOpen(false);
        }
      } catch {
        /* 自动检查失败不打断登录；后台可以查看和重试。 */
      } finally {
        busy = false;
      }
    }
    function visible() {
      if (Date.now() - lastChecked >= CHECK_INTERVAL_MS) void check();
    }
    const startIdle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(() => {
            void check();
          }, { timeout: 3_000 })
        : undefined;
    const start =
      startIdle === undefined
        ? setTimeout(() => {
            void check();
          }, 3_000)
        : undefined;
    const interval = setInterval(visible, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("ow-update-settings-saved", check);
    return () => {
      active = false;
      if (startIdle !== undefined) cancelIdleCallback(startIdle);
      if (start !== undefined) clearTimeout(start);
      clearInterval(interval);
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("ow-update-settings-saved", check);
    };
  }, [sessionKey]);
  function close() {
    if (result) {
      const key = noticeKey(result);
      dismissed.current.add(key);
      try {
        sessionStorage.setItem(key, "dismissed");
      } catch {}
    }
    setOpen(false);
  }
  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <Modal.Container size="lg" placement="center">
        <Modal.Dialog>
          <Modal.CloseTrigger aria-label="稍后再说" />
          <Modal.Header>
            <Modal.Heading>发现网站新版本</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            {result ? (
              <UpdateDetails
                key={`${result.revision}:${result.latestSha}`}
                result={result}
                onOpenSettings={close}
              />
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={close}>
              稍后再说
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
