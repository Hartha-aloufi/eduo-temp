"use client";

import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";

interface ClientMDXWrapperProps {
  children: React.ReactNode;
}

export function ClientMDXWrapper({ children }: ClientMDXWrapperProps) {
  const { fontSize: settingsFontSize, showHeadings } = useSettings();

  return (
    <article
      className={cn(
        "dark:prose-invert max-w-none",
        `prose-${settingsFontSize}`,
        !showHeadings && "prose-no-headings"
      )}
    >
      {children}
    </article>
  );
}
