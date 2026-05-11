import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { LowStockAlert } from "@/components/LowStockAlert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { PKR, num, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import {
  TrendingUp, Wallet, CreditCard, Banknote, HardHat, Package, Layers,
  ArrowDownRight, RefreshCw, FileUp, Download, Share2, Plus, Eye,
  ShoppingCart, Receipt, CalendarCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const Route = createFileRoute("/dashboard")({
  component: () => (<Protected><Dashboard /></Protected>),
});

interface Kpis {
  monthSales: number; monthReceived: number; pendingReceivable: number;
  activeLending: number; activeBorrowing: number; labourPayable: number;
  rawRockTons: number; marbleValue: number; todayExpenses: number;
}
interface MonthBar { month: string; sales: number }
interface PieDatum { name: string; value: number }
interface RecentOrder {
  id: string; order_number: string | null; total_amount: number | null;
  remaining_amount: number | null; status: string | null; order_date: string | null; payment_type: string | null;
}
interface QuickEntry {
  type: "sale" | "expense" | "payment" | "attendance";
  amount: string; note: string; date: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const dashRef = useRef<HTMLDivElement>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [monthly, setMonthly] = useState<MonthBar[]>([]);
  const [pie, setPie] = useState<PieDatum[]>([]);
  const [catLine, setCatLine] = useState<Array<Record<string, number | string>>>([]);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quick, setQuick] = useState<QuickEntry>({ type: "sale", amount: "", note: "", date: todayISO() });
  const [importData, setImportData] = useState<any[] | null>(null);
  const [importFile, setImportFile] = useState("");
  // today attendance for WhatsApp report
  const [todayAtt, setTodayAtt] = useState<{ present: number; absent: number; names: string[] }>({ present: 0, absent: 0, names: [] });

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const y = now.getFullYear(); const m = now.getMonth() + 1;
    const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
    const end = new Date(y, m, 1).toISOString().slice(0, 10);
    const today = todayISO();

    const [
      salesMonth, payMonth, pendingRec, lend, borrow, payable, raw, finished,
      sixMonth, payTypes, catData, recentRows, todayExp, attToday, labourList,
    ] = await Promise.all([
      supabase.from("sales_orders").select("total_amount,order_date").gte("order_date", start).lt("order_date", end),
      supabase.from("payments").select("amount").eq("payment_type", "received").gte("payment_date", start).lt("payment_date", end),
      supabase.from("sales_orders").select("remaining_amount,status").neq("status", "cancelled"),
      supabase.from("lending_borrowing").select("amount,amount_returned,transaction_type,is_settled").eq("transaction_type", "lend").eq("is_settled", false),
      supabase.from("lending_borrowing").select("amount,amount_returned,transaction_type,is_settled").eq("transaction_type", "borrow").eq("is_settled", false),
      supabase.from("salary_payments").select("net_salary,is_paid,month,year").eq("is_paid", false).eq("month", m).eq("year", y),
      supabase.from("raw_rock_inventory").select("quantity_tons"),
      supabase.from("finished_marble_inventory").select("quantity,cost_per_unit,category_id"),
      supabase.from("sales_orders").select("total_amount,order_date").gte("order_date", new Date(y, m - 6, 1).toISOString().slice(0, 10)),
      supabase.from("sales_orders").select("payment_type,total_amount"),
      supabase.from("sales_order_items").select("total_price,category_id,marble_categories(name_english,name_urdu),sales_orders(order_date)").gte("sales_orders.order_date", new Date(y, m - 6, 1).toISOString().slice(0, 10)),
      supabase.from("sales_orders").select("id,order_number,total_amount,remaining_amount,status,order_date,payment_type").order("created_at", { ascending: false }).limit(10),
      supabase.from("expenses").select("amount").eq("expense_date", today),
      supabase.from("attendance").select("labour_id, status").eq("date", today),
      supabase.from("labour").select("id, name").eq("is_active", true),
    ]);

    const sumNum = (rows: any, key: string) => (rows ?? []).reduce((s: number, r: any) => s + Number(r[key] ?? 0), 0);
    const lendOut = (lend.data ?? []).reduce((s, r) => s + (Number(r.amount ?? 0) - Number(r.amount_returned ?? 0)), 0);
    const borrowOut = (borrow.data ?? []).reduce((s, r) => s + (Number(r.amount ?? 0) - Number(r.amount_returned ?? 0)), 0);
    const todayExpTotal = sumNum(todayExp.data, "amount");

    setKpis({
      monthSales: sumNum(salesMonth.data, "total_amount"),
      monthReceived: sumNum(payMonth.data, "amount"),
      pendingReceivable: sumNum(pendingRec.data, "remaining_amount"),
      activeLending: lendOut, activeBorrowing: borrowOut,
      labourPayable: sumNum(payable.data, "net_salary"),
      rawRockTons: sumNum(raw.data, "quantity_tons"),
      marbleValue: (finished.data ?? []).reduce((s, r) => s + Number(r.quantity ?? 0) * Number(r.cost_per_unit ?? 0), 0),
      todayExpenses: todayExpTotal,
    });

    // Attendance summary for WhatsApp
    const attMap: Record<string, string> = {};
    (attToday.data ?? []).forEach((a: any) => { if (a.labour_id) attMap[a.labour_id] = a.status; });
    const presentCount = Object.values(attMap).filter((s) => s === "present" || s === "overtime").length;
    const absentIds = Object.entries(attMap).filter(([, s]) => s === "absent").map(([id]) => id);
    const absentNames = (labourList.data ?? []).filter((l) => absentIds.includes(l.id)).map((l) => l.name);
    setTodayAtt({ present: presentCount, absent: absentIds.length, names: absentNames });

    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) { const d = new Date(y, m - 1 - i, 1); const k = d.toLocaleDateString("en-US", { month: "short" }); buckets[k] = 0; }
    (sixMonth.data ?? []).forEach((r) => { if (!r.order_date) return; const k = new Date(r.order_date).toLocaleDateString("en-US", { month: "short" }); if (k in buckets) buckets[k] += Number(r.total_amount ?? 0); });
    setMonthly(Object.entries(buckets).map(([month, sales]) => ({ month, sales })));

    const pt: Record<string, number> = {};
    (payTypes.data ?? []).forEach((r) => { const k = r.payment_type ?? "unknown"; pt[k] = (pt[k] ?? 0) + Number(r.total_amount ?? 0); });
    setPie(Object.entries(pt).map(([name, value]) => ({ name, value })));

    const lineBuckets: Record<string, Record<string, number>> = {};
    Object.keys(buckets).forEach((mo) => (lineBuckets[mo] = {}));
    (catData.data ?? []).forEach((r: any) => {
      const od = r.sales_orders?.order_date; if (!od) return;
      const k = new Date(od).toLocaleDateString("en-US", { month: "short" }); if (!(k in lineBuckets)) return;
      const cat = r.marble_categories?.name_english ?? "Other";
      lineBuckets[k][cat] = (lineBuckets[k][cat] ?? 0) + Number(r.total_price ?? 0);
    });
    const allCats = new Set<string>();
    Object.values(lineBuckets).forEach((b) => Object.keys(b).forEach((k) => allCats.add(k)));
    setCatLine(Object.entries(lineBuckets).map(([month, vals]) => { const row: Record<string, number | string> = { month }; allCats.forEach((c) => (row[c] = vals[c] ?? 0)); return row; }));
    setRecent((recentRows.data ?? []) as RecentOrder[]);
    setLoading(false);
  };

  const saveQuickEntry = async () => {
    const amt = Number(quick.amount);
    if (!amt) return toast.error("رقم درج کریں / Enter amount");
    let error: any = null;
    if (quick.type === "sale") {
      ({ error } = await supabase.from("sales_orders").insert({ total_amount: amt, paid_amount: 0, remaining_amount: amt, order_date: quick.date, status: "pending", notes: quick.note }));
    } else if (quick.type === "expense") {
      ({ error } = await supabase.from("expenses").insert({ amount: amt, category: quick.note || "General", expense_date: quick.date }));
    } else if (quick.type === "payment") {
      ({ error } = await supabase.from("payments").insert({ amount: amt, payment_type: "received", payment_method: "cash", payment_date: quick.date, notes: quick.note }));
    }
    if (error) return toast.error(error.message);
    toast.success("محفوظ ہو گیا / Saved successfully");
    setQuickOpen(false);
    void load();
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(",");
      return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.trim() ?? ""]));
    });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImportFile(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    const reader = new FileReader();
    if (ext === "json") {
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          setImportData(Array.isArray(parsed) ? parsed : [parsed]);
          toast.success(`JSON لوڈ ہوا — ${Array.isArray(parsed) ? parsed.length : 1} ریکارڈ`);
        } catch { toast.error("JSON فائل خراب ہے"); }
      };
      reader.readAsText(file);
    } else if (ext === "csv") {
      reader.onload = (ev) => {
        const data = parseCSV(ev.target?.result as string);
        setImportData(data);
        toast.success(`CSV لوڈ ہوئی — ${data.length} ریکارڈ`);
      };
      reader.readAsText(file);
    } else {
      toast.error("صرف CSV یا JSON فائل / Only CSV or JSON supported");
    }
  };

  const exportPDF = async () => {
    if (!dashRef.current) return;
    toast.info("PDF بن رہی ہے...");
    const canvas = await html2canvas(dashRef.current, { scale: 1.5, useCORS: true, backgroundColor: "#f5f5f5" });
    const img = canvas.toDataURL("image/jpeg", 0.85);
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 1.5, canvas.height / 1.5] });
    pdf.addImage(img, "JPEG", 0, 0, canvas.width / 1.5, canvas.height / 1.5);
    pdf.save(`AlMakkah_Dashboard_${todayISO()}.pdf`);
    toast.success("PDF محفوظ ہوئی / PDF saved");
  };

  // Full daily WhatsApp report
  const shareWhatsApp = async () => {
    if (!kpis) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString("ur-PK");
    const totalWorkers = todayAtt.present + todayAtt.absent;
    const absentStr = todayAtt.names.length > 0 ? todayAtt.names.join("، ") : "کوئی نہیں";

    // Fetch today's sales and raw stock
    const today = todayISO();
    const [todaySales, rawStock, finStock] = await Promise.all([
      supabase.from("sales_orders").select("total_amount").eq("order_date", today),
      supabase.from("raw_rock_inventory").select("quantity_tons"),
      supabase.from("finished_marble_inventory").select("quantity"),
    ]);
    const todaySalesTotal = (todaySales.data ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
    const rawTons = (rawStock.data ?? []).reduce((s, r) => s + Number(r.quantity_tons ?? 0), 0);
    const finSlabs = (finStock.data ?? []).reduce((s, r) => s + Number(r.quantity ?? 0), 0);

    const msg = encodeURIComponent(
`🏭 *المکہ فیکٹری — روزانہ رپورٹ*
📅 تاریخ: ${dateStr}، ضلع مہمند

📊 *آج کی سرگرمیاں*
✅ حاضر مزدور: ${todayAtt.present}/${totalWorkers || "—"}
❌ غیر حاضر: ${todayAtt.absent}${todayAtt.names.length > 0 ? ` (${absentStr})` : ""}

💰 *مالیات آج*
🛒 سیلز: ${PKR(todaySalesTotal)}
✅ وصول: ${PKR(kpis.monthReceived)}
📤 اخراجات: ${PKR(kpis.todayExpenses)}

📦 *اسٹاک*
🪨 خام پتھر: ${num(rawTons)} ٹن باقی
💎 تیار ماربل: ${num(finSlabs)} سلیب

📈 *ماہانہ خلاصہ*
💰 کل سیلز: ${PKR(kpis.monthSales)}
⏳ واجب الوصول: ${PKR(kpis.pendingReceivable)}
👷 مزدور تنخواہ: ${PKR(kpis.labourPayable)}

_زیاد خان — المکہ فیکٹری، ضلع مہمند_`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const cards = [
    { label: "اس ماہ کی سیلز", sub: "Sales This Month", value: PKR(kpis?.monthSales), icon: TrendingUp, accent: true, link: "/sales" },
    { label: "وصول شدہ رقم", sub: "Received This Month", value: PKR(kpis?.monthReceived), icon: Wallet, link: "/payments" },
    { label: "واجب الوصول", sub: "Pending Receivables", value: PKR(kpis?.pendingReceivable), icon: CreditCard, link: "/sales" },
    { label: "آج کے اخراجات", sub: "Today's Expenses", value: PKR(kpis?.todayExpenses), icon: Receipt, link: "/expenses" },
    { label: "دیا ہوا قرض", sub: "Active Lending", value: PKR(kpis?.activeLending), icon: Banknote, link: "/lending" },
    { label: "لیا ہوا قرض", sub: "Active Borrowing", value: PKR(kpis?.activeBorrowing), icon: ArrowDownRight, link: "/lending" },
    { label: "مزدور تنخواہ (ماہ)", sub: "Labour Payable", value: PKR(kpis?.labourPayable), icon: HardHat, link: "/salaries" },
    { label: "خام پتھر (ٹن)", sub: "Raw Rock Stock", value: num(kpis?.rawRockTons), icon: Package, link: "/inventory/raw" },
    { label: "تیار ماربل قیمت", sub: "Marble Inventory Value", value: PKR(kpis?.marbleValue), icon: Layers, link: "/inventory/finished" },
  ];

  const PIE_COLORS = ["#0076D6", "#349EF4", "#2ecc71", "#e74c3c", "#a78bfa", "#C86F3C"];
  const catKeys = catLine[0] ? Object.keys(catLine[0]).filter((k) => k !== "month") : [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        urdu="ڈیش بورڈ"
        subtitle="المکہ فیکٹری — فیکٹری آپریشنز کا مکمل جائزہ"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-1">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="font-urdu">تازہ کریں</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="font-urdu">فوری اندراج</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)} className="gap-1">
              <FileUp className="h-4 w-4" />
              <span className="font-urdu">فائل درآمد</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1">
              <Download className="h-4 w-4" />
              <span className="font-urdu">PDF محفوظ</span>
            </Button>
            <Button size="sm" onClick={() => void shareWhatsApp()} className="gap-1 bg-green-600 hover:bg-green-700 text-white">
              <Share2 className="h-4 w-4" />
              <span className="font-urdu">واٹس ایپ</span>
            </Button>
          </div>
        }
      />

      {/* Low Stock Alert */}
      <LowStockAlert />

      <div ref={dashRef}>
        {/* KPI CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card
                className={`p-5 border-border/60 cursor-pointer hover:border-primary/60 transition-colors ${s.accent ? "gold-shadow border-primary/40" : ""}`}
                onClick={() => navigate({ to: s.link as any })}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-urdu text-sm text-primary/80 leading-tight" style={{ direction: "rtl" }}>{s.label}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{s.sub}</div>
                    <div className="font-display text-2xl mt-2 text-foreground truncate">{s.value ?? "—"}</div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
                    <s.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Eye className="h-3 w-3" /><span className="font-urdu">تفصیل دیکھیں</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: "نئی سیلز", sub: "New Sale", icon: ShoppingCart, to: "/sales" },
            { label: "ادائیگی", sub: "Payment", icon: Wallet, to: "/payments" },
            { label: "اخراجات", sub: "Expense", icon: Receipt, to: "/expenses" },
            { label: "حاضری", sub: "Attendance", icon: CalendarCheck, to: "/attendance" },
          ].map((q) => (
            <Card key={q.sub} className="p-3 cursor-pointer hover:border-primary/40 transition-all hover:bg-card/80" onClick={() => navigate({ to: q.to as any })}>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0"><q.icon className="h-4 w-4" /></div>
                <div>
                  <div className="font-urdu text-sm text-foreground" style={{ direction: "rtl" }}>{q.label}</div>
                  <div className="text-[10px] text-muted-foreground">{q.sub}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* CHARTS */}
        <div className="grid gap-4 mt-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="font-urdu text-lg text-primary mb-1" style={{ direction: "rtl" }}>ماہانہ سیلز (آخری 6 ماہ)</div>
            <div className="text-xs text-muted-foreground mb-4">Monthly Sales — Last 6 months</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid rgba(0,118,214,0.25)" }} formatter={(v: unknown) => PKR(Number(v))} />
                  <Bar dataKey="sales" fill="#0076D6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <div className="font-urdu text-lg text-primary mb-1" style={{ direction: "rtl" }}>ادائیگی کی اقسام</div>
            <div className="text-xs text-muted-foreground mb-4">Payment Mix</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" outerRadius={80} label>
                    {pie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid rgba(0,118,214,0.25)" }} formatter={(v: unknown) => PKR(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="p-5 mt-6">
          <div className="font-urdu text-lg text-primary mb-1" style={{ direction: "rtl" }}>کیٹگری سیلز ٹرینڈ</div>
          <div className="text-xs text-muted-foreground mb-4">Category Sales Trend</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={catLine}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid rgba(0,118,214,0.25)" }} formatter={(v: unknown) => PKR(Number(v))} />
                <Legend />
                {catKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={2} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* RECENT ORDERS */}
        <Card className="p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-urdu text-lg text-primary" style={{ direction: "rtl" }}>حالیہ سیلز آرڈر</div>
              <div className="text-xs text-muted-foreground">Recent Sales Orders</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/sales" })} className="gap-1 font-urdu">
              سب دیکھیں <Eye className="h-3 w-3" />
            </Button>
          </div>
          {recent.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-6xl mb-4">💎</div>
              <p className="font-urdu text-lg text-primary" style={{ direction: "rtl" }}>ابھی کوئی آرڈر نہیں</p>
              <p className="text-sm text-muted-foreground">No recent orders.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((o) => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/40 transition cursor-pointer" onClick={() => navigate({ to: "/sales" })}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="font-mono text-xs text-primary">{o.order_number ?? o.id.slice(0, 8)}</div>
                    <Badge variant="outline" className="text-[10px]">{o.payment_type ?? "—"}</Badge>
                    <div className="text-xs text-muted-foreground hidden sm:block">{fmtDate(o.order_date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{PKR(o.total_amount)}</div>
                    <Badge className={o.status === "delivered" ? "bg-success/20 text-success border-success/30" : o.status === "pending" ? "bg-warning/20 text-warning border-warning/30" : "bg-muted/40"}>
                      {o.status ?? "—"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {importData && (
          <Card className="p-5 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-urdu text-lg text-primary" style={{ direction: "rtl" }}>درآمد شدہ ڈیٹا</div>
                <div className="text-xs text-muted-foreground">Imported: {importFile} — {importData.length} rows</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setImportData(null)} className="font-urdu text-destructive">بند کریں</Button>
            </div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr>{importData[0] && Object.keys(importData[0]).map((k) => <th key={k} className="text-left p-2 border-b border-border text-muted-foreground">{k}</th>)}</tr>
                </thead>
                <tbody>
                  {importData.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-card/60">
                      {Object.values(row).map((v: any, j) => <td key={j} className="p-2 border-b border-border/30">{String(v)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* QUICK ENTRY */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <div className="font-urdu text-xl text-primary" style={{ direction: "rtl" }}>فوری اندراج</div>
              <div className="text-sm text-muted-foreground">Quick Manual Entry</div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-urdu">قسم / Type</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {(["sale", "expense", "payment", "attendance"] as const).map((t) => (
                  <button key={t} onClick={() => setQuick({ ...quick, type: t })}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all font-urdu ${quick.type === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}>
                    {t === "sale" ? "سیلز" : t === "expense" ? "اخراجات" : t === "payment" ? "ادائیگی" : "حاضری"}
                  </button>
                ))}
              </div>
            </div>
            <div><Label className="font-urdu">رقم (PKR) / Amount</Label><Input type="number" value={quick.amount} onChange={(e) => setQuick({ ...quick, amount: e.target.value })} placeholder="0" /></div>
            <div><Label className="font-urdu">تاریخ / Date</Label><Input type="date" value={quick.date} onChange={(e) => setQuick({ ...quick, date: e.target.value })} /></div>
            <div><Label className="font-urdu">نوٹ / Note</Label><Input value={quick.note} onChange={(e) => setQuick({ ...quick, note: e.target.value })} className="font-urdu" placeholder="اختیاری نوٹ" /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setQuickOpen(false)} className="flex-1 font-urdu">منسوخ</Button>
              <Button onClick={saveQuickEntry} className="flex-1 font-urdu bg-primary text-primary-foreground">محفوظ کریں</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FILE IMPORT */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <div className="font-urdu text-xl text-primary" style={{ direction: "rtl" }}>فائل درآمد کریں</div>
              <div className="text-sm text-muted-foreground">Import CSV / JSON</div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-urdu" style={{ direction: "rtl" }}>
              CSV یا JSON فائل اپ لوڈ کریں۔
            </p>
            <div className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center hover:border-primary/40 transition-colors">
              <FileUp className="h-10 w-10 text-primary/40 mx-auto mb-3" />
              <Label htmlFor="file-import">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm cursor-pointer hover:bg-primary/20 transition-colors font-urdu">
                  <FileUp className="h-4 w-4" /> فائل منتخب کریں
                </div>
              </Label>
              <Input id="file-import" type="file" accept=".csv,.json" className="hidden" onChange={handleFileImport} />
              {importFile && <p className="text-xs text-primary mt-2">{importFile}</p>}
            </div>
            {importData && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm font-urdu text-emerald-400" style={{ direction: "rtl" }}>
                ✅ {importData.length} ریکارڈ لوڈ ہوئے
              </div>
            )}
            <Button onClick={() => setUploadOpen(false)} className="w-full font-urdu">بند کریں / Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
