"use client";

import { Dropdown, buttonVariants } from "@heroui/react";
import {
  ArrowLeft,
  ChevronDown,
  LogOut,
  Settings2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { logoutAction } from "@/app/actions";
import { Avatar } from "@/components/avatar";
import { CommunityNavigation } from "@/components/community-navigation";
import { FloatingHeader } from "@/components/floating-header";
import { RouteMotion } from "@/components/route-motion";
import { ButtonLink } from "@/components/ui";
import { AdminNav } from "@/components/admin-nav";
import { adminNavigation, isAdminNavActive } from "@/lib/admin-navigation";
import {
  SiteLogo,
  useSiteConfiguration,
  useSiteText,
} from "@/components/site-content";

type NavUser = { name: string; avatarUrl?: string | null; isAdmin: boolean };

function Brand() {
  const t = useSiteText();
  const configuration = useSiteConfiguration();
  return (
    <Link href="/" className="brand" aria-label={t("brand.name") + "首页"}>
      {configuration.images.logo ? (
        <span className="brand-mark">
          <SiteLogo />
        </span>
      ) : null}
      <strong>{t("brand.name")}</strong>
    </Link>
  );
}

function AccountMenu({ user }: { user: NavUser | null }) {
  const [pending, startTransition] = useTransition();
  if (!user)
    return (
      <ButtonLink href="/login" size="sm">
        登录
      </ButtonLink>
    );
  return (
    <Dropdown>
      <Dropdown.Trigger
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "community-account inline-flex",
        })}
        aria-label="账号菜单"
        isDisabled={pending}
      >
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        <span className="account-name">{user.name}</span>
        <ChevronDown size={14} />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label="账号操作">
          <Dropdown.Item id="profile" href="/me" textValue="我的资料与报名">
            <UserRound size={16} />
            我的资料与报名
          </Dropdown.Item>
          {user.isAdmin ? (
            <Dropdown.Item id="admin" href="/admin" textValue="进入管理后台">
              <Settings2 size={16} />
              进入管理后台
            </Dropdown.Item>
          ) : null}
          <Dropdown.Item
            id="logout"
            textValue="退出登录"
            onAction={() => {
              if (
                !window.dispatchEvent(
                  new Event("community:before-leave", { cancelable: true }),
                )
              )
                return;
              startTransition(async () => {
                await logoutAction();
              });
            }}
          >
            <LogOut size={16} />
            退出登录
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export function SiteNav({
  user,
  children,
}: {
  user: NavUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const t = useSiteText();
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  const active = (href: string) =>
    href === "/" || href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");
  const pageLabel =
    adminNavigation
      .flatMap((group) => group.links)
      .find((link) => isAdminNavActive(pathname, link.href))?.label ??
    "后台初始化";

  if (admin)
    return (
      <div className="admin-site">
        <a className="skip-link" href="#page-content">
          跳至主要内容
        </a>
        {user?.isAdmin ? (
          <aside className="site-sidebar" aria-label="管理后台侧栏">
            <Brand />
            <nav className="sidebar-nav" aria-label="管理导航">
              {adminNavigation.map((group) => (
                <div key={group.label}>
                  <p className="sidebar-section-label">{group.label}</p>
                  {group.links.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={buttonVariants({
                        variant: active(href) ? "secondary" : "ghost",
                        className: "nav-link",
                      })}
                      aria-current={active(href) ? "page" : undefined}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </aside>
        ) : null}
        <div
          className={user?.isAdmin ? "admin-frame" : "admin-frame admin-entry"}
        >
          <FloatingHeader className="admin-header">
            <Link href="/" className="admin-back" aria-label="返回社区">
              <ArrowLeft size={16} />
              <span className="admin-back-label">返回社区</span>
            </Link>
            <span className="admin-location">{pageLabel}</span>
            {user?.isAdmin ? <AdminNav /> : null}
            <AccountMenu user={user} />
          </FloatingHeader>
          <div className="site-workspace" id="page-content" tabIndex={-1}>
            <RouteMotion />
            {children}
          </div>
        </div>
      </div>
    );

  return (
    <div className="community-site">
      <a className="skip-link" href="#page-content">
        跳至主要内容
      </a>
      <FloatingHeader className="community-header">
        <div className="community-nav-shell">
          <Brand />
          <CommunityNavigation />
          <div className="community-account-wrap">
            <AccountMenu user={user} />
          </div>
        </div>
      </FloatingHeader>
      <div className="community-content" id="page-content" tabIndex={-1}>
        <RouteMotion />
        {children}
      </div>
      <footer className="community-footer">
        <p>{t("footer.note")}</p>
      </footer>
    </div>
  );
}
