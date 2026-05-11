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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { afterSupplierSave } from "@/lib/chain-reactions";
import { PKR, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/suppliers")({
  component: () => (<Protected><Suppliers /></Protected>),
});

interface Row {
  id: string; name: string; phone: string | null; address: string | null;
  email: string | null; supply_type: string | null;
  rock_type: string | null; quantity_tons: number | null; price_per_ton: number | null;
  current_balance: number | null; notes: string | null;
}
interface RawPurchase { id: string; purchase_date: string | null; rock_name_urdu: string | null; quantity_tons: number | null; total_cost: number | null }
interface Payment { id: string; payment_date: string | null; amount: number | null; payment_method: string | null }

const empty = {
  name: "", phone: "", email: "", address: "", supply_type: "raw rock",
  rock_type: "", quantity_tons: "", price_per_ton: "", notes: ""
};

function Suppliers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [form, setForm] = useState(empty);

  // Ledger drawer
  const [ledger, setLedger] = useState<Row | null>(null);
  const [purchases, setPurchases] = useState<RawPurchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const openLedger = async (sup: Row) => {
    setLedger(sup);
    const [pur, pay] = await Promise.all([
      supabase.from("raw_rock_inventory").select("id, purchase_date, rock_name_urdu, quantity_tons, total_cost")
        .eq("supplier_name", sup.name).order("purchase_date", { ascending: true }),
      supabase.from("payments").select("id, payment_date, amount, payment_method")
        .eq("supplier_id", sup.id).order("payment_date", { ascending: true }),
    ]);
    setPurchases((pur.data ?? []) as RawPurchase[]);
    setPayments((pay.data ?? []) as Payment[]);
  };

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
    if (edit) {
      const { error } = await supabase.from("suppliers").update(payload).eq("id", edit.id);
      if (error) return toast.error(error.message);
    } else {
      const { data: ins, error } = await supabase.from("suppliers").insert(payload).select("id").single();
      if (error || !ins) return toast.error(error?.message ?? "Save failed");
      await afterSupplierSave({
        supplier_id: ins.id,
        name: payload.name,
        rock_type: payload.rock_type,
        quantity_tons: payload.quantity_tons,
        price_per_ton: payload.price_per_ton,
      });
    }
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

  // Ledger calculations
  const totalPurchased = purchases.reduce((s, p) => s + Number(p.total_cost ?? 0), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const balance = totalPurchased - totalPaid;

  const chartData = purchases.map((p) => ({
    date: fmtDate(p.purchase_date),
    tons: Number(p.quantity_tons ?? 0),
    cost: Number(p.total_cost ?? 0),
  }));

  return (
    <div>
      <PageHeader title="Suppliers" urdu="سپلائر" subtitle="خام پتھر اور دیگر سامان فراہم کرنے والے"
        actions={<Button onClick={() => { setEdit(null); setForm(empty); setOpen(true); }} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> نیا سپلائر</Button>}
      />

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table className="marble-table min-w-[700px]">
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
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}</TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={8}>
                  <div className="py-16 text-center">
                    <div className="text-6xl mb-4">🚛</div>
                    <p className="font-urdu text-lg text-primary" style={{ direction: "rtl" }}>ابھی کوئی ریکارڈ نہیں</p>
                    <p className="text-sm text-muted-foreground">No records yet. Add your first supplier.</p>
                  </div>
                </TableCell></TableRow>
              ) : rows.map((r) => {
                const tot = Number(r.quantity_tons ?? 0) * Number(r.price_per_ton ?? 0);
                const b = Number(r.current_balance ?? 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.name}
                      {r.address && <div className="text-xs text-muted-foreground">{r.address}</div>}
                    </TableCell>
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
                      <Button size="sm" variant="ghost" onClick={() => openLedger(r)} title="View Ledger"><Eye className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
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
                <div><Label>کل (خودکار)</Label><Input value={PKR(Number(form.quantity_tons || 0) * Number(form.price_per_ton || 0))} readOnly className="bg-muted/40" /></div>
              </div>
            </div>
            <div><Label>نوٹس / Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>منسوخ</Button>
            <Button onClick={save} className="bg-primary text-primary-foreground">محفوظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Ledger Drawer */}
      <Sheet open={!!ledger} onOpenChange={(o) => !o && setLedger(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-auto">
          <SheetHeader>
            <SheetTitle>
              <div className="font-urdu text-xl text-primary" style={{ direction: "rtl" }}>
                {ledger?.name} — کھاتہ بہی
              </div>
              <div className="text-sm text-muted-foreground">Supplier Ledger (ادھاری حساب)</div>
            </SheetTitle>
          </SheetHeader>

          {ledger && (
            <div className="mt-4 space-y-4">
              {/* Balance summary */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">کل خریداری</div>
                  <div className="font-display text-lg text-primary">{PKR(totalPurchased)}</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">کل ادائیگی</div>
                  <div className="font-display text-lg text-success">{PKR(totalPaid)}</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">باقی / Balance</div>
                  <div className={`font-display text-lg ${balance > 0 ? "text-destructive" : "text-success"}`}>{PKR(balance)}</div>
                </Card>
              </div>

              {/* Purchase history chart */}
              {chartData.length > 0 && (
                <Card className="p-4">
                  <div className="text-sm font-medium text-primary mb-2 font-urdu" style={{ direction: "rtl" }}>
                    خریداری کی تاریخ / Purchase History
                  </div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" fontSize={10} stroke="#aaa" />
                        <YAxis fontSize={10} stroke="#aaa" />
                        <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid rgba(0,118,214,0.25)" }} formatter={(v: unknown) => PKR(Number(v))} />
                        <Line type="monotone" dataKey="cost" stroke="#0076D6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* Raw purchases */}
              <Card className="p-4">
                <div className="text-sm font-medium mb-2 font-urdu" style={{ direction: "rtl" }}>خام پتھر خریداری</div>
                {purchases.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">کوئی خریداری نہیں</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader><TableRow>
                        <TableHead>تاریخ</TableHead><TableHead>پتھر</TableHead>
                        <TableHead className="text-right">ٹن</TableHead><TableHead className="text-right">رقم</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {purchases.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{fmtDate(p.purchase_date)}</TableCell>
                            <TableCell className="font-urdu">{p.rock_name_urdu}</TableCell>
                            <TableCell className="text-right">{p.quantity_tons}</TableCell>
                            <TableCell className="text-right text-primary">{PKR(p.total_cost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>

              {/* Payment history */}
              <Card className="p-4">
                <div className="text-sm font-medium mb-2 font-urdu" style={{ direction: "rtl" }}>ادائیگی کی تاریخ</div>
                {payments.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">کوئی ادائیگی نہیں</div>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
                        <span className="text-muted-foreground">{fmtDate(p.payment_date)} · {p.payment_method ?? "—"}</span>
                        <span className="text-success font-medium">{PKR(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
