"use client";

import {
  CalendarDays,
  Compass,
  Crosshair,
  LogOut,
  Settings2,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/avatar";
import { ButtonLink } from "@/components/ui";
import {
  SiteLogo,
  useSiteConfiguration,
  useSiteText,
} from "@/components/site-content";

export function SiteNav({
  user,
}: {
  user: { name: string; avatarUrl?: string | null; isAdmin: boolean } | null;
}) {
  const pathname = usePathname();
  const t = useSiteText();
  const configuration = useSiteConfiguration();
  const links = [
    { href: "/", label: "社区首页", icon: Compass },
    { href: "/events", label: "活动大厅", icon: CalendarDays },
    { href: "/players", label: "发现玩家", icon: Users },
    ...(user ? [{ href: "/me", label: "个人中心", icon: UserRound }] : []),
    ...(user?.isAdmin
      ? [{ href: "/admin", label: "管理后台", icon: Settings2 }]
      : []),
  ];
  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link href="/" className="brand" aria-label={t("brand.name") + "首页"}>
          <span className="brand-mark">
            {configuration.images.logo ? (
              <SiteLogo />
            ) : (
              <Crosshair size={25} strokeWidth={2} aria-hidden="true" />
            )}
          </span>
          <span>
            <strong>
              {t("brand.name")}
              {t("brand.badge") ? (
                <span className="ml-2 text-xs font-medium text-accent">
                  {t("brand.badge")}
                </span>
              ) : null}
            </strong>
            {t("brand.subtitle") ? <small>{t("brand.subtitle")}</small> : null}
          </span>
        </Link>
        <nav aria-label="主导航" className="primary-nav">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={"nav-link" + (active ? " active" : "")}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="nav-account">
          {user ? (
            <>
              <Link href="/me" aria-label={user.name + "的个人中心"}>
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              </Link>
              <form action={logoutAction}>
                <ActionButton variant="ghost" size="sm" aria-label="退出登录">
                  <LogOut size={16} />
                  <span className="hidden xl:inline">退出</span>
                </ActionButton>
              </form>
            </>
          ) : (
            <ButtonLink href="/login" size="sm">
              登录 / 注册
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  );
}
