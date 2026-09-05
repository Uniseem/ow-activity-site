"use client";
import { Card, Skeleton } from "@heroui/react";
export default function Loading() {
  return (
    <main className="page-shell" aria-busy="true" aria-label="正在加载页面">
      <span className="sr-only" role="status">
        正在加载，请稍候…
      </span>
      <Skeleton className="mb-4 h-8 w-48 rounded-xl" />
      <Skeleton className="mb-8 h-4 w-64 rounded-lg" />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Card
            key={index}
            className="gap-5 p-6"
          >
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <Skeleton className="h-5 w-3/4 rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </Card>
        ))}
      </div>
    </main>
  );
}
