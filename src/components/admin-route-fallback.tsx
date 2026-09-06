"use client";

import { Card } from "@heroui/react";
import { adminNavigation, isAdminNavActive } from "@/lib/admin-navigation";

export function adminPageLabel(pathname: string) {
  return (
    adminNavigation
      .flatMap((group) => group.links)
      .find((link) => isAdminNavActive(pathname, link.href))?.label ??
    "管理后台"
  );
}

function Shimmer({ className }: { className: string }) {
  return <div className={`nav-shimmer rounded-lg ${className}`} />;
}

export function AdminRouteFallback({ pathname }: { pathname: string }) {
  const title = adminPageLabel(pathname);
  return (
    <main className="page-shell nav-route-fallback" aria-busy="true" aria-label={`正在打开${title}`}>
      <span className="sr-only" role="status">
        正在打开{title}…
      </span>
      <div className="page-heading">
        <div className="min-w-0">
          <h1>{title}</h1>
          <Shimmer className="mt-3 h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="grid gap-3">
        {[0, 1, 2, 3].map((index) => (
          <Card key={index} className="gap-4 p-6">
            <Shimmer className="h-5 w-2/5" />
            <Shimmer className="h-4 w-4/5" />
            <Shimmer className="h-4 w-3/5" />
          </Card>
        ))}
      </div>
    </main>
  );
}
