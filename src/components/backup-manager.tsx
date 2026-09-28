"use client";

import { useRef, useState } from "react";
import { Download, Upload, ArchiveRestore } from "lucide-react";
import { Button, ButtonLink, Card, InputField, Notice } from "@/components/ui";
import { BACKUP_CHUNK_BYTES, type BackupManifest, type BackupPreview } from "@/lib/backup-format";
import { BACKUP_MAX_ZIP_BYTES, backupDigest, base64ToBytes, bytesToBase64, createBackupZip, readBackupZip } from "@/lib/backup-zip";

async function request<T>(input: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/admin/backup", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new Error(value?.message || "请求失败，请稍后重试。");
  return value as T;
}

export function BackupManager({
  mode = "admin",
  encryptionReady = true,
  onRestored,
}: {
  mode?: "admin" | "setup";
  encryptionReady?: boolean;
  onRestored?: (administrators: string[]) => void;
}) {
  const setup = mode === "setup";
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState<{ id: string; preview: BackupPreview; manifest: BackupManifest; fileName: string } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [restored, setRestored] = useState<string[] | null>(null);
  const clearMessage = () => { setError(""); setMessage(""); };
  async function download() {
    if (busy || setup) return;
    setBusy(true); clearMessage(); setProgress("正在冻结网站数据快照…");
    let id: string | undefined;
    try {
      const result = await request<{ id: string; manifest: BackupManifest; chunks: number }>({ operation: "export" });
      id = result.id;
      const files: Record<string, Uint8Array> = {};
      let index = 0;
      for (const file of result.manifest.files) {
        const bytes = new Uint8Array(file.bytes);
        for (let offset = 0; offset < file.bytes; offset += BACKUP_CHUNK_BYTES) {
          setProgress(`正在下载备份 ${Math.round(index / result.chunks * 100)}%`);
          const chunk = await request<{ data: string }>({ operation: "download", id, index: index++ });
          bytes.set(base64ToBytes(chunk.data), offset);
        }
        if (await backupDigest(bytes) !== file.sha256) throw new Error("下载完整性校验失败，请重试。");
        files[file.path] = bytes;
      }
      setProgress("正在生成 ZIP 文件…");
      const zip = createBackupZip(result.manifest, files);
      const url = URL.createObjectURL(new Blob([new Uint8Array(zip).buffer], { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `sjtu-ow-backup-${result.manifest.createdAt.slice(0, 10)}.zip`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage("备份已生成并开始下载，请保存好 ZIP 文件。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "备份失败。"); }
    finally { if (id) await request({ operation: "cancel", id }).catch(() => {}); setBusy(false); setProgress(""); }
  }
  async function selectFile(file?: File) {
    if (!file || busy) return;
    setBusy(true); clearMessage(); setConfirmation(""); setProgress("正在检查 ZIP 文件…");
    let id: string | undefined;
    try {
      if (ready) await request({ operation: "cancel", id: ready.id }).catch(() => {});
      setReady(null);
      if (file.size > BACKUP_MAX_ZIP_BYTES) throw new Error("ZIP 文件超过备份大小上限。");
      const { manifest, files } = await readBackupZip(new Uint8Array(await file.arrayBuffer()));
      const started = await request<{ id: string; chunks: number }>({ operation: "import", manifest });
      id = started.id;
      let index = 0;
      for (const entry of manifest.files) for (let offset = 0; offset < entry.bytes; offset += BACKUP_CHUNK_BYTES) {
        setProgress(`正在上传备份 ${Math.round(index / started.chunks * 100)}%`);
        await request({ operation: "upload", id, index: index++, data: bytesToBase64(files[entry.path].subarray(offset, offset + BACKUP_CHUNK_BYTES)) });
      }
      setProgress("正在校验账号、内容和图片…");
      const result = await request<{ preview: BackupPreview; manifest: BackupManifest }>({ operation: "preview", id });
      setReady({ ...result, id, fileName: file.name }); id = undefined;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "读取备份失败。"); }
    finally { if (id) await request({ operation: "cancel", id }).catch(() => {}); setBusy(false); setProgress(""); if (input.current) input.current.value = ""; }
  }
  async function restore() {
    if (!ready || busy) return;
    setBusy(true); clearMessage(); setProgress("正在恢复，请勿关闭页面…");
    try {
      const result = await request<{ administrators: string[] }>({ operation: "restore", id: ready.id, confirmation });
      setReady(null);
      if (onRestored) onRestored(result.administrators);
      else setRestored(result.administrators);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "恢复失败。"); }
    finally { setBusy(false); setProgress(""); }
  }
  if (restored) return <Card className="gap-5 p-6"><Notice tone="success">恢复完成。所有账号、密码、内容和设置已替换为备份中的数据，原登录已退出。</Notice><p className="text-sm">请使用备份中的管理员账号登录：{restored.join("、")}。</p><ButtonLink href="/login?restored=1">重新登录</ButtonLink></Card>;
  const restoreCard = (
    <Card className="gap-5 p-6">
      <h2 className="section-title">{setup ? "用备份恢复" : "从 ZIP 恢复"}</h2>
      <p className="text-sm leading-7 text-muted">
        {setup
          ? "有以前导出的 ZIP 时，直接在这里恢复。管理员账号、密码和第三方登录都会按备份写入，不必再注册。"
          : "先选择备份查看内容。确认后，当前站点的数据和全部账号将被覆盖，并退出所有登录。"}
      </p>
      {!encryptionReady ? (
        <Notice tone="warning">服务器尚未设置 OAUTH_ENCRYPTION_KEY。备份里若含第三方登录或模型密钥，需要先配好再恢复。</Notice>
      ) : null}
      <input ref={input} type="file" accept=".zip,application/zip" aria-label="选择网站备份 ZIP" className="sr-only" disabled={busy} onChange={(event) => void selectFile(event.target.files?.[0])} />
      <Button variant="secondary" onPress={() => input.current?.click()} isDisabled={busy}><Upload size={18} />选择备份 ZIP</Button>
    </Card>
  );
  return <div className="grid gap-6">
    {error ? <Notice tone="danger">{error}</Notice> : null}
    {message ? <Notice tone="success">{message}</Notice> : null}
    {busy ? <p role="status" aria-live="polite" className="text-sm text-muted">{progress}</p> : null}
    {setup ? restoreCard : (
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="gap-5 p-6"><h2 className="section-title">下载网站备份</h2><p className="text-sm leading-7 text-muted">包含账号与密码、第三方账号绑定、玩家资料、活动报名、文章、站点设置和已上传图片。</p><Notice tone="warning">ZIP 含密码哈希和第三方登录密钥，请保存在安全位置，不要公开分享。</Notice><Button onPress={download} isDisabled={busy}><Download size={18} />下载完整 ZIP</Button></Card>
        {restoreCard}
      </div>
    )}
    {ready ? <Card className="gap-5 p-6"><div><h2 className="section-title">确认恢复</h2><p className="mt-2 break-all text-sm text-muted">{ready.fileName} · {new Date(ready.manifest.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</p></div><dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">{[["账号", ready.preview.users], ["文章", ready.preview.articles], ["活动", ready.preview.events], ["报名", ready.preview.registrations], ["上传图片", ready.preview.assets]].map(([label, count]) => <div key={label}><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 text-xl font-semibold">{count}</dd></div>)}</dl><Notice tone="warning">{setup ? `确认后写入备份数据。之后用这些管理员账号和原密码登录：${ready.preview.administrators.join("、")}。` : `此操作会完全替换当前数据。恢复后使用原备份的管理员账号及原密码登录：${ready.preview.administrators.join("、")}。请先下载当前网站的备份。`}</Notice><InputField label="输入“覆盖恢复”确认" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" disabled={busy} /><div className="flex flex-wrap gap-3"><Button variant="danger" isDisabled={busy || confirmation !== "覆盖恢复"} onPress={restore}><ArchiveRestore size={18} />覆盖恢复网站</Button><Button variant="secondary" isDisabled={busy} onPress={() => { void request({ operation: "cancel", id: ready.id }).catch(() => {}); setReady(null); setConfirmation(""); }}>取消</Button></div></Card> : null}
    {setup ? null : <p className="text-sm leading-7 text-muted">支持 Vercel 与 VPS 之间迁移。元数据上限 8 MB、50,000 条记录，图片总量上限 128 MB、单张 2 MB、最多 5,000 张；超过会停止并提示，不会省略内容。旧式内嵌头像在导出时转为独立图片，导出前仍计入元数据预估。外链图片保留原地址；代码、环境变量和域名不在 ZIP 内。临时传输 30 分钟后过期。更换域名需更新 Google / GitHub 回调地址，Deploy Hook 只适用于 Vercel。</p>}
  </div>;
}
