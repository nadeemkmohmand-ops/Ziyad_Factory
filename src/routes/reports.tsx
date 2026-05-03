import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PKR, num, fmtDate } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const Route = createFileRoute("/reports")({
  component: () => (
    <Protected>
      <Reports />
    </Protected>
  ),
});

const startOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

interface Order { id: string; order_date: string | null; total_amount: number | null; paid_amount: number | null; remaining_amount: number | null; payment_type: string | null; customer_id: string | null }
interface Item { order_id: string | null; category_id: string | null; quantity: number | null; total_price: number | null }
interface Cust { id: string; name: string }
interface Cat { id: string; name_urdu: string; name_english: string | null }

function Reports() {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(today());

  return (
    <div>
      <PageHeader title="Reports" urdu="رپورٹس" subtitle="Date-filtered reports with print & PDF export."
        actions={<>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="outline" onClick={() => exportPdf("report-area")}><Download className="h-4 w-4" /> PDF</Button>
        </>}
      />
      <Card className="p-4 mb-4 flex flex-wrap items-end gap-3">
        <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </Card>

      <div id="report-area" className="space-y-4">
        <Tabs defaultValue="sales">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="finance">Financial</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="labour">Labour</TabsTrigger>
            <TabsTrigger value="lending">Lending</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
          </TabsList>

          <TabsContent value="sales"><SalesReport from={from} to={to} /></TabsContent>
          <TabsContent value="finance"><FinanceReport from={from} to={to} /></TabsContent>
          <TabsContent value="inventory"><InventoryReport /></TabsContent>
          <TabsContent value="labour"><LabourReport /></TabsContent>
          <TabsContent value="lending"><LendingReport /></TabsContent>
          <TabsContent value="production"><ProductionReport from={from} to={to} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

async function exportPdf(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const canvas = await html2canvas(el, { backgroundColor: "#0f0f1a", scale: 2 });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "p", unit: "px", format: [canvas.width, canvas.height] });
  pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`report-${Date.now()}.pdf`);
}

function StatCard({ label, value, urdu }: { label: string; value: string; urdu?: string }) {
  return (
    <Card className="p-4">
      {urdu && <div className="font-urdu text-sm text-primary">{urdu}</div>}
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-display text-2xl text-foreground mt-1">{value}</div>
    </Card>
  );
}

