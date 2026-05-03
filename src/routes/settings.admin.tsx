import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { PKR, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/settings/admin")({
  component: () => (
    <Protected>
      <AdminPanel />
    </Protected>
  ),
});

interface Settings { id: string; low_stock_threshold_tons: number; default_currency: string; default_unit: string; working_days_per_week: number; overtime_multiplier: number; working_hours_per_day: number }
interface History { id: string; category_id: string; old_price_per_sqft: number | null; new_price_per_sqft: number | null; changed_at: string }

function AdminPanel() {
  const { hasRole } = useAuth();
  if (!hasRole("admin")) return <div className="p-6"><PageHeader title="Admin Settings" urdu="ایڈمن پینل" subtitle="Admins only." /></div>;

  return (
    <div>
      <PageHeader title="Admin Panel" urdu="ایڈمن پینل" subtitle="Global settings, price history & backup." />
      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">App Settings</TabsTrigger>
          <TabsTrigger value="history">Price History</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>
        <TabsContent value="settings"><AppSettings /></TabsContent>
        <TabsContent value="history"><PriceHistory /></TabsContent>
        <TabsContent value="backup"><Backup /></TabsContent>
      </Tabs>
    </div>
  );
}

function AppSettings() {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => { void supabase.from("app_settings").select("*").maybeSingle().then((r) => setS(r.data as Settings | null)); }, []);
  if (!s) return null;
  const save = async () => {
    const { error } = await supabase.from("app_settings").update({
      low_stock_threshold_tons: s.low_stock_threshold_tons,
      default_currency: s.default_currency,
      default_unit: s.default_unit,
      working_days_per_week: s.working_days_per_week,
      overtime_multiplier: s.overtime_multiplier,
      working_hours_per_day: s.working_hours_per_day,
    }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };
  return (
    <Card className="p-6 max-w-2xl space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Low Stock Threshold (tons)</Label><Input type="number" value={s.low_stock_threshold_tons} onChange={(e) => setS({ ...s, low_stock_threshold_tons: Number(e.target.value) })} /></div>
        <div><Label>Default Currency</Label><Input value={s.default_currency} onChange={(e) => setS({ ...s, default_currency: e.target.value })} /></div>
        <div><Label>Default Unit</Label><Input value={s.default_unit} onChange={(e) => setS({ ...s, default_unit: e.target.value })} /></div>
        <div><Label>Working Days / Week</Label><Input type="number" value={s.working_days_per_week} onChange={(e) => setS({ ...s, working_days_per_week: Number(e.target.value) })} /></div>
        <div><Label>Overtime Multiplier</Label><Input type="number" step="0.1" value={s.overtime_multiplier} onChange={(e) => setS({ ...s, overtime_multiplier: Number(e.target.value) })} /></div>
        <div><Label>Working Hours / Day</Label><Input type="number" step="0.5" value={s.working_hours_per_day} onChange={(e) => setS({ ...s, working_hours_per_day: Number(e.target.value) })} /></div>
      </div>
      <Button onClick={save} className="bg-primary text-primary-foreground">Save Settings</Button>
    </Card>
  );
}

function PriceHistory() {
  const [rows, setRows] = useState<History[]>([]);
  const [cats, setCats] = useState<{ id: string; name_urdu: string; name_english: string | null }[]>([]);
  useEffect(() => {
    void Promise.all([
      supabase.from("marble_price_history").select("*").order("changed_at", { ascending: false }).limit(200),
      supabase.from("marble_categories").select("id, name_urdu, name_english"),
    ]).then(([h, c]) => { setRows((h.data ?? []) as History[]); setCats((c.data ?? []) as typeof cats); });
  }, []);
  const nameOf = (id: string) => { const c = cats.find((x) => x.id === id); return c?.name_english ?? c?.name_urdu ?? "—"; };
  return (
    <Card className="p-0 mt-4 overflow-hidden">
      <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Old / sqft</TableHead><TableHead className="text-right">New / sqft</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((r) => <TableRow key={r.id}><TableCell>{fmtDate(r.changed_at)}</TableCell><TableCell>{nameOf(r.category_id)}</TableCell><TableCell className="text-right">{PKR(r.old_price_per_sqft ?? 0)}</TableCell><TableCell className="text-right text-primary">{PKR(r.new_price_per_sqft ?? 0)}</TableCell></TableRow>)}
        {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">کوئی ڈیٹا نہیں</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function Backup() {
  const [busy, setBusy] = useState(false);
  const tables = ["customers", "suppliers", "marble_categories", "marble_photos", "raw_rock_inventory", "finished_marble_inventory",
    "sales_orders", "sales_order_items", "payments", "lending_borrowing", "labour", "attendance", "salary_payments", "expenses",
    "machine_equipment", "production_logs", "founders", "factory_info", "app_settings", "marble_price_history"] as const;
  const exportAll = async () => {
    setBusy(true);
    try {
      const dump: Record<string, unknown> = { exported_at: new Date().toISOString() };
      for (const t of tables) {
        const { data } = await supabase.from(t).select("*");
        dump[t] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `marble-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };
  return (
    <Card className="p-6 mt-4 max-w-xl">
      <h3 className="font-display text-lg mb-2">Full Data Backup</h3>
      <p className="text-sm text-muted-foreground mb-4">Export all factory data as a single JSON file.</p>
      <Button onClick={exportAll} disabled={busy} className="bg-primary text-primary-foreground"><Download className="h-4 w-4" /> {busy ? "Exporting…" : "Download JSON Backup"}</Button>
    </Card>
  );
}
