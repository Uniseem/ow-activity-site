"use client";
import {
  ArrowUpRight,
  CalendarDays,
  Compass,
  Crosshair,
  Download,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldCheck,
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

const communityLinks = [
  { href: "/", label: "社区首页", icon: Compass, note: "01" },
  { href: "/events", label: "活动大厅", icon: CalendarDays, note: "02" },
  { href: "/players", label: "发现玩家", icon: Users, note: "03" },
  { href: "/me", label: "个人中心", icon: UserRound, note: "04" },
];
const adminLinks = [
  { href: "/admin", label: "管理概览", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户与资料", icon: Users },
  { href: "/admin/events", label: "活动与报名", icon: CalendarDays },
  { href: "/admin/customize", label: "站点设置", icon: Settings2 },
  { href: "/admin/oauth", label: "第三方登录", icon: KeyRound },
  { href: "/admin/updates", label: "版本更新", icon: Download },
];
export function SiteNav({
  user,
}: {
  user: { name: string; avatarUrl?: string | null; isAdmin: boolean } | null;
}) {
  const pathname = usePathname();
  const t = useSiteText();
  const configuration = useSiteConfiguration();
  const admin = pathname.startsWith("/admin");
  const active = (href: string) =>
    href === "/" || href === "/admin"
      ? pathname === href
      : pathname.startsWith(href);
  const pageLabel =
    [...adminLinks, ...communityLinks].find((link) => active(link.href))
      ?.label ||
    (pathname === "/login"
      ? "登录账号"
      : pathname === "/register"
        ? "加入社区"
        : "社区活动");
  const brand = (
    <Link href="/" className="brand" aria-label={t("brand.name") + "首页"}>
      <span className="brand-mark">
        {configuration.images.logo ? (
          <SiteLogo />
        ) : (
          <Crosshair size={25} strokeWidth={1.8} aria-hidden="true" />
        )}
      </span>
      <span>
        <strong>{t("brand.name")}</strong>
        {t("brand.subtitle") ? <small>{t("brand.subtitle")}</small> : null}
      </span>
    </Link>
  );
  return (
    <>
      <a className="skip-link" href="#page-content">
        跳至主要内容
      </a>
      <aside className="site-sidebar" aria-label="站点侧栏">
        {brand}
        <div className="sidebar-section-label">
          社区空间 <span>{t("brand.badge")}</span>
        </div>
        <nav aria-label="主导航" className="sidebar-nav">
          {communityLinks.map(({ href, label, icon: Icon, note }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`nav-link ${active(href) ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              <small>{note}</small>
            </Link>
          ))}
        </nav>
        {user?.isAdmin ? (
          <>
            <div className="sidebar-section-label">管理工作台</div>
            <nav aria-label="管理导航" className="sidebar-nav">
              {(admin ? adminLinks : adminLinks.slice(0, 1)).map(
                ({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active(href) ? "page" : undefined}
                    className={`nav-link ${active(href) ? "active" : ""}`}
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                  </Link>
                ),
              )}
            </nav>
          </>
        ) : null}
        <div className="sidebar-bottom">
          {!admin ? (
            <div className="sidebar-invite">
              <Crosshair size={22} />
              <p>
                队伍里，
                <br />
                留一个你的位置。
              </p>
              <Link href={user ? "/me" : "/register"}>
                {user ? "查看我的玩家卡片" : "创建你的玩家卡片"}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : null}
          <p className="sidebar-footnote">
            <ShieldCheck size={13} />
            玩家自发社区 · 审核制加入
          </p>
        </div>
      </aside>
      <header className="site-header">
        <div className="nav-shell">
          <div className="mobile-brand">{brand}</div>
          <div className="header-context">
            <span>{admin ? "管理工作台" : "玩家社区"}</span>
            <span className="text-muted/40">/</span>
            <strong>{pageLabel}</strong>
          </div>
          <div className="nav-account">
            {user?.isAdmin ? (
              <Link href={admin ? "/" : "/admin"} className="header-admin-link">
                {admin ? "返回社区" : "管理后台"}
                <ArrowUpRight size={14} />
              </Link>
            ) : null}
            {user ? (
              <>
                <Link
                  href="/me"
                  className="account-link"
                  aria-label={user.name + "的个人中心"}
                >
                  <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                  <span>{user.name}</span>
                </Link>
                <form action={logoutAction}>
                  <ActionButton variant="ghost" size="sm" aria-label="退出登录">
                    <LogOut size={16} />
                  </ActionButton>
                </form>
              </>
            ) : (
              <ButtonLink href="/login" size="sm">
                登录 / 注册
                <ArrowUpRight size={14} />
              </ButtonLink>
            )}
          </div>
        </div>
        <nav aria-label="手机导航" className="mobile-nav">
          {communityLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`nav-link ${active(href) ? "active" : ""}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