function SalesReport({ from, to }: { from: string; to: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [custs, setCusts] = useState<Cust[]>([]);

  useEffect(() => {
    void (async () => {
      const [o, c, cu] = await Promise.all([
        supabase.from("sales_orders").select("*").gte("order_date", from).lte("order_date", to),
        supabase.from("marble_categories").select("id, name_urdu, name_english"),
        supabase.from("customers").select("id, name"),
      ]);
      const ords = (o.data ?? []) as Order[];
      setOrders(ords);
      setCats((c.data ?? []) as Cat[]);
      setCusts((cu.data ?? []) as Cust[]);
      if (ords.length) {
        const { data: it } = await supabase.from("sales_order_items").select("*").in("order_id", ords.map((x) => x.id));
        setItems((it ?? []) as Item[]);
      } else setItems([]);
    })();
  }, [from, to]);

  const totals = useMemo(() => {
    const total = orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    const cash = orders.filter((o) => o.payment_type === "cash").reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    const credit = orders.filter((o) => o.payment_type === "credit").reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    const lend = orders.filter((o) => o.payment_type === "lend").reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    const receivable = orders.reduce((s, o) => s + Number(o.remaining_amount ?? 0), 0);
    return { total, cash, credit, lend, receivable };
  }, [orders]);

  const byCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      const k = it.category_id ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(it.total_price ?? 0));
    }
    return Array.from(map.entries()).map(([id, v]) => {
      const c = cats.find((x) => x.id === id);
      return { name: c?.name_english ?? c?.name_urdu ?? "—", value: v };
    }).sort((a, b) => b.value - a.value);
  }, [items, cats]);

  const byCust = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const k = o.customer_id ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(o.total_amount ?? 0));
    }
    return Array.from(map.entries()).map(([id, v]) => ({ name: custs.find((c) => c.id === id)?.name ?? "—", value: v }))
      .sort((a, b) => b.value - a.value).slice(0, 10);
  }, [orders, custs]);

  const aging = useMemo(() => {
    const now = Date.now();
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    for (const o of orders) {
      const r = Number(o.remaining_amount ?? 0);
      if (r <= 0 || !o.order_date) continue;
      const days = Math.floor((now - new Date(o.order_date).getTime()) / 86400000);
      if (days <= 30) buckets["0-30"] += r;
      else if (days <= 60) buckets["31-60"] += r;
      else if (days <= 90) buckets["61-90"] += r;
      else buckets["90+"] += r;
    }
    return buckets;
  }, [orders]);

  return (
    <div className="space-y-4 mt-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard urdu="کل سیلز" label="Total Sales" value={PKR(totals.total)} />
        <StatCard label="Cash" value={PKR(totals.cash)} />
        <StatCard label="Credit" value={PKR(totals.credit)} />
        <StatCard label="Lend" value={PKR(totals.lend)} />
      </div>

      <Card className="p-4">
        <div className="font-display text-lg mb-3">Sales by Category</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byCat}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="value" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="font-display text-lg mb-3">Top Customers</div>
          <Table><TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Sales</TableHead></TableRow></TableHeader>
            <TableBody>{byCust.map((c) => <TableRow key={c.name}><TableCell>{c.name}</TableCell><TableCell className="text-right">{PKR(c.value)}</TableCell></TableRow>)}</TableBody>
          </Table>
        </Card>
        <Card className="p-4">
          <div className="font-display text-lg mb-3">Receivables Aging</div>
          <Table><TableBody>
            {Object.entries(aging).map(([k, v]) => <TableRow key={k}><TableCell>{k} days</TableCell><TableCell className="text-right">{PKR(v)}</TableCell></TableRow>)}
            <TableRow><TableCell className="font-semibold">Total Receivable</TableCell><TableCell className="text-right font-semibold text-primary">{PKR(totals.receivable)}</TableCell></TableRow>
          </TableBody></Table>
        </Card>
      </div>
    </div>
  );
}

