import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function PageContainer({
  children,
  className,
  fullWidth,
}: PageContainerProps) {
  return (
    <main
      className={cn(
        "min-h-screen pb-20 md:pb-4 md:pl-16 lg:pl-56",
        className
      )}
    >
      <div
        className={cn(
          "w-full",
          !fullWidth && "max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6"
        )}
      >
        {children}
      </div>
    </main>
  );
}
