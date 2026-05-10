import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { decrementRawRockFIFO } from "@/lib/chain-reactions";
import { PKR, num, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/production")({
  component: () => (
    <Protected>
      <Production />
    </Protected>
  ),
});

interface P {
  id: string; date: string | null; raw_rock_used_tons: number | null;
  slabs_produced: number | null; sqft_produced: number | null;
  category_id: string | null; operator_name: string | null;
  machine_id: string | null; wastage_percent: number | null; notes: string | null;
}
interface Cat { id: string; name_urdu: string; name_english: string | null; unit: string }
interface Mach { id: string; machine_name: string | null }
interface Raw { id: string; rock_name_urdu: string | null; quantity_tons: number | null; purchase_price_per_ton: number | null }

const empty = {
  date: todayISO(), raw_rock_used_tons: "", slabs_produced: "", sqft_produced: "",
  category_id: "", operator_name: "", machine_id: "", wastage_percent: "", notes: "",
};

function Production() {
  const [rows, setRows] = useState<P[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [machines, setMachines] = useState<Mach[]>([]);
  const [raws, setRaws] = useState<Raw[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [statsOpen, setStatsOpen] = useState(true);

  const load = async () => {
    setLoading(true);
    const [p, c, m, r] = await Promise.all([
      supabase.from("production_logs").select("*").order("date", { ascending: false }),
      supabase.from("marble_categories").select("id, name_urdu, name_english, unit"),
      supabase.from("machine_equipment").select("id, machine_name"),
      supabase.from("raw_rock_inventory").select("id, rock_name_urdu, quantity_tons, purchase_price_per_ton").order("purchase_date"),
    ]);
    setRows((p.data ?? []) as P[]);
    setCats((c.data ?? []) as Cat[]);
    setMachines((m.data ?? []) as Mach[]);
    setRaws((r.data ?? []) as Raw[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    const tonsUsed = Number(form.raw_rock_used_tons || 0);
    const { error } = await supabase.from("production_logs").insert({
      date: form.date,
      raw_rock_used_tons: tonsUsed,
      slabs_produced: form.slabs_produced ? Number(form.slabs_produced) : null,
      sqft_produced: form.sqft_produced ? Number(form.sqft_produced) : null,
      category_id: form.category_id || null,
      operator_name: form.operator_name || null,
      machine_id: form.machine_id || null,
      wastage_percent: form.wastage_percent ? Number(form.wastage_percent) : null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    await decrementRawRockFIFO(tonsUsed);
    if (form.category_id && form.sqft_produced) {
      const cat = cats.find((c) => c.id === form.category_id);
      await supabase.from("finished_marble_inventory").insert({
        category_id: form.category_id,
        batch_number: "PROD-" + Date.now().toString().slice(-6),
        quantity: Number(form.sqft_produced),
        unit: cat?.unit ?? "sqft",
        production_date: form.date,
        cost_per_unit: 0, selling_price_per_unit: 0,
        stock_status: "in_stock",
      });
    }
    toast.success("Production logged");
    setOpen(false); setForm(empty); void load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete log?")) return;
    await supabase.from("production_logs").delete().eq("id", id);
    void load();
  };

  // Efficiency stats
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const totalRawAll = rows.reduce((s, r) => s + Number(r.raw_rock_used_tons ?? 0), 0);
  const totalRawMonth = rows.filter((r) => (r.date ?? "") >= monthStart).reduce((s, r) => s + Number(r.raw_rock_used_tons ?? 0), 0);
  const totalSlabs = rows.reduce((s, r) => s + Number(r.slabs_produced ?? 0), 0);
  const totalSqft = rows.reduce((s, r) => s + Number(r.sqft_produced ?? 0), 0);
  const avgWastage = rows.length > 0 ? rows.reduce((s, r) => s + Number(r.wastage_percent ?? 0), 0) / rows.length : 0;
  const yieldEff = totalRawAll > 0 ? (totalSlabs / totalRawAll).toFixed(1) : "—";

  // Cost per slab (avg raw cost × tons used ÷ slabs)
  const avgRawCost = raws.length > 0
    ? raws.reduce((s, r) => s + Number(r.purchase_price_per_ton ?? 0), 0) / raws.length
    : 0;
  const costPerSlab = totalSlabs > 0 ? (avgRawCost * totalRawAll) / totalSlabs : 0;

  // Best machine (lowest avg wastage)
  const machWaste: Record<string, { total: number; count: number }> = {};
  rows.forEach((r) => {
    if (!r.machine_id || r.wastage_percent === null) return;
    if (!machWaste[r.machine_id]) machWaste[r.machine_id] = { total: 0, count: 0 };
    machWaste[r.machine_id].total += r.wastage_percent;
    machWaste[r.machine_id].count += 1;
  });
  let bestMachId = "", bestAvg = Infinity;
  Object.entries(machWaste).forEach(([mid, { total, count }]) => {
    const avg = total / count;
    if (avg < bestAvg) { bestAvg = avg; bestMachId = mid; }
  });
  const bestMach = machines.find((m) => m.id === bestMachId)?.machine_name ?? "—";

  return (
    <div>
      <PageHeader title="Production Log" urdu="پیداوار"
        actions={<Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> Log Production</Button>}
      />

      {/* Efficiency Stats Panel */}
      <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
        <Card className="mb-4 overflow-hidden">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-card/60 transition-colors">
              <div>
                <div className="font-urdu text-base text-primary" style={{ direction: "rtl" }}>پیداوار کی کارکردگی</div>
                <div className="text-xs text-muted-foreground">Production Efficiency Stats</div>
              </div>
              {statsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t border-border/40 p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="کل خام پتھر (سب وقت)" sub="Total Raw Rock All-Time" value={`${num(totalRawAll)} tons`} />
              <StatCard label="اس ماہ خام پتھر" sub="Raw Rock This Month" value={`${num(totalRawMonth)} tons`} />
              <StatCard label="کل سلیب تیار" sub="Total Slabs Produced" value={String(totalSlabs)} />
              <StatCard label="کل اسکوائر فٹ" sub="Total Sqft Produced" value={num(totalSqft)} />
              <StatCard label="اوسط فضلہ %" sub="Avg Wastage %" value={`${avgWastage.toFixed(1)}%`} accent={avgWastage > 15 ? "warn" : "ok"} />
              <StatCard label="سلیب فی ٹن" sub="Yield: Slabs per Ton" value={String(yieldEff)} />
              <StatCard label="لاگت فی سلیب" sub="Cost per Slab (est.)" value={PKR(costPerSlab)} />
              <StatCard label="بہترین مشین" sub="Best Machine (lowest wastage)" value={bestMach} />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table className="marble-table min-w-[600px]">
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Operator</TableHead>
              <TableHead className="text-right">Raw (t)</TableHead><TableHead className="text-right">Slabs</TableHead>
              <TableHead className="text-right">Sqft</TableHead><TableHead className="text-right">Wastage %</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}</TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8}>
                  <div className="py-16 text-center">
                    <div className="text-6xl mb-4">🪨</div>
                    <p className="font-urdu text-lg text-primary" style={{ direction: "rtl" }}>ابھی کوئی ریکارڈ نہیں</p>
                    <p className="text-sm text-muted-foreground">No production logs yet.</p>
                  </div>
                </TableCell></TableRow>
              ) : rows.map((r) => {
                const cat = cats.find((c) => c.id === r.category_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.date)}</TableCell>
                    <TableCell><div className="font-urdu text-base">{cat?.name_urdu ?? "—"}</div></TableCell>
                    <TableCell>{r.operator_name ?? "—"}</TableCell>
                    <TableCell className="text-right">{num(r.raw_rock_used_tons)}</TableCell>
                    <TableCell className="text-right">{r.slabs_produced ?? "—"}</TableCell>
                    <TableCell className="text-right">{num(r.sqft_produced)}</TableCell>
                    <TableCell className="text-right text-warning">{num(r.wastage_percent)}%</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Production</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Operator</Label><Input value={form.operator_name} onChange={(e) => setForm({ ...form, operator_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}><span className="font-urdu mr-2">{c.name_urdu}</span> {c.name_english}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Machine</Label>
                <Select value={form.machine_id} onValueChange={(v) => setForm({ ...form, machine_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.machine_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Raw (tons)</Label><Input type="number" value={form.raw_rock_used_tons} onChange={(e) => setForm({ ...form, raw_rock_used_tons: e.target.value })} /></div>
              <div><Label>Slabs</Label><Input type="number" value={form.slabs_produced} onChange={(e) => setForm({ ...form, slabs_produced: e.target.value })} /></div>
              <div><Label>Sqft</Label><Input type="number" value={form.sqft_produced} onChange={(e) => setForm({ ...form, sqft_produced: e.target.value })} /></div>
            </div>
            <div><Label>Wastage %</Label><Input type="number" value={form.wastage_percent} onChange={(e) => setForm({ ...form, wastage_percent: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-primary text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, sub, value, accent }: { label: string; sub: string; value: string; accent?: "ok" | "warn" }) {
  const color = accent === "warn" ? "text-destructive" : accent === "ok" ? "text-success" : "text-foreground";
  return (
    <div className="bg-card/40 border border-border/30 rounded-lg p-3">
      <div className="font-urdu text-xs text-primary/80 mb-0.5" style={{ direction: "rtl" }}>{label}</div>
      <div className="text-[10px] text-muted-foreground mb-1">{sub}</div>
      <div className={`font-display text-xl ${color}`}>{value}</div>
    </div>
  );
}
