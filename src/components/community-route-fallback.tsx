"use client";

import { Card } from "@heroui/react";

function Shimmer({ className }: { className: string }) {
  return <div className={`nav-shimmer rounded-lg ${className}`} />;
}

export function CommunityRouteFallback() {
  return (
    <main className="page-shell nav-route-fallback" aria-busy="true" aria-label="正在加载页面">
      <span className="sr-only" role="status">
        正在加载，请稍候…
      </span>
      <Shimmer className="mb-4 h-8 w-48 rounded-xl" />
      <Shimmer className="mb-8 h-4 w-64" />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Card key={index} className="gap-5 p-6">
            <Shimmer className="h-14 w-14 rounded-2xl" />
            <Shimmer className="h-5 w-3/4" />
            <Shimmer className="h-16 w-full" />
            <Shimmer className="h-10 w-full rounded-xl" />
          </Card>
        ))}
      </div>
    </main>
  );
}
