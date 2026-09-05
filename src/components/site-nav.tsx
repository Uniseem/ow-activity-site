"use client";

import { Dropdown } from "@heroui/react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Crosshair,
  Download,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings2,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { logoutAction } from "@/app/actions";
import { Avatar } from "@/components/avatar";
import { ButtonLink } from "@/components/ui";
import {
  SiteLogo,
  useSiteConfiguration,
  useSiteText,
} from "@/components/site-content";

type NavUser = { name: string; avatarUrl?: string | null; isAdmin: boolean };
const communityLinks = [
  { href: "/", label: "首页" },
  { href: "/events", label: "社区活动" },
  { href: "/players", label: "交大玩家" },
];
const adminLinks = [
  { href: "/admin", label: "管理概览", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户与资料", icon: Users },
  { href: "/admin/events", label: "活动与报名", icon: CalendarDays },
  { href: "/admin/customize", label: "站点设置", icon: Settings2 },
  { href: "/admin/oauth", label: "第三方登录", icon: KeyRound },
  { href: "/admin/updates", label: "版本更新", icon: Download },
];

function Brand() {
  const t = useSiteText();
  const configuration = useSiteConfiguration();
  return (
    <Link href="/" className="brand" aria-label={t("brand.name") + "首页"}>
      <span className="brand-mark">
        {configuration.images.logo ? (
          <SiteLogo />
        ) : (
          <Crosshair size={27} strokeWidth={1.6} aria-hidden="true" />
        )}
      </span>
      <span>
        <strong>{t("brand.name")}</strong>
        <small>{t("brand.subtitle")}</small>
      </span>
    </Link>
  );
}

function AccountMenu({ user }: { user: NavUser | null }) {
  const [pending, startTransition] = useTransition();
  if (!user)
    return (
      <ButtonLink href="/login" size="sm">
        登录 / 加入
        <ArrowUpRight size={14} />
      </ButtonLink>
    );
  return (
    <Dropdown>
      <Dropdown.Trigger
        className="community-account"
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
            onAction={() =>
              startTransition(async () => {
                await logoutAction();
              })
            }
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
    adminLinks.find((link) => active(link.href))?.label ?? "后台初始化";

  if (admin)
    return (
      <div className="admin-site">
        <a className="skip-link" href="#page-content">
          跳至主要内容
        </a>
        {user?.isAdmin ? (
          <aside className="site-sidebar" aria-label="管理后台侧栏">
            <Brand />
            <div className="sidebar-section-label">管理后台</div>
            <nav className="sidebar-nav" aria-label="管理导航">
              {adminLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`nav-link ${active(href) ? "active" : ""}`}
                  aria-current={active(href) ? "page" : undefined}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <Link href="/" className="nav-link">
                <ArrowLeft size={17} />
                返回社区网站
              </Link>
            </div>
          </aside>
        ) : null}
        <div
          className={user?.isAdmin ? "admin-frame" : "admin-frame admin-entry"}
        >
          <header className="admin-header">
            <Link href="/" className="admin-back">
              <ArrowLeft size={16} />
              返回社区
            </Link>
            <span>{pageLabel}</span>
            <AccountMenu user={user} />
          </header>
          <div className="site-workspace" id="page-content" tabIndex={-1}>
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
      <header className="community-header">
        <div className="community-nav-shell">
          <Brand />
          <nav className="community-nav" aria-label="社区导航">
            {communityLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={active(href) ? "active" : ""}
                aria-current={active(href) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
            {/* 原生导航保证跨页进入时，浏览器在内容加载后定位到介绍区。 */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/#about-community">关于我们</a>
          </nav>
          <div className="community-account-wrap">
            <AccountMenu user={user} />
          </div>
        </div>
      </header>
      <div className="community-content" id="page-content" tabIndex={-1}>
        {children}
      </div>
      <footer className="community-footer">
        <div>
          <strong>{t("footer.text")}</strong>
          <p>{t("footer.note")}</p>
        </div>
        <nav aria-label="页脚导航">
          <Link href="/events">参加活动</Link>
          <Link href="/me">我的报名</Link>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 跨页锚点使用原生定位 */}
          <a href="/#about-community">关于社区</a>
        </nav>
        <span className="footer-signoff">{t("brand.badge")} / OVERWATCH</span>
      </footer>
    </div>
  );
}
