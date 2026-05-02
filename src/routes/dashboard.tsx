import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PKR, num, fmtDate } from "@/lib/format";
import {
  TrendingUp,
  Wallet,
  CreditCard,
  Banknote,
  HardHat,
  Package,
  Layers,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <Protected>
      <Dashboard />
    </Protected>
  ),
});

interface Kpis {
  monthSales: number;
  monthReceived: number;
  pendingReceivable: number;
  activeLending: number;
  activeBorrowing: number;
  labourPayable: number;
  rawRockTons: number;
  marbleValue: number;
}

interface MonthBar {
  month: string;
  sales: number;
}
interface PieDatum {
  name: string;
  value: number;
}
interface RecentOrder {
  id: string;
  order_number: string | null;
  total_amount: number | null;
  remaining_amount: number | null;
  status: string | null;
  order_date: string | null;
  payment_type: string | null;
}

function Dashboard() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [monthly, setMonthly] = useState<MonthBar[]>([]);
  const [pie, setPie] = useState<PieDatum[]>([]);
  const [catLine, setCatLine] = useState<Array<Record<string, number | string>>>([]);
  const [recent, setRecent] = useState<RecentOrder[]>([]);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
    const end = new Date(y, m, 1).toISOString().slice(0, 10);

    const [
      salesMonth,
      payMonth,
      pendingRec,
      lend,
      borrow,
      payable,
      raw,
      finished,
      sixMonth,
      payTypes,
      catData,
      recentRows,
    ] = await Promise.all([
      supabase.from("sales_orders").select("total_amount, order_date").gte("order_date", start).lt("order_date", end),
      supabase.from("payments").select("amount").eq("payment_type", "received").gte("payment_date", start).lt("payment_date", end),
      supabase.from("sales_orders").select("remaining_amount, status").neq("status", "cancelled"),
      supabase.from("lending_borrowing").select("amount, amount_returned, transaction_type, is_settled").eq("transaction_type", "lend").eq("is_settled", false),
      supabase.from("lending_borrowing").select("amount, amount_returned, transaction_type, is_settled").eq("transaction_type", "borrow").eq("is_settled", false),
      supabase.from("salary_payments").select("net_salary, is_paid, month, year").eq("is_paid", false).eq("month", m).eq("year", y),
      supabase.from("raw_rock_inventory").select("quantity_tons"),
      supabase.from("finished_marble_inventory").select("quantity, cost_per_unit, category_id"),
      supabase.from("sales_orders").select("total_amount, order_date").gte("order_date", new Date(y, m - 6, 1).toISOString().slice(0, 10)),
      supabase.from("sales_orders").select("payment_type, total_amount"),
      supabase
        .from("sales_order_items")
        .select("total_price, category_id, marble_categories(name_english, name_urdu), sales_orders(order_date)")
        .gte("sales_orders.order_date", new Date(y, m - 6, 1).toISOString().slice(0, 10)),
      supabase.from("sales_orders").select("id, order_number, total_amount, remaining_amount, status, order_date, payment_type").order("created_at", { ascending: false }).limit(10),
    ]);

    const sumNum = (rows: { [k: string]: unknown }[] | null, key: string) =>
      (rows ?? []).reduce((s, r) => s + Number(r[key] ?? 0), 0);

    const lendOutstanding = (lend.data ?? []).reduce(
      (s, r) => s + (Number(r.amount ?? 0) - Number(r.amount_returned ?? 0)),
      0,
    );
    const borrowOutstanding = (borrow.data ?? []).reduce(
      (s, r) => s + (Number(r.amount ?? 0) - Number(r.amount_returned ?? 0)),
      0,
    );

    setKpis({
      monthSales: sumNum(salesMonth.data as never, "total_amount"),
      monthReceived: sumNum(payMonth.data as never, "amount"),
      pendingReceivable: sumNum(pendingRec.data as never, "remaining_amount"),
      activeLending: lendOutstanding,
      activeBorrowing: borrowOutstanding,
      labourPayable: sumNum(payable.data as never, "net_salary"),
      rawRockTons: sumNum(raw.data as never, "quantity_tons"),
      marbleValue: (finished.data ?? []).reduce(
        (s, r) => s + Number(r.quantity ?? 0) * Number(r.cost_per_unit ?? 0),
        0,
      ),
    });

    // 6 month bars
    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const k = d.toLocaleDateString("en-US", { month: "short" });
      buckets[k] = 0;
    }
    (sixMonth.data ?? []).forEach((r) => {
      if (!r.order_date) return;
      const d = new Date(r.order_date);
      const k = d.toLocaleDateString("en-US", { month: "short" });
      if (k in buckets) buckets[k] += Number(r.total_amount ?? 0);
    });
    setMonthly(Object.entries(buckets).map(([month, sales]) => ({ month, sales })));

    // Pie by payment type
    const pt: Record<string, number> = {};
    (payTypes.data ?? []).forEach((r) => {
      const k = r.payment_type ?? "unknown";
      pt[k] = (pt[k] ?? 0) + Number(r.total_amount ?? 0);
    });
    setPie(Object.entries(pt).map(([name, value]) => ({ name, value })));

    // Category line
    const lineBuckets: Record<string, Record<string, number>> = {};
    Object.keys(buckets).forEach((mo) => (lineBuckets[mo] = {}));
    (catData.data ?? []).forEach((r: any) => {
      const orderDate = r.sales_orders?.order_date;
      if (!orderDate) return;
      const k = new Date(orderDate).toLocaleDateString("en-US", { month: "short" });
      if (!(k in lineBuckets)) return;
      const cat = r.marble_categories?.name_english ?? "Other";
      lineBuckets[k][cat] = (lineBuckets[k][cat] ?? 0) + Number(r.total_price ?? 0);
    });
    const allCats = new Set<string>();
    Object.values(lineBuckets).forEach((b) => Object.keys(b).forEach((k) => allCats.add(k)));
    setCatLine(
      Object.entries(lineBuckets).map(([month, vals]) => {
        const row: Record<string, number | string> = { month };
        allCats.forEach((c) => (row[c] = vals[c] ?? 0));
        return row;
      }),
    );

    setRecent((recentRows.data ?? []) as RecentOrder[]);
  };

  const cards = [
    { label: "Sales This Month", value: PKR(kpis?.monthSales), icon: TrendingUp, accent: true },
    { label: "Received This Month", value: PKR(kpis?.monthReceived), icon: Wallet },
    { label: "Pending Receivables", value: PKR(kpis?.pendingReceivable), icon: CreditCard },
    { label: "Active Lending", value: PKR(kpis?.activeLending), icon: Banknote },
    { label: "Active Borrowing", value: PKR(kpis?.activeBorrowing), icon: ArrowDownRight },
    { label: "Labour Payable (Month)", value: PKR(kpis?.labourPayable), icon: HardHat },
    { label: "Raw Rock Stock (tons)", value: num(kpis?.rawRockTons), icon: Package },
    { label: "Marble Inventory Value", value: PKR(kpis?.marbleValue), icon: Layers },
  ];

  const PIE_COLORS = ["#c9a84c", "#0f3460", "#2ecc71", "#e74c3c", "#a78bfa", "#f39c12"];
  const catKeys = catLine[0] ? Object.keys(catLine[0]).filter((k) => k !== "month") : [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        urdu="ڈیش بورڈ"
        subtitle="Real-time overview of factory operations."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className={`p-5 border-border/60 ${s.accent ? "gold-shadow border-primary/40" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="font-display text-2xl mt-2 text-foreground truncate">
                    {s.value}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 mt-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display text-lg text-primary mb-4">Monthly Sales (last 6 months)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis dataKey="month" stroke="#aaa" fontSize={12} />
                <YAxis stroke="#aaa" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "#16213e", border: "1px solid #c9a84c40" }}
                  formatter={(v: unknown) => PKR(Number(v))}
                />
                <Bar dataKey="sales" fill="#c9a84c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-lg text-primary mb-4">Payment Mix</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" outerRadius={80} label>
                  {pie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#16213e", border: "1px solid #c9a84c40" }}
                  formatter={(v: unknown) => PKR(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 mt-6">
        <h2 className="font-display text-lg text-primary mb-4">Category Sales Trend</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={catLine}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis dataKey="month" stroke="#aaa" fontSize={12} />
              <YAxis stroke="#aaa" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#16213e", border: "1px solid #c9a84c40" }}
                formatter={(v: unknown) => PKR(Number(v))}
              />
              <Legend />
              {catKeys.map((k, i) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={PIE_COLORS[i % PIE_COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5 mt-6">
        <h2 className="font-display text-lg text-primary mb-4">Recent Sales Orders</h2>
        {recent.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No orders yet.</div>
        ) : (
          <div className="space-y-2">
            {recent.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/40 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="font-mono text-xs text-primary">{o.order_number ?? o.id.slice(0, 8)}</div>
                  <Badge variant="outline" className="text-[10px]">
                    {o.payment_type ?? "—"}
                  </Badge>
                  <div className="text-xs text-muted-foreground">{fmtDate(o.order_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">{PKR(o.total_amount)}</div>
                  <Badge
                    className={
                      o.status === "delivered"
                        ? "bg-success/20 text-success border-success/30"
                        : o.status === "pending"
                          ? "bg-warning/20 text-warning border-warning/30"
                          : "bg-muted/40"
                    }
                  >
                    {o.status ?? "—"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
