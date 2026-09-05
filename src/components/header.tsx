import { getCurrentUser } from "@/lib/auth";
import { SiteNav } from "@/components/site-nav";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <SiteNav
      user={
        user
          ? {
              name: user.profile?.displayName ?? user.username,
              avatarUrl: user.profile?.avatarUrl,
              isAdmin: user.role === "ADMIN" && user.status === "APPROVED",
            }
          : null
      }
    />
  );
}
