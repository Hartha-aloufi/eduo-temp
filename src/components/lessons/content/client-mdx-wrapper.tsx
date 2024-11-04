'use client';

import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/use-settings';

interface ClientMDXWrapperProps {
  children: React.ReactNode;
  fontSize?: 'small' | 'medium' | 'large';
}

export function ClientMDXWrapper({ children, fontSize }: ClientMDXWrapperProps) {
  const { fontSize: settingsFontSize } = useSettings();
  const activeFontSize = fontSize || settingsFontSize;
  
  return (
    <article 
      className={cn(
        "prose prose-lg dark:prose-invert max-w-none",
        `prose-${activeFontSize}`
      )}
    >
      {children}
    </article>
  );
}