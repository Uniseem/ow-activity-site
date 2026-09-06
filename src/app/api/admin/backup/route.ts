import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { canSetUpAdmin } from "@/lib/admin-setup";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { oauthOrigin, flowCookieName } from "@/lib/oauth/server";
import { canRunBackupOperation, resolveBackupAccess } from "@/lib/backup-access";
import { BACKUP_MAX_REQUEST_BYTES, BackupError, backupRequestSchema, isTrustedBackupOrigin } from "@/lib/backup-format";
import { cancelBackupTransfer, downloadBackupChunk, previewBackupImport, restoreBackupImport, startBackupExport, startBackupImport, uploadBackupChunk } from "@/lib/backup-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff" } });

async function limitedJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new BackupError("请求格式不正确。");
  const reader = request.body?.getReader();
  if (!reader) throw new BackupError("请求内容为空。");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BACKUP_MAX_REQUEST_BYTES) { await reader.cancel(); throw new BackupError("请求过大，请使用分块上传。"); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(parts).toString("utf8")); }
  catch { throw new BackupError("请求内容不是有效 JSON。"); }
}

export async function POST(request: Request) {
  const [user, setupOpen] = await Promise.all([
    getCurrentUser(),
    canSetUpAdmin(prisma),
  ]);
  const access = resolveBackupAccess({ user, setupOpen });
  if (!access.ok) return json({ message: access.message }, access.status);
  try {
    if (!isTrustedBackupOrigin(request.headers.get("origin"), oauthOrigin(new URL(request.url).origin))) return json({ message: "请求来源不正确。" }, 403);
    const input = backupRequestSchema.safeParse(await limitedJson(request));
    if (!input.success) return json({ message: "备份请求参数不正确。" }, 400);
    const value = input.data, key = process.env.OAUTH_ENCRYPTION_KEY;
    if (!canRunBackupOperation(access, value.operation))
      return json({ message: "首次注册页只能上传备份恢复，不能下载当前站点。" }, 403);
    switch (value.operation) {
      case "export": return json(await startBackupExport(prisma, access.ownerId, key));
      case "download": return json(await downloadBackupChunk(prisma, value.id, access.ownerId, value.index));
      case "import": return json(await startBackupImport(prisma, access.ownerId, value.manifest));
      case "upload": return json(await uploadBackupChunk(prisma, value.id, access.ownerId, value.index, value.data));
      case "preview": return json(await previewBackupImport(prisma, value.id, access.ownerId, key));
      case "cancel": return json(await cancelBackupTransfer(prisma, value.id, access.ownerId));
      case "restore": {
        const result = await restoreBackupImport(
          prisma,
          value.id,
          access.ownerId,
          key,
          value.confirmation,
          { setup: access.setup },
        );
        const jar = await cookies();
        for (const name of [SESSION_COOKIE, flowCookieName("google"), flowCookieName("github")]) jar.delete(name);
        revalidatePath("/", "layout");
        return json(result);
      }
    }
  } catch (error) {
    return json({ message: error instanceof BackupError ? error.message : "备份操作未完成。原网站数据不会被部分覆盖，请检查数据库连接后重试。" }, 400);
  }
}
