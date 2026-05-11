import type { ReactNode } from "react";

export function PageHeader({
  title,
  urdu,
  subtitle,
  actions,
}: {
  title?: string;
  urdu?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const heading = urdu || title || "";
  return (
    <div
      className="flex flex-col sm:flex-row-reverse sm:items-end justify-between gap-3 mb-6"
      dir="rtl"
    >
      <div className="min-w-0 text-right">
        <h1
          className="font-urdu text-3xl md:text-4xl text-primary leading-snug"
          style={{ direction: "rtl" }}
        >
          {heading}
        </h1>
        {subtitle && (
          <p className="font-urdu text-base text-muted-foreground mt-2 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 shrink-0" dir="ltr">{actions}</div>
      )}
    </div>
  );
}
