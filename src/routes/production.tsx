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
import { supabase } from "@/integrations/supabase/client";
import { decrementRawRockFIFO } from "@/lib/chain-reactions";
import { num, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

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
interface Raw { id: string; rock_name_urdu: string | null; quantity_tons: number | null }

const empty = {
  date: todayISO(), raw_rock_used_tons: "", slabs_produced: "", sqft_produced: "",
  category_id: "", operator_name: "", machine_id: "", wastage_percent: "", notes: "",
};

function Production() {
  const [rows, setRows] = useState<P[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [machines, setMachines] = useState<Mach[]>([]);
  const [raws, setRaws] = useState<Raw[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [p, c, m, r] = await Promise.all([
      supabase.from("production_logs").select("*").order("date", { ascending: false }),
      supabase.from("marble_categories").select("id, name_urdu, name_english, unit"),
      supabase.from("machine_equipment").select("id, machine_name"),
      supabase.from("raw_rock_inventory").select("id, rock_name_urdu, quantity_tons").gt("quantity_tons", 0).order("purchase_date"),
    ]);
    setRows((p.data ?? []) as P[]); setCats((c.data ?? []) as Cat[]);
    setMachines((m.data ?? []) as Mach[]); setRaws((r.data ?? []) as Raw[]);
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

    // Deduct tons FIFO from raw rock (atomic via RPC)
    await decrementRawRockFIFO(tonsUsed);

    // Add finished stock
    if (form.category_id && form.sqft_produced) {
      const cat = cats.find((c) => c.id === form.category_id);
      await supabase.from("finished_marble_inventory").insert({
        category_id: form.category_id,
        batch_number: "PROD-" + Date.now().toString().slice(-6),
        quantity: Number(form.sqft_produced),
        unit: cat?.unit ?? "sqft",
        production_date: form.date,
        cost_per_unit: 0,
        selling_price_per_unit: 0,
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

  return (
    <div>
      <PageHeader title="Production Log" urdu="پیداوار"
        actions={<Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> Log Production</Button>}
      />
      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Operator</TableHead>
            <TableHead className="text-right">Raw (t)</TableHead><TableHead className="text-right">Slabs</TableHead>
            <TableHead className="text-right">Sqft</TableHead><TableHead className="text-right">Wastage %</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No logs.</TableCell></TableRow> :
              rows.map((r) => {
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
                    <TableCell><Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button></TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
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
              <div><Label>Raw used (tons)</Label><Input type="number" value={form.raw_rock_used_tons} onChange={(e) => setForm({ ...form, raw_rock_used_tons: e.target.value })} /></div>
              <div><Label>Slabs</Label><Input type="number" value={form.slabs_produced} onChange={(e) => setForm({ ...form, slabs_produced: e.target.value })} /></div>
              <div><Label>Sqft produced</Label><Input type="number" value={form.sqft_produced} onChange={(e) => setForm({ ...form, sqft_produced: e.target.value })} /></div>
            </div>
            <div><Label>Wastage %</Label><Input type="number" value={form.wastage_percent} onChange={(e) => setForm({ ...form, wastage_percent: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-primary text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
