import { ReactNode } from "react";

interface PageSlugProps {
  children: ReactNode;
  className?: string;
}

export function PageSlug({ children, className = "" }: PageSlugProps) {
  return (
    <p className={`text-muted-foreground ${className}`}>
      {children}
    </p>
  );
}

