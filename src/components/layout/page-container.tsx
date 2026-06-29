import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageContainer({ children, className, noPadding }: PageContainerProps) {
  return (
    <main className={cn(
      /* Mobile: top bar = 56px, bottom nav = 64px */
      "pt-14 pb-20",
      /* Desktop: sidebar offset, no top/bottom padding for fixed bars */
      "md:pt-0 md:pb-6 md:pl-14 lg:pl-56",
      "min-h-screen",
      className
    )}>
      <div className={cn(
        "w-full max-w-7xl mx-auto",
        !noPadding && "px-4 py-4 md:px-5 md:py-6"
      )}>
        {children}
      </div>
    </main>
  );
}
