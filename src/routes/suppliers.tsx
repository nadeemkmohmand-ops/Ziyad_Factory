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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { afterSupplierSave } from "@/lib/chain-reactions";
import { PKR } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/suppliers")({
  component: () => (<Protected><Suppliers /></Protected>),
});

interface Row {
  id: string; name: string; phone: string | null; address: string | null;
  email: string | null; supply_type: string | null;
  rock_type: string | null; quantity_tons: number | null; price_per_ton: number | null;
  current_balance: number | null; notes: string | null;
}

const empty = { name: "", phone: "", email: "", address: "", supply_type: "raw rock",
  rock_type: "", quantity_tons: "", price_per_ton: "", notes: "" };

function Suppliers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("نام درکار / Name required");
    const payload = {
      name: form.name, phone: form.phone || null, email: form.email || null,
      address: form.address || null, supply_type: form.supply_type || null,
      rock_type: form.rock_type || null,
      quantity_tons: form.quantity_tons ? Number(form.quantity_tons) : null,
      price_per_ton: form.price_per_ton ? Number(form.price_per_ton) : null,
      notes: form.notes || null,
    };
    const { error } = edit
      ? await supabase.from("suppliers").update(payload).eq("id", edit.id)
      : await supabase.from("suppliers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("محفوظ / Saved"); setOpen(false); void load();
  };

  const del = async (id: string) => {
    if (!confirm("ڈیلیٹ کریں؟")) return;
    await supabase.from("suppliers").delete().eq("id", id); void load();
  };

  const startEdit = (r: Row) => {
    setEdit(r); setForm({
      name: r.name, phone: r.phone ?? "", email: r.email ?? "", address: r.address ?? "",
      supply_type: r.supply_type ?? "raw rock", rock_type: r.rock_type ?? "",
      quantity_tons: String(r.quantity_tons ?? ""), price_per_ton: String(r.price_per_ton ?? ""),
      notes: r.notes ?? "",
    }); setOpen(true);
  };

  return (
    <div>
      <PageHeader title="Suppliers" urdu="سپلائر" subtitle="خام پتھر اور دیگر سامان فراہم کرنے والے"
        actions={<Button onClick={() => { setEdit(null); setForm(empty); setOpen(true); }} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> نیا سپلائر</Button>}
      />

      <Card className="p-0 overflow-x-auto">
        <Table className="marble-table min-w-[800px]">
          <TableHeader><TableRow>
            <TableHead>نام / Name</TableHead>
            <TableHead>پتھر / Rock</TableHead>
            <TableHead className="text-right">ٹن</TableHead>
            <TableHead className="text-right">قیمت/ٹن</TableHead>
            <TableHead className="text-right">کل / Total</TableHead>
            <TableHead>رابطہ / Contact</TableHead>
            <TableHead className="text-right">باقی</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">کوئی سپلائر نہیں</TableCell></TableRow> :
              rows.map((r) => {
                const tot = Number(r.quantity_tons ?? 0) * Number(r.price_per_ton ?? 0);
                const b = Number(r.current_balance ?? 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}{r.address && <div className="text-xs text-muted-foreground">{r.address}</div>}</TableCell>
                    <TableCell className="text-sm">{r.rock_type ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.quantity_tons ?? "—"}</TableCell>
                    <TableCell className="text-right">{PKR(r.price_per_ton)}</TableCell>
                    <TableCell className="text-right text-primary font-medium">{PKR(tot)}</TableCell>
                    <TableCell className="text-xs">
                      {r.phone && <div dir="ltr">{r.phone}</div>}
                      {r.email && <div dir="ltr" className="text-muted-foreground">{r.email}</div>}
                    </TableCell>
                    <TableCell className={`text-right ${b > 0 ? "text-destructive" : "text-success"}`}>{PKR(b)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit ? "ترمیم" : "نیا"} سپلائر</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>نام / Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>فون / Phone</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>ای میل / Email</Label><Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>پتہ / Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="border-t pt-3 space-y-2">
              <div className="text-xs text-muted-foreground">خام پتھر / Raw rock supply</div>
              <div><Label>پتھر کی قسم / Rock Type</Label><Input value={form.rock_type} onChange={(e) => setForm({ ...form, rock_type: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>ٹن / Tons</Label><Input type="number" value={form.quantity_tons} onChange={(e) => setForm({ ...form, quantity_tons: e.target.value })} /></div>
                <div><Label>قیمت/ٹن</Label><Input type="number" value={form.price_per_ton} onChange={(e) => setForm({ ...form, price_per_ton: e.target.value })} /></div>
                <div><Label>کل (خودکار)</Label><Input value={PKR(Number(form.quantity_tons||0)*Number(form.price_per_ton||0))} readOnly className="bg-muted/40" /></div>
              </div>
            </div>
            <div><Label>نوٹس / Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>منسوخ</Button><Button onClick={save} className="bg-primary text-primary-foreground">محفوظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
