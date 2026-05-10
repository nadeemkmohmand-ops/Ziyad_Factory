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
import { supabase } from "@/integrations/supabase/client";
import { PKR, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
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
const CAT_COLORS: Record<string, string> = {
  "بجلی / Electricity": "#f39c12",
  "تیل / Fuel": "#e74c3c",
  "مرمت / Maintenance": "#3498db",
  "ٹرانسپورٹ / Transport": "#2ecc71",
  "متفرق / Misc": "#a78bfa",
};

const empty = { category: CATS[0], description: "", amount: "", expense_date: todayISO(), paid_to: "", expense_product: "" };

function Expenses() {
  const [rows, setRows] = useState<E[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [filterCat, setFilterCat] = useState("all");
  const products = useLookup("expense_products");
  const [newProd, setNewProd] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
    setRows((data ?? []) as E[]);
    setLoading(false);
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

  const today = todayISO();
  const todayTotal = rows.filter((r) => r.expense_date === today).reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const filtered = filterCat === "all" ? rows : rows.filter((r) => r.category === filterCat);
  const total = filtered.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  // 30-day trend
  const now = new Date();
  const thirtyDayBuckets: Record<string, { amt: number; cat: string }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    thirtyDayBuckets[d.toISOString().slice(0, 10)] = { amt: 0, cat: "" };
  }
  rows.forEach((r) => {
    if (!r.expense_date || !(r.expense_date in thirtyDayBuckets)) return;
    thirtyDayBuckets[r.expense_date].amt += Number(r.amount ?? 0);
    thirtyDayBuckets[r.expense_date].cat = r.category ?? "";
  });
  const trend30 = Object.entries(thirtyDayBuckets).map(([date, { amt, cat }]) => ({
    date: date.slice(5), amt, cat,
  }));

  // Weekly sparkline (last 7 days for today card)
  const weekly7 = trend30.slice(-7);

  // Monthly buckets chart (6 months)
  const buckets: Record<string, number> = {};
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

      {/* Today's Expense Card + Weekly Sparkline */}
      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-urdu text-sm text-primary/80" style={{ direction: "rtl" }}>آج کے اخراجات</div>
              <div className="text-xs text-muted-foreground">Today's Expenses</div>
              <div className="font-display text-2xl mt-2 text-destructive">{PKR(todayTotal)}</div>
            </div>
            <div className="text-3xl">📊</div>
          </div>
          <div className="mt-3 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly7} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Bar dataKey="amt" fill="#e74c3c" radius={[3, 3, 0, 0]} />
                <Tooltip
                  contentStyle={{ background: "#16213e", border: "1px solid #c9a84c40", fontSize: 11 }}
                  formatter={(v: unknown) => PKR(Number(v))}
                  labelFormatter={(l) => l}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">آخری 7 دن / Last 7 days sparkline</div>
        </Card>

        <Card className="p-5">
          <div className="font-display text-lg text-primary mb-3">ماہانہ رجحان / Monthly Trend</div>
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" stroke="#aaa" fontSize={10} />
                <Tooltip contentStyle={{ background: "#16213e", border: "1px solid #c9a84c40" }} formatter={(v: unknown) => PKR(Number(v))} />
                <Bar dataKey="amt" fill="#e74c3c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 30-day trend */}
      <Card className="p-5 mb-4">
        <div className="font-display text-base text-primary mb-2">30 دن کا رجحان / 30-Day Expense Trend</div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend30}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" stroke="#aaa" fontSize={10} interval={4} />
              <YAxis stroke="#aaa" fontSize={10} />
              <Tooltip
                contentStyle={{ background: "#16213e", border: "1px solid #c9a84c40" }}
                formatter={(v: unknown) => PKR(Number(v))}
              />
              <Bar dataKey="amt" radius={[3, 3, 0, 0]}>
                {trend30.map((entry, i) => (
                  <Cell key={i} fill={CAT_COLORS[entry.cat] ?? "#c9a84c"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(CAT_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              {cat.split(" / ")[1] ?? cat}
            </div>
          ))}
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
        <Card className="px-4 py-2 sm:ml-auto">
          <span className="text-xs text-muted-foreground">کل: </span>
          <span className="font-display text-lg text-primary">{PKR(total)}</span>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table className="marble-table min-w-[700px]">
            <TableHeader><TableRow>
              <TableHead>تاریخ</TableHead><TableHead>قسم</TableHead><TableHead>پروڈکٹ</TableHead>
              <TableHead>تفصیل</TableHead><TableHead>ادائیگی</TableHead>
              <TableHead className="text-right">رقم</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}</TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7}>
                  <div className="py-16 text-center">
                    <div className="text-6xl mb-4">💰</div>
                    <p className="font-urdu text-lg text-primary" style={{ direction: "rtl" }}>ابھی کوئی ریکارڈ نہیں</p>
                    <p className="text-sm text-muted-foreground">No expense records yet.</p>
                  </div>
                </TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.expense_date)}</TableCell>
                  <TableCell className="text-sm">{r.category}</TableCell>
                  <TableCell className="text-sm">{r.expense_product ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.description ?? "—"}</TableCell>
                  <TableCell>{r.paid_to ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">{PKR(r.amount)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>نیا خرچ / New Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>قسم / Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>پروڈکٹ / Product</Label>
              <Select value={form.expense_product} onValueChange={(v) => setForm({ ...form, expense_product: v })}>
                <SelectTrigger><SelectValue placeholder="منتخب کریں جیسے چائے، کھانا" /></SelectTrigger>
                <SelectContent>
                  {products.items.map((p) => <SelectItem key={p.id} value={p.label}>{p.label}</SelectItem>)}
                  <div className="flex gap-1 p-2 border-t">
                    <Input className="h-8" placeholder="نیا آئٹم" value={newProd} onChange={(e) => setNewProd(e.target.value)} />
                    <Button size="sm" type="button" onClick={async () => {
                      const v = await products.add(newProd);
                      if (v) { setForm({ ...form, expense_product: v }); setNewProd(""); }
                    }}>شامل</Button>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>منسوخ</Button>
            <Button onClick={save} className="bg-primary text-primary-foreground">محفوظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
