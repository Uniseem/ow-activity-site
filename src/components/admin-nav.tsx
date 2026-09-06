"use client";

import { Dropdown, buttonVariants } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { canSeeAdminHref } from "@/lib/admin-permissions";
import { adminNavigation, isAdminNavActive } from "@/lib/admin-navigation";

export function AdminNav({ permissions = [] }: { permissions?: string[] }) {
  const pathname = usePathname();
  const current = adminNavigation
    .flatMap((group) => group.links)
    .find((link) => isAdminNavActive(pathname, link.href));
  return (
    <div className="admin-mobile-navigation">
      <Dropdown>
        <Dropdown.Trigger
          className={buttonVariants({
            variant: "secondary",
            size: "sm",
            className: "inline-flex",
          })}
          aria-label="切换管理页面"
        >
          {current?.label || "管理后台"}
          <ChevronDown size={15} />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom start">
          <Dropdown.Menu aria-label="后台导航">
            {adminNavigation
              .flatMap((group) => group.links)
              .filter((link) =>
                canSeeAdminHref(link.href, {
                  role: "ADMIN",
                  status: "APPROVED",
                  adminPermissions: permissions,
                }),
              )
              .map(({ href, label, icon: Icon }) => (
                <Dropdown.Item
                  id={href}
                  key={href}
                  href={href}
                  textValue={label}
                  aria-current={
                    isAdminNavActive(pathname, href) ? "page" : undefined
                  }
                >
                  <Icon size={16} />
                  {label}
                </Dropdown.Item>
              ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
