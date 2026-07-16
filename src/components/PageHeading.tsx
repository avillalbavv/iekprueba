import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageBreadcrumb({ current, className }: { current: string; className?: string }) {
  return (
    <nav
      className={cn("mb-4 flex items-center gap-2 text-xs text-muted-foreground", className)}
      aria-label="Navegación jerárquica"
    >
      <Link to="/" className="transition-colors hover:text-foreground">
        Inicio
      </Link>
      <ChevronRight className="h-3 w-3" aria-hidden="true" />
      <span className="font-medium text-foreground">{current}</span>
    </nav>
  );
}

export function PageEyebrow({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "glass mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      {children}
    </span>
  );
}
