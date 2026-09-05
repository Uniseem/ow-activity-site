import { AuthPage } from "@/components/auth-page";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <AuthPage
      mode="login"
      oauthCode={typeof query.oauth === "string" ? query.oauth : undefined}
    />
  );
}
