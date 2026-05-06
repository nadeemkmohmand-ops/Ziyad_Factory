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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PKR } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLookup } from "@/lib/lookups";

export const Route = createFileRoute("/customers")({
  component: () => (<Protected><Customers /></Protected>),
});

interface Row {
  id: string; name: string; phone: string | null; address: string | null;
  email: string | null; customer_type: string | null;
  marble_type: string | null; marble_size: string | null;
  pieces: number | null; price_per_piece: number | null;
  credit_limit: number | null; current_balance: number | null; notes: string | null;
}

const empty = { name: "", phone: "", email: "", address: "", customer_type: "retail",
  marble_type: "", marble_size: "", pieces: "", price_per_piece: "", credit_limit: "0", notes: "" };

function Customers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");
  const sizes = useLookup("marble_sizes");
  const [newSize, setNewSize] = useState("");

  const load = async () => {
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("نام درکار");
    const payload = {
      name: form.name, phone: form.phone || null, email: form.email || null,
      address: form.address || null, customer_type: form.customer_type,
      marble_type: form.marble_type || null, marble_size: form.marble_size || null,
      pieces: form.pieces ? Number(form.pieces) : null,
      price_per_piece: form.price_per_piece ? Number(form.price_per_piece) : null,
      credit_limit: Number(form.credit_limit || 0), notes: form.notes || null,
    };
    const { error } = edit
      ? await supabase.from("customers").update(payload).eq("id", edit.id)
      : await supabase.from("customers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("محفوظ"); setOpen(false); void load();
  };

  const del = async (id: string) => {
    if (!confirm("ڈیلیٹ؟")) return;
    await supabase.from("customers").delete().eq("id", id); void load();
  };

  const startEdit = (r: Row) => {
    setEdit(r); setForm({
      name: r.name, phone: r.phone ?? "", email: r.email ?? "", address: r.address ?? "",
      customer_type: r.customer_type ?? "retail", marble_type: r.marble_type ?? "",
      marble_size: r.marble_size ?? "", pieces: String(r.pieces ?? ""),
      price_per_piece: String(r.price_per_piece ?? ""),
      credit_limit: String(r.credit_limit ?? 0), notes: r.notes ?? "",
    }); setOpen(true);
  };

  const filtered = rows.filter(r => r.name.toLowerCase().includes(q.toLowerCase()) || (r.phone ?? "").includes(q));

  return (
    <div>
      <PageHeader title="Customers" urdu="گاہک"
        actions={<Button onClick={() => { setEdit(null); setForm(empty); setOpen(true); }} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> نیا گاہک</Button>}
      />
      <div className="mb-3"><Input placeholder="نام یا فون سے تلاش…" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      <Card className="p-0 overflow-x-auto">
        <Table className="marble-table min-w-[850px]">
          <TableHeader><TableRow>
            <TableHead>نام / Name</TableHead>
            <TableHead>قسم</TableHead>
            <TableHead>ماربل</TableHead>
            <TableHead>سائز</TableHead>
            <TableHead className="text-right">تعداد</TableHead>
            <TableHead className="text-right">قیمت/پیس</TableHead>
            <TableHead className="text-right">کل</TableHead>
            <TableHead>رابطہ</TableHead>
            <TableHead className="text-right">باقی</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">کوئی گاہک نہیں</TableCell></TableRow> :
              filtered.map((r) => {
                const tot = Number(r.pieces ?? 0) * Number(r.price_per_piece ?? 0);
                const b = Number(r.current_balance ?? 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}{r.address && <div className="text-xs text-muted-foreground">{r.address}</div>}</TableCell>
                    <TableCell><Badge variant="outline">{r.customer_type}</Badge></TableCell>
                    <TableCell className="text-sm">{r.marble_type ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.marble_size ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.pieces ?? "—"}</TableCell>
                    <TableCell className="text-right">{PKR(r.price_per_piece)}</TableCell>
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
          <DialogHeader><DialogTitle>{edit ? "ترمیم" : "نیا"} گاہک</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>نام / Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>فون</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>ای میل</Label><Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>پتہ</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>قسم</Label>
                <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">پرچون / Retail</SelectItem>
                    <SelectItem value="wholesale">تھوک / Wholesale</SelectItem>
                    <SelectItem value="contractor">ٹھیکیدار</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="text-xs text-muted-foreground">ماربل کی فروخت کی معلومات</div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>ماربل قسم</Label><Input value={form.marble_type} onChange={(e) => setForm({ ...form, marble_type: e.target.value })} /></div>
                <div><Label>سائز</Label>
                  <Select value={form.marble_size} onValueChange={(v) => setForm({ ...form, marble_size: v })}>
                    <SelectTrigger><SelectValue placeholder="منتخب کریں" /></SelectTrigger>
                    <SelectContent>
                      {sizes.items.map((s) => <SelectItem key={s.id} value={s.label}>{s.label}</SelectItem>)}
                      <div className="flex gap-1 p-2 border-t">
                        <Input className="h-8" placeholder="نیا سائز" value={newSize} onChange={(e) => setNewSize(e.target.value)} />
                        <Button size="sm" type="button" onClick={async () => { const v = await sizes.add(newSize); if (v) { setForm({ ...form, marble_size: v }); setNewSize(""); } }}>شامل</Button>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>تعداد / Pcs</Label><Input type="number" value={form.pieces} onChange={(e) => setForm({ ...form, pieces: e.target.value })} /></div>
                <div><Label>قیمت/پیس</Label><Input type="number" value={form.price_per_piece} onChange={(e) => setForm({ ...form, price_per_piece: e.target.value })} /></div>
                <div><Label>کل (خودکار)</Label><Input value={PKR(Number(form.pieces||0)*Number(form.price_per_piece||0))} readOnly className="bg-muted/40" /></div>
              </div>
            </div>
            <div><Label>کریڈٹ حد</Label><Input type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} /></div>
            <div><Label>نوٹس</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>منسوخ</Button><Button onClick={save} className="bg-primary text-primary-foreground">محفوظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
