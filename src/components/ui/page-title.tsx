import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PageTitleProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
  className?: string;
  iconClassName?: string;
  titleClassName?: string;
}

export function PageTitle({ 
  title, 
  icon: Icon, 
  description, 
  className = "",
  iconClassName = "",
  titleClassName = ""
}: PageTitleProps) {
  return (
    <div className={className}>
      <h1 className={`text-3xl font-bold tracking-tight flex items-center gap-3 text-primary ${titleClassName}`}>
        {Icon && (
          <div className={`p-2 rounded-lg bg-primary/10 ${iconClassName}`}>
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground mt-2">
          {description}
        </p>
      )}
    </div>
  );
}

