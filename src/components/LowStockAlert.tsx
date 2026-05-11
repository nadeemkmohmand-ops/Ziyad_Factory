import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, X } from "lucide-react";

interface LowStockItem {
  id: string;
  name: string;
  type: "raw" | "finished";
  qty: number | null;
}

export function LowStockAlert() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [raw, fin] = await Promise.all([
        supabase.from("raw_rock_inventory").select("id, rock_name_urdu, quantity_tons"),
        supabase
          .from("finished_marble_inventory")
          .select("id, batch_number, quantity, stock_status")
          .or("stock_status.eq.low_stock,quantity.lt.10"),
      ]);

      const totalRaw = (raw.data ?? []).reduce(
        (s, r) => s + Number(r.quantity_tons ?? 0),
        0
      );
      const alerts: LowStockItem[] = [];

      if (totalRaw < 5) {
        alerts.push({
          id: "raw-total",
          name: "خام پتھر / Raw Rock",
          type: "raw",
          qty: totalRaw,
        });
      }

      (fin.data ?? []).forEach((r) => {
        alerts.push({
          id: r.id,
          name: r.batch_number ?? r.id.slice(0, 8),
          type: "finished",
          qty: r.quantity,
        });
      });

      setItems(alerts);
    };
    void load();
  }, []);

  if (dismissed || items.length === 0) return null;

  return (
    <Alert className="mb-4 border-amber-500/40 bg-amber-500/10 text-amber-200 flex items-start gap-3">
      <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
      <AlertDescription className="flex-1 text-sm">
        <span
          className="font-urdu text-amber-300 font-medium"
          style={{ direction: "rtl" }}
        >
          اسٹاک الرٹ:{" "}
        </span>
        {items.map((it, i) => (
          <span key={it.id}>
            {i > 0 && " · "}
            <Link
              to={it.type === "raw" ? "/inventory/raw" : "/inventory/finished"}
              className="underline hover:text-amber-100 transition-colors"
            >
              {it.name}
              {it.qty !== null &&
                ` (${it.qty} ${it.type === "raw" ? "tons" : "units"})`}
            </Link>
          </span>
        ))}
        {" "}
        <span className="text-amber-400/80 text-xs">— Low stock warning</span>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-amber-400 hover:text-amber-200 hover:bg-transparent shrink-0"
        onClick={() => setDismissed(true)}
      >
        <X className="h-3 w-3" />
      </Button>
    </Alert>
  );
}
