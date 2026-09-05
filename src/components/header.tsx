import { getCurrentSession } from "@/lib/auth";
import { SiteNav } from "@/components/site-nav";
import { AdminUpdateNotifier } from "@/components/admin-update-notifier";
import { hashToken } from "@/lib/oauth/security";

export async function Header({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  const user = session?.user;
  const isAdmin = user?.role === "ADMIN" && user.status === "APPROVED";
  return (
    <>
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
      >
        {children}
      </SiteNav>
      {isAdmin && session ? (
        <AdminUpdateNotifier
          sessionKey={hashToken(`update-notice:${session.id}`)}
        />
      ) : null}
    </>
  );
}
