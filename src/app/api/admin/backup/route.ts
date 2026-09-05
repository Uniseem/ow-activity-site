import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { oauthOrigin, flowCookieName } from "@/lib/oauth/server";
import { BackupError } from "@/lib/backup-format";
import { cancelBackupTransfer, downloadBackupChunk, previewBackupImport, restoreBackupImport, startBackupExport, startBackupImport, uploadBackupChunk } from "@/lib/backup-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff" } });
const transferId = z.string().uuid();
const inputSchema = z.discriminatedUnion("operation", [
  z.strictObject({ operation: z.literal("export") }),
  z.strictObject({ operation: z.literal("download"), id: transferId, index: z.number().int().min(0).max(6000) }),
  z.strictObject({ operation: z.literal("import"), manifest: z.unknown() }),
  z.strictObject({ operation: z.literal("upload"), id: transferId, index: z.number().int().min(0).max(6000), data: z.string().max(524_288) }),
  z.strictObject({ operation: z.literal("preview"), id: transferId }),
  z.strictObject({ operation: z.literal("restore"), id: transferId, confirmation: z.string().max(30) }),
  z.strictObject({ operation: z.literal("cancel"), id: transferId }),
]);

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
      if (size > 2_000_000) { await reader.cancel(); throw new BackupError("请求过大，请使用分块上传。"); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(parts).toString("utf8")); }
  catch { throw new BackupError("请求内容不是有效 JSON。"); }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ message: "请先登录管理员账号。" }, 401);
  if (user.role !== "ADMIN" || user.status !== "APPROVED") return json({ message: "只有管理员可以备份或恢复网站。" }, 403);
  try {
    if (request.headers.get("origin") !== oauthOrigin(new URL(request.url).origin)) return json({ message: "请求来源不正确。" }, 403);
    const input = inputSchema.safeParse(await limitedJson(request));
    if (!input.success) return json({ message: "备份请求参数不正确。" }, 400);
    const value = input.data, key = process.env.OAUTH_ENCRYPTION_KEY;
    switch (value.operation) {
      case "export": return json(await startBackupExport(prisma, user.id, key));
      case "download": return json(await downloadBackupChunk(prisma, value.id, user.id, value.index));
      case "import": return json(await startBackupImport(prisma, user.id, value.manifest));
      case "upload": return json(await uploadBackupChunk(prisma, value.id, user.id, value.index, value.data));
      case "preview": return json(await previewBackupImport(prisma, value.id, user.id, key));
      case "cancel": return json(await cancelBackupTransfer(prisma, value.id, user.id));
      case "restore": {
        const result = await restoreBackupImport(prisma, value.id, user.id, key, value.confirmation);
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
