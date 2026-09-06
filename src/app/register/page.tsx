import { AuthPage } from "@/components/auth-page";
import { redirectIfAdminSetupOpen } from "@/lib/auth";
export default async function RegisterPage() {
  await redirectIfAdminSetupOpen();
  return <AuthPage mode="register" />;
}
