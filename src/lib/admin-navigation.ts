import {
  CalendarDays,
  DatabaseBackup,
  FilePenLine,
  KeyRound,
  LayoutDashboard,
  RefreshCw,
  Sparkles,
  Settings2,
  Users,
} from "lucide-react";

export const adminNavigation = [
  {
    label: "内容管理",
    links: [
      { href: "/admin", label: "概览", icon: LayoutDashboard },
      { href: "/admin/events", label: "活动管理", icon: CalendarDays },
      { href: "/admin/articles", label: "文章管理", icon: FilePenLine },
      { href: "/admin/users", label: "用户与审核", icon: Users },
    ],
  },
  {
    label: "站点设置",
    links: [
      { href: "/admin/customize", label: "基本设置", icon: Settings2 },
      { href: "/admin/oauth", label: "第三方登录", icon: KeyRound },
      { href: "/admin/ai", label: "AI 审核", icon: Sparkles },
      { href: "/admin/updates", label: "版本更新", icon: RefreshCw },
      { href: "/admin/backup", label: "备份与恢复", icon: DatabaseBackup },
    ],
  },
];

export function isAdminNavActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
}
