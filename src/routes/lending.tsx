import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PKR, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { useLookup } from "@/lib/lookups";

export const Route = createFileRoute("/lending")({
  component: () => (<Protected><Lending /></Protected>),
});

type Row = {
  id: string;
  party_name: string;
  party_type: string | null;
  transaction_type: string | null;
  amount: number | null;
  amount_returned: number | null;
  transaction_date: string | null;
  due_date: string | null;
  is_settled: boolean | null;
  notes: string | null;
  supplier_id: string | null;
  customer_id: string | null;
  item_kind: string | null;
  rock_type: string | null;
  marble_type: string | null;
  marble_size: string | null;
  quantity: number | null;
  unit: string | null;
  price_per_unit: number | null;
  contact_phone: string | null;
  contact_address: string | null;
  contact_email: string | null;
};

const empty = {
  transaction_type: "borrow", // borrow=raw rock from supplier, lend=marble to customer
  party_name: "",
  party_type: "supplier",
  rock_type: "",
  marble_type: "",
  marble_size: "",
  quantity: "",
  price_per_unit: "",
  transaction_date: todayISO(),
  due_date: "",
  contact_phone: "",
  contact_address: "",
  contact_email: "",
  notes: "",
};

function Lending() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"borrow" | "lend">("borrow");
  const [form, setForm] = useState(empty);
  const [repayFor, setRepayFor] = useState<Row | null>(null);
  const [repayAmt, setRepayAmt] = useState("");
  const sizes = useLookup("marble_sizes");
  const [newSize, setNewSize] = useState("");

  const isBorrow = form.transaction_type === "borrow";

  const total = useMemo(() => {
    const q = Number(form.quantity || 0); const p = Number(form.price_per_unit || 0);
    return q * p;
  }, [form.quantity, form.price_per_unit]);

  const load = async () => {
    const { data } = await supabase.from("lending_borrowing").select("*").order("transaction_date", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
  };
  useEffect(() => { void load(); }, []);

  const openNew = (kind: "borrow" | "lend") => {
    setForm({ ...empty, transaction_type: kind, party_type: kind === "borrow" ? "supplier" : "customer" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.party_name.trim()) return toast.error("نام درکار / Name required");
    const qty = Number(form.quantity || 0);
    const price = Number(form.price_per_unit || 0);
    const amount = qty * price;
    const payload = {
      party_name: form.party_name,
      party_type: form.party_type,
      transaction_type: form.transaction_type,
      item_kind: isBorrow ? "raw_rock" : "marble",
      rock_type: isBorrow ? form.rock_type || null : null,
      marble_type: !isBorrow ? form.marble_type || null : null,
      marble_size: !isBorrow ? form.marble_size || null : null,
      quantity: qty || null,
      unit: isBorrow ? "tons" : "pieces",
      price_per_unit: price || null,
      amount,
      transaction_date: form.transaction_date,
      due_date: form.due_date || null,
      contact_phone: form.contact_phone || null,
      contact_address: form.contact_address || null,
      contact_email: form.contact_email || null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("lending_borrowing").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("محفوظ ہو گیا / Saved");
    setOpen(false); setForm(empty); void load();
  };

  const repay = async () => {
    if (!repayFor) return;
    const newReturned = Number(repayFor.amount_returned ?? 0) + Number(repayAmt || 0);
    const settled = newReturned >= Number(repayFor.amount ?? 0);
    await supabase.from("lending_borrowing").update({ amount_returned: newReturned, is_settled: settled }).eq("id", repayFor.id);
    setRepayFor(null); setRepayAmt(""); toast.success("ادائیگی درج ہوئی"); void load();
  };

  const del = async (id: string) => {
    if (!confirm("ڈیلیٹ کریں؟ Delete?")) return;
    await supabase.from("lending_borrowing").delete().eq("id", id);
    void load();
  };

  const filteredRows = rows.filter((r) => r.transaction_type === tab);
  const totalDueOut = rows.filter(r=>r.transaction_type==="lend").reduce((s,r)=>s + Math.max(0, Number(r.amount??0)-Number(r.amount_returned??0)), 0);
  const totalOwed = rows.filter(r=>r.transaction_type==="borrow").reduce((s,r)=>s + Math.max(0, Number(r.amount??0)-Number(r.amount_returned??0)), 0);

  const renderTable = (kind: "borrow" | "lend") => (
    <Card className="p-0 overflow-x-auto">
      <Table className="marble-table min-w-[900px]">
        <TableHeader><TableRow>
          <TableHead>تاریخ / Date</TableHead>
          <TableHead>نام / Name</TableHead>
          <TableHead>{kind === "borrow" ? "پتھر کی قسم / Rock" : "ماربل / Marble"}</TableHead>
          {kind === "lend" && <TableHead>سائز / Size</TableHead>}
          <TableHead className="text-right">{kind === "borrow" ? "ٹن / Tons" : "تعداد / Pcs"}</TableHead>
          <TableHead className="text-right">قیمت/یونٹ / Price</TableHead>
          <TableHead className="text-right">کل / Total</TableHead>
          <TableHead className="text-right">واپسی / Returned</TableHead>
          <TableHead className="text-right">باقی / Balance</TableHead>
          <TableHead>رابطہ / Contact</TableHead>
          <TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {filteredRows.length === 0 ? (
            <TableRow><TableCell colSpan={kind === "lend" ? 11 : 10} className="text-center py-8 text-muted-foreground">کوئی اندراج نہیں / No entries.</TableCell></TableRow>
          ) : filteredRows.map((r) => {
            const balance = Math.max(0, Number(r.amount ?? 0) - Number(r.amount_returned ?? 0));
            const overdue = r.due_date && !r.is_settled && new Date(r.due_date) < new Date();
            return (
              <TableRow key={r.id} className={overdue ? "bg-destructive/10" : ""}>
                <TableCell className="text-xs">{fmtDate(r.transaction_date)}</TableCell>
                <TableCell><div className="font-medium">{r.party_name}</div><div className="text-xs text-muted-foreground">{r.party_type}</div></TableCell>
                <TableCell>{kind === "borrow" ? (r.rock_type ?? "—") : (r.marble_type ?? "—")}</TableCell>
                {kind === "lend" && <TableCell>{r.marble_size ?? "—"}</TableCell>}
                <TableCell className="text-right">{r.quantity ?? "—"}</TableCell>
                <TableCell className="text-right">{PKR(r.price_per_unit)}</TableCell>
                <TableCell className="text-right font-medium">{PKR(r.amount)}</TableCell>
                <TableCell className="text-right text-success">{PKR(r.amount_returned)}</TableCell>
                <TableCell className={`text-right font-medium ${balance > 0 ? "text-destructive" : "text-success"}`}>{PKR(balance)}</TableCell>
                <TableCell className="text-xs">
                  {r.contact_phone && <div dir="ltr">{r.contact_phone}</div>}
                  {r.contact_email && <div dir="ltr" className="text-muted-foreground">{r.contact_email}</div>}
                  {r.contact_address && <div className="text-muted-foreground">{r.contact_address}</div>}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {r.is_settled ? <Badge className="bg-success/20 text-success"><CheckCircle2 className="h-3 w-3" /></Badge> :
                    overdue ? <Badge className="bg-destructive/20 text-destructive"><AlertTriangle className="h-3 w-3" /></Badge> : null}
                  {!r.is_settled && <Button size="sm" variant="outline" onClick={() => setRepayFor(r)}>ادائیگی</Button>}
                  <Button size="sm" variant="ghost" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div>
      <PageHeader title="Lending & Borrowing" urdu="قرض و ادھار"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => openNew("borrow")} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> سپلائر سے / Borrow</Button>
            <Button onClick={() => openNew("lend")} variant="outline"><Plus className="h-4 w-4" /> گاہک کو / Lend</Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <Card className="p-4"><div className="text-xs uppercase tracking-widest text-muted-foreground">گاہکوں سے باقی / We are owed</div><div className="font-display text-2xl text-success mt-1">{PKR(totalDueOut)}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-widest text-muted-foreground">سپلائرز کا قرض / We owe</div><div className="font-display text-2xl text-destructive mt-1">{PKR(totalOwed)}</div></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "borrow" | "lend")}>
        <TabsList>
          <TabsTrigger value="borrow">سپلائر / Borrow (Raw Rock)</TabsTrigger>
          <TabsTrigger value="lend">گاہک / Lend (Marble)</TabsTrigger>
        </TabsList>
        <TabsContent value="borrow">{renderTable("borrow")}</TabsContent>
        <TabsContent value="lend">{renderTable("lend")}</TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isBorrow ? "سپلائر سے قرض / Borrow from Supplier" : "گاہک کو ادھار / Lend to Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{isBorrow ? "سپلائر کا نام *" : "گاہک کا نام *"}</Label>
              <Input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} /></div>

            {isBorrow ? (
              <div><Label>پتھر کی قسم / Rock type</Label>
                <Input value={form.rock_type} onChange={(e) => setForm({ ...form, rock_type: e.target.value })} placeholder="مثلاً سفید سنگ مرمر" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>ماربل قسم / Marble type</Label>
                  <Input value={form.marble_type} onChange={(e) => setForm({ ...form, marble_type: e.target.value })} /></div>
                <div><Label>سائز / Size</Label>
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
            )}

            <div className="grid grid-cols-3 gap-2">
              <div><Label>{isBorrow ? "ٹن / Tons" : "تعداد / Pieces"}</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>قیمت/یونٹ</Label>
                <Input type="number" value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })} /></div>
              <div><Label>کل (خودکار)</Label>
                <Input value={PKR(total)} readOnly className="bg-muted/40" /></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><Label>تاریخ / Date</Label><Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></div>
              <div><Label>آخری تاریخ / Due</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>

            <div className="border-t pt-3">
              <div className="text-xs text-muted-foreground mb-2">رابطہ / Contact info</div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>فون / Phone</Label><Input dir="ltr" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
                <div><Label>ای میل / Email</Label><Input dir="ltr" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              </div>
              <div className="mt-2"><Label>پتہ / Address</Label><Input value={form.contact_address} onChange={(e) => setForm({ ...form, contact_address: e.target.value })} /></div>
            </div>

            <div><Label>نوٹس / Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>منسوخ</Button><Button onClick={save} className="bg-primary text-primary-foreground">محفوظ کریں</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!repayFor} onOpenChange={(o) => !o && setRepayFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ادائیگی درج کریں / Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">پارٹی: <strong>{repayFor?.party_name}</strong></div>
            <div><Label>رقم / Amount</Label><Input type="number" value={repayAmt} onChange={(e) => setRepayAmt(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRepayFor(null)}>منسوخ</Button><Button onClick={repay} className="bg-primary text-primary-foreground">درج کریں</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
