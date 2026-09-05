import { syncEventStatuses } from "@/lib/event-schedule";
import { isDatabaseConfigured } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "未授权" }, { status: 401 });
  }
  if (!isDatabaseConfigured())
    return Response.json({ error: "数据库未配置" }, { status: 503 });
  const updated = await syncEventStatuses();
  return Response.json(
    { ok: true, ...updated },
    { headers: { "Cache-Control": "no-store" } },
  );
}
