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
import { PKR, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLookup } from "@/lib/lookups";

export const Route = createFileRoute("/expenses")({
  component: () => (<Protected><Expenses /></Protected>),
});

interface E {
  id: string; category: string | null; description: string | null;
  amount: number | null; expense_date: string | null; paid_to: string | null;
  expense_product: string | null; receipt_url: string | null;
}

const CATS = ["بجلی / Electricity", "تیل / Fuel", "مرمت / Maintenance", "ٹرانسپورٹ / Transport", "متفرق / Misc"];

const empty = { category: CATS[0], description: "", amount: "", expense_date: todayISO(), paid_to: "", expense_product: "" };

function Expenses() {
  const [rows, setRows] = useState<E[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [filterCat, setFilterCat] = useState("all");
  const products = useLookup("expense_products");
  const [newProd, setNewProd] = useState("");

  const load = async () => {
    const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
    setRows((data ?? []) as E[]);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.amount) return toast.error("رقم درکار");
    const { error } = await supabase.from("expenses").insert({
      category: form.category, description: form.description || null,
      amount: Number(form.amount), expense_date: form.expense_date,
      paid_to: form.paid_to || null, expense_product: form.expense_product || null,
    });
    if (error) return toast.error(error.message);
    toast.success("شامل ہو گیا"); setOpen(false); setForm(empty); void load();
  };

  const del = async (id: string) => {
    if (!confirm("ڈیلیٹ؟")) return;
    await supabase.from("expenses").delete().eq("id", id); void load();
  };

  const filtered = filterCat === "all" ? rows : rows.filter((r) => r.category === filterCat);
  const total = filtered.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const buckets: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets[d.toLocaleDateString("en-US", { month: "short" })] = 0;
  }
  rows.forEach((r) => {
    if (!r.expense_date) return;
    const k = new Date(r.expense_date).toLocaleDateString("en-US", { month: "short" });
    if (k in buckets) buckets[k] += Number(r.amount ?? 0);
  });
  const chartData = Object.entries(buckets).map(([month, amt]) => ({ month, amt }));

  return (
    <div>
      <PageHeader title="Expenses" urdu="اخراجات"
        actions={<Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> اخراجات شامل کریں</Button>}
      />

      <Card className="p-5 mb-4">
        <h2 className="font-display text-lg text-primary mb-3">ماہانہ رجحان / Monthly Trend</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis dataKey="month" stroke="#aaa" fontSize={12} /><YAxis stroke="#aaa" fontSize={12} />
              <Tooltip contentStyle={{ background: "#16213e", border: "1px solid #c9a84c40" }} formatter={(v: unknown) => PKR(Number(v))} />
              <Bar dataKey="amt" fill="#e74c3c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">تمام / All</SelectItem>
            {CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Card className="px-4 py-2 sm:ml-auto"><span className="text-xs text-muted-foreground">کل: </span><span className="font-display text-lg text-primary">{PKR(total)}</span></Card>
      </div>

      <Card className="p-0 overflow-x-auto">
        <Table className="marble-table min-w-[700px]">
          <TableHeader><TableRow>
            <TableHead>تاریخ</TableHead><TableHead>قسم</TableHead><TableHead>پروڈکٹ</TableHead>
            <TableHead>تفصیل</TableHead><TableHead>ادائیگی</TableHead>
            <TableHead className="text-right">رقم</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">کوئی اخراجات نہیں</TableCell></TableRow> :
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.expense_date)}</TableCell>
                  <TableCell className="text-sm">{r.category}</TableCell>
                  <TableCell className="text-sm">{r.expense_product ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.description ?? "—"}</TableCell>
                  <TableCell>{r.paid_to ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">{PKR(r.amount)}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>نیا خرچ / New Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>قسم / Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>پروڈکٹ / Product</Label>
              <Select value={form.expense_product} onValueChange={(v) => setForm({ ...form, expense_product: v })}>
                <SelectTrigger><SelectValue placeholder="منتخب کریں جیسے چائے، کھانا" /></SelectTrigger>
                <SelectContent>
                  {products.items.map((p) => <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>)}
                  <div className="flex gap-1 p-2 border-t">
                    <Input className="h-8" placeholder="نیا آئٹم" value={newProd} onChange={(e) => setNewProd(e.target.value)} />
                    <Button size="sm" type="button" onClick={async () => { const v = await products.add(newProd); if (v) { setForm({ ...form, expense_product: v }); setNewProd(""); } }}>شامل</Button>
                  </div>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>رقم</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>تاریخ</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
            </div>
            <div><Label>کسے ادا کیا</Label><Input value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} /></div>
            <div><Label>تفصیل</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>منسوخ</Button><Button onClick={save} className="bg-primary text-primary-foreground">محفوظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
