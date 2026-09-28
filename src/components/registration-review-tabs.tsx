"use client";

import type { ReactNode } from "react";
import { Tabs } from "@heroui/react";

export function RegistrationReviewTabs({
  sections,
  selected,
}: {
  sections: { id: string; label: string; count: number; content: ReactNode }[];
  selected: string;
}) {
  return (
    <Tabs defaultSelectedKey={selected} className="w-full">
      <Tabs.ListContainer className="w-full max-w-md">
        <Tabs.List aria-label="报名审核状态" className="w-full">
          {sections.map((section) => (
            <Tabs.Tab
              key={section.id}
              id={section.id}
              className="min-w-0 flex-1 px-2"
            >
              {section.label}
              <span className="ml-2 text-xs tabular-nums">{section.count}</span>
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {sections.map((section) => (
        <Tabs.Panel key={section.id} id={section.id} className="pt-4">
          {section.content}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
