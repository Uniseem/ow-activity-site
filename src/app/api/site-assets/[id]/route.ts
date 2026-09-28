import { isDatabaseConfigured } from "@/lib/prisma";
import { readSiteAsset } from "@/lib/asset-storage";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id) || !isDatabaseConfigured())
    return new Response(null, { status: 404 });
  const asset = await readSiteAsset(id);
  if (!asset) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
