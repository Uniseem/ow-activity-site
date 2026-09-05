import { Card } from "@/components/ui";
import { OAuthButtons } from "@/components/oauth-buttons";
import { getOAuthAvailability } from "@/lib/oauth/server";
import { prisma } from "@/lib/prisma";

export async function OAuthConnections({ userId }: { userId: string }) {
  const [providers, linked] = await Promise.all([
    getOAuthAvailability(),
    prisma.oAuthAccount.findMany({
      where: { userId },
      select: { provider: true, email: true },
    }),
  ]);
  return (
    <Card className="gap-4 border border-border p-6 shadow-none">
      <div>
        <h2 className="text-lg font-semibold">登录方式</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          绑定第三方账号后，可以用它登录当前账号，已有资料和权限会保留。
        </p>
      </div>
      <OAuthButtons providers={providers} intent="link" linked={linked} />
    </Card>
  );
}
