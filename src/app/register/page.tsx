import { AuthPage } from "@/components/auth-page";
import { redirectIfAdminSetupOpen } from "@/lib/auth";
import { getOAuthAvailability } from "@/lib/oauth/server";
export default async function RegisterPage() {
  await Promise.all([redirectIfAdminSetupOpen(), getOAuthAvailability()]);
  return <AuthPage mode="register" />;
}
