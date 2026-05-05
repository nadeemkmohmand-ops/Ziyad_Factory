import type { ReactNode } from "react";

export function PageHeader({
  title,
  urdu,
  subtitle,
  actions,
}: {
  title: string;
  urdu?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        {urdu && (
          <div
            className="font-urdu text-3xl text-primary leading-snug mb-0.5"
            style={{ direction: "rtl" }}
          >
            {urdu}
          </div>
        )}
        <h1 className="font-display text-xl md:text-2xl text-foreground/80 tracking-wide">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
