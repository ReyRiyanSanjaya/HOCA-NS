import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageContainer({ children, className, noPadding }: PageContainerProps) {
  return (
    <main className={cn("page-offset min-h-screen", className)}>
      <div className={cn(
        "w-full max-w-7xl mx-auto",
        !noPadding && "px-4 py-5 md:px-5 md:py-6"
      )}>
        {children}
      </div>
    </main>
  );
}
