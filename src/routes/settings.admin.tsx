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
import { Download, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { PKR, fmtDate } from "@/lib/format";
import { exportAllToExcel, downloadJsonBackup, clearAllData, restoreFromJson } from "@/lib/data-backup";
import { useRef } from "react";

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
      <PageHeader title="Admin Panel" urdu="ایڈمن پینل" subtitle="عالمی سیٹنگز، قیمت تاریخ اور ڈیٹا بیک اپ — Global settings, price history & backup" />
      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">سیٹنگز / App Settings</TabsTrigger>
          <TabsTrigger value="history">قیمت تاریخ / Price History</TabsTrigger>
          <TabsTrigger value="backup">بیک اپ / Backup</TabsTrigger>
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
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = async () => {
    setBusy(true);
    try { await downloadJsonBackup(); toast.success("JSON بیک اپ ڈاؤنلوڈ ہو گیا"); }
    catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };
  const exportXlsx = async () => {
    setBusy(true);
    try { await exportAllToExcel(); toast.success("Excel ڈاؤنلوڈ ہو گیا"); }
    catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };
  const clearAll = async () => {
    if (!confirm("⚠️ تمام ڈیٹا حذف ہو جائے گا۔ پہلے خودکار بیک اپ ڈاؤنلوڈ ہوگا۔ کیا آپ یقینی ہیں؟")) return;
    if (!confirm("آخری تصدیق: واقعی تمام ڈیٹا صاف کریں؟")) return;
    setBusy(true);
    try { await clearAllData(); toast.success("تمام ڈیٹا صاف ہو گیا — بیک اپ آپ کے ڈاؤنلوڈز میں ہے"); }
    catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };
  const onRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!confirm("بحالی شروع کریں؟ موجودہ ڈیٹا اوور رائٹ ہو سکتا ہے")) return;
    setBusy(true);
    const res = await restoreFromJson(f);
    if (res.ok) toast.success(res.message); else toast.error(res.message);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="grid gap-4 mt-4 md:grid-cols-2">
      <Card className="p-6">
        <h3 className="font-display text-lg mb-2">📊 ڈیٹا ایکسپورٹ</h3>
        <p className="text-sm text-muted-foreground mb-4">تمام سیکشنز (سپلائر، گاہک، اخراجات وغیرہ) کا ڈیٹا ایک Excel فائل میں ہر ٹیبل کا الگ شیٹ + لیبل کے ساتھ۔</p>
        <div className="flex flex-col gap-2">
          <Button onClick={exportXlsx} disabled={busy} className="bg-primary text-primary-foreground"><FileSpreadsheet className="h-4 w-4" /> Excel ڈاؤنلوڈ کریں</Button>
          <Button onClick={exportJson} disabled={busy} variant="outline"><Download className="h-4 w-4" /> JSON بیک اپ</Button>
        </div>
      </Card>

      <Card className="p-6 border-destructive/40">
        <h3 className="font-display text-lg mb-2 text-destructive">⚠️ تمام ڈیٹا صاف کریں</h3>
        <p className="text-sm text-muted-foreground mb-4">حذف سے پہلے خودکار JSON بیک اپ ڈاؤنلوڈ ہوگا۔ بعد میں اسی فائل سے بحالی ممکن ہے۔</p>
        <div className="flex flex-col gap-2">
          <Button onClick={clearAll} disabled={busy} variant="destructive"><Trash2 className="h-4 w-4" /> سب کچھ حذف کریں</Button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onRestore} />
          <Button onClick={() => fileRef.current?.click()} disabled={busy} variant="outline"><Upload className="h-4 w-4" /> JSON سے بحال کریں</Button>
        </div>
      </Card>
    </div>
  );
}
