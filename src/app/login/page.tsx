import { AuthPage } from "@/components/auth-page";
import { redirectIfAdminSetupOpen } from "@/lib/auth";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await redirectIfAdminSetupOpen();
  const query = await searchParams;
  return (
    <AuthPage
      mode="login"
      oauthCode={typeof query.oauth === "string" ? query.oauth : undefined}
      restored={query.restored === "1"}
    />
  );
}
