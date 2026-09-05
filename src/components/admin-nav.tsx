"use client";

import { CalendarDays, LayoutDashboard, Users, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav() {
  const links = [
    { href: "/admin", label: "概览", icon: LayoutDashboard },
    { href: "/admin/users", label: "用户与资料", icon: Users },
    { href: "/admin/events", label: "活动与报名", icon: CalendarDays },
    { href: "/admin/customize", label: "站点设置", icon: Settings2 },
  ];
  const pathname = usePathname();
  return (
    <nav className="admin-tabs" aria-label="后台导航">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            href={href}
            key={href}
            aria-current={active ? "page" : undefined}
            className={"nav-link " + (active ? "active" : "")}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
