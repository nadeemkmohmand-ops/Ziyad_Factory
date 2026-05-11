/**
 * DataCardView — Mobile-friendly card-based data display.
 * Shows cards on mobile, falls back to table on desktop.
 * Inspired by DigiKhata's party card list pattern.
 */
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye } from "lucide-react";

export interface CardField {
  label: string;
  labelUrdu?: string;
  value: ReactNode;
  /** Show as highlighted/primary */
  primary?: boolean;
  /** Show as destructive/red */
  destructive?: boolean;
  /** Show as success/green */
  success?: boolean;
  /** Small text */
  small?: boolean;
}

export interface CardAction {
  label?: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "ghost";
}

interface Props {
  items: {
    id: string;
    title: string;
    subtitle?: string;
    badge?: { label: string; variant?: "default" | "outline" | "destructive" | "success" | "warning" };
    fields: CardField[];
    actions?: CardAction[];
  }[];
  emptyMessage?: string;
  emptyMessageUrdu?: string;
  emptyIcon?: ReactNode;
}

const badgeClass = (variant?: string) => {
  switch (variant) {
    case "success": return "bg-success/20 text-success border-success/30";
    case "warning": return "bg-warning/20 text-warning border-warning/30";
    case "destructive": return "bg-destructive/20 text-destructive border-destructive/30";
    case "outline": return "border-border";
    default: return "bg-primary/20 text-primary border-primary/30";
  }
};

export function DataCardView({
  items,
  emptyMessage = "No records yet",
  emptyMessageUrdu = "ابھی کوئی ریکارڈ نہیں",
  emptyIcon,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        {emptyIcon && <div className="flex justify-center mb-4">{emptyIcon}</div>}
        <p className="font-urdu text-lg text-primary" style={{ direction: "rtl" }}>
          {emptyMessageUrdu}
        </p>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="rounded-xl border border-border/50 bg-card/80 p-4 hover:border-primary/30 transition-all"
        >
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground truncate">{item.title}</div>
              {item.subtitle && (
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.subtitle}
                </div>
              )}
            </div>
            {item.badge && (
              <Badge className={`ml-2 shrink-0 text-[10px] ${badgeClass(item.badge.variant)}`}>
                {item.badge.label}
              </Badge>
            )}
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {item.fields.map((f, fi) => (
              <div key={fi} className={f.small ? "col-span-2" : ""}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {f.label}{f.labelUrdu ? ` / ${f.labelUrdu}` : ""}
                </div>
                <div
                  className={`text-sm font-medium mt-0.5 ${
                    f.primary ? "text-primary" : f.destructive ? "text-destructive" : f.success ? "text-success" : "text-foreground"
                  } ${f.small ? "text-xs font-normal" : ""}`}
                >
                  {f.value}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          {item.actions && item.actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
              {item.actions.map((a, ai) => (
                <Button
                  key={ai}
                  size="sm"
                  variant={a.variant ?? "ghost"}
                  onClick={a.onClick}
                  className="gap-1 text-xs"
                >
                  {a.icon}
                  {a.label}
                </Button>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Helper to wrap a view with responsive behavior:
 * - Mobile: shows DataCardView
 * - Desktop: shows the children (typically a Table)
 */
export function ResponsiveDataView({
  cardView,
  tableView,
}: {
  cardView: ReactNode;
  tableView: ReactNode;
}) {
  return (
    <>
      <div className="md:hidden">{cardView}</div>
      <div className="hidden md:block">{tableView}</div>
    </>
  );
}