function FinanceReport({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState({ income: 0, expenses: 0, labour: 0, raw: 0, monthly: [] as { month: string; income: number; expenses: number }[] });

  useEffect(() => {
    void (async () => {
      const [pay, exp, sal, raw] = await Promise.all([
        supabase.from("payments").select("amount, payment_date, payment_type").gte("payment_date", from).lte("payment_date", to),
        supabase.from("expenses").select("amount, expense_date").gte("expense_date", from).lte("expense_date", to),
        supabase.from("salary_payments").select("net_salary, paid_date").eq("is_paid", true).gte("paid_date", from).lte("paid_date", to),
        supabase.from("raw_rock_inventory").select("total_cost, purchase_date").gte("purchase_date", from).lte("purchase_date", to),
      ]);
      const income = (pay.data ?? []).filter((p) => p.payment_type !== "outgoing").reduce((s, p) => s + Number(p.amount ?? 0), 0);
      const expenses = (exp.data ?? []).reduce((s, e) => s + Number(e.amount ?? 0), 0);
      const labour = (sal.data ?? []).reduce((s, x) => s + Number(x.net_salary ?? 0), 0);
      const rawc = (raw.data ?? []).reduce((s, r) => s + Number(r.total_cost ?? 0), 0);

      const months = new Map<string, { income: number; expenses: number }>();
      for (const p of pay.data ?? []) {
        const m = (p.payment_date ?? "").slice(0, 7); if (!m) continue;
        const e = months.get(m) ?? { income: 0, expenses: 0 }; e.income += Number(p.amount ?? 0); months.set(m, e);
      }
      for (const e of exp.data ?? []) {
        const m = (e.expense_date ?? "").slice(0, 7); if (!m) continue;
        const x = months.get(m) ?? { income: 0, expenses: 0 }; x.expenses += Number(e.amount ?? 0); months.set(m, x);
      }
      const monthly = Array.from(months.entries()).sort().map(([month, v]) => ({ month, ...v }));
      setData({ income, expenses, labour, raw: rawc, monthly });
    })();
  }, [from, to]);

  const profit = data.income - data.expenses - data.labour - data.raw;

  return (
    <div className="space-y-4 mt-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard urdu="آمدنی" label="Income" value={PKR(data.income)} />
        <StatCard urdu="اخراجات" label="Expenses" value={PKR(data.expenses)} />
        <StatCard label="Labour" value={PKR(data.labour)} />
        <StatCard label="Raw Material" value={PKR(data.raw)} />
        <StatCard urdu="خالص نفع" label="Net Profit" value={PKR(profit)} />
      </div>
      <Card className="p-4">
        <div className="font-display text-lg mb-3">Monthly Income vs Expenses</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend />
            <Bar dataKey="income" fill="hsl(var(--primary))" />
            <Bar dataKey="expenses" fill="hsl(var(--destructive))" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function InventoryReport() {
  const [rows, setRows] = useState<{ name: string; qty: number; unit: string; cost: number; sell: number }[]>([]);
  const [raw, setRaw] = useState(0);
  useEffect(() => {
    void (async () => {
      const [{ data: inv }, { data: cats }, { data: r }] = await Promise.all([
        supabase.from("finished_marble_inventory").select("*"),
        supabase.from("marble_categories").select("id, name_urdu, name_english"),
        supabase.from("raw_rock_inventory").select("quantity_tons"),
      ]);
      const out = (inv ?? []).map((x: { category_id: string | null; quantity: number | null; unit: string | null; cost_per_unit: number | null; selling_price_per_unit: number | null }) => {
        const c = (cats ?? []).find((cc) => cc.id === x.category_id);
        const q = Number(x.quantity ?? 0);
        return { name: c?.name_english ?? c?.name_urdu ?? "—", qty: q, unit: x.unit ?? "", cost: q * Number(x.cost_per_unit ?? 0), sell: q * Number(x.selling_price_per_unit ?? 0) };
      });
      setRows(out);
      setRaw((r ?? []).reduce((s: number, x: { quantity_tons: number | null }) => s + Number(x.quantity_tons ?? 0), 0));
    })();
  }, []);
  const totals = rows.reduce((s, r) => ({ cost: s.cost + r.cost, sell: s.sell + r.sell }), { cost: 0, sell: 0 });

  return (
    <div className="space-y-4 mt-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Raw Rock Stock" value={`${num(raw)} tons`} />
        <StatCard label="Stock at Cost" value={PKR(totals.cost)} />
        <StatCard label="Potential Profit" value={PKR(totals.sell - totals.cost)} />
      </div>
      <Card className="p-0 overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Selling</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((r, i) => <TableRow key={i}><TableCell>{r.name}</TableCell><TableCell className="text-right">{num(r.qty)} {r.unit}</TableCell><TableCell className="text-right">{PKR(r.cost)}</TableCell><TableCell className="text-right">{PKR(r.sell)}</TableCell></TableRow>)}</TableBody>
        </Table>
      </Card>
    </div>
  );
}

function LabourReport() {
  const [rows, setRows] = useState<{ name: string; present: number; absent: number; half: number; paid: number }[]>([]);
  useEffect(() => {
    void (async () => {
      const [{ data: lab }, { data: att }, { data: sal }] = await Promise.all([
        supabase.from("labour").select("id, name"),
        supabase.from("attendance").select("labour_id, status"),
        supabase.from("salary_payments").select("labour_id, net_salary, is_paid"),
      ]);
      const out = (lab ?? []).map((l: { id: string; name: string }) => {
        const a = (att ?? []).filter((x: { labour_id: string | null; status: string | null }) => x.labour_id === l.id);
        return {
          name: l.name,
          present: a.filter((x: { status: string | null }) => x.status === "present").length,
          absent: a.filter((x: { status: string | null }) => x.status === "absent").length,
          half: a.filter((x: { status: string | null }) => x.status === "half_day").length,
          paid: (sal ?? []).filter((s: { labour_id: string | null; is_paid: boolean | null }) => s.labour_id === l.id && s.is_paid).reduce((sum: number, s: { net_salary: number | null }) => sum + Number(s.net_salary ?? 0), 0),
        };
      });
      setRows(out);
    })();
  }, []);
  return (
    <Card className="p-0 mt-4 overflow-hidden">
      <Table><TableHeader><TableRow><TableHead>Labour</TableHead><TableHead>Present</TableHead><TableHead>Absent</TableHead><TableHead>Half</TableHead><TableHead className="text-right">Total Paid</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map((r) => <TableRow key={r.name}><TableCell>{r.name}</TableCell><TableCell>{r.present}</TableCell><TableCell>{r.absent}</TableCell><TableCell>{r.half}</TableCell><TableCell className="text-right">{PKR(r.paid)}</TableCell></TableRow>)}</TableBody>
      </Table>
    </Card>
  );
}

function LendingReport() {
  const [rows, setRows] = useState<{ id: string; party_name: string; transaction_type: string | null; amount: number | null; amount_returned: number | null; is_settled: boolean | null; transaction_date: string | null }[]>([]);
  useEffect(() => { void supabase.from("lending_borrowing").select("*").order("transaction_date", { ascending: false }).then((r) => setRows((r.data ?? []) as typeof rows)); }, []);
  const lent = rows.filter((r) => r.transaction_type === "lend" && !r.is_settled).reduce((s, r) => s + (Number(r.amount ?? 0) - Number(r.amount_returned ?? 0)), 0);
  const borr = rows.filter((r) => r.transaction_type === "borrow" && !r.is_settled).reduce((s, r) => s + (Number(r.amount ?? 0) - Number(r.amount_returned ?? 0)), 0);
  return (
    <div className="space-y-4 mt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard urdu="ہمیں واپس آنا" label="Owed to Us (Active)" value={PKR(lent)} />
        <StatCard urdu="ہماری ادائیگی" label="We Owe (Active)" value={PKR(borr)} />
      </div>
      <Card className="p-0 overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Party</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Returned</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((r) => <TableRow key={r.id}><TableCell>{r.party_name}</TableCell><TableCell>{r.transaction_type}</TableCell><TableCell>{fmtDate(r.transaction_date)}</TableCell><TableCell className="text-right">{PKR(r.amount ?? 0)}</TableCell><TableCell className="text-right">{PKR(r.amount_returned ?? 0)}</TableCell><TableCell>{r.is_settled ? "Settled" : "Active"}</TableCell></TableRow>)}</TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ProductionReport({ from, to }: { from: string; to: string }) {
  const [rows, setRows] = useState<{ date: string | null; raw_rock_used_tons: number | null; sqft_produced: number | null; slabs_produced: number | null; wastage_percent: number | null }[]>([]);
  useEffect(() => { void supabase.from("production_logs").select("*").gte("date", from).lte("date", to).then((r) => setRows((r.data ?? []) as typeof rows)); }, [from, to]);
  const totRaw = rows.reduce((s, r) => s + Number(r.raw_rock_used_tons ?? 0), 0);
  const totSqft = rows.reduce((s, r) => s + Number(r.sqft_produced ?? 0), 0);
  const totSlabs = rows.reduce((s, r) => s + Number(r.slabs_produced ?? 0), 0);
  const wast = rows.length ? rows.reduce((s, r) => s + Number(r.wastage_percent ?? 0), 0) / rows.length : 0;
  return (
    <div className="space-y-4 mt-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Raw Used" value={`${num(totRaw)} t`} />
        <StatCard label="Sqft Produced" value={num(totSqft)} />
        <StatCard label="Slabs" value={num(totSlabs, 0)} />
        <StatCard label="Avg Wastage" value={`${num(wast)}%`} />
      </div>
    </div>
  );
}
