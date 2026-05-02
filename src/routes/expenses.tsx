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

export const Route = createFileRoute("/expenses")({
  component: () => (
    <Protected>
      <Expenses />
    </Protected>
  ),
});

interface E {
  id: string; category: string | null; description: string | null;
  amount: number | null; expense_date: string | null; paid_to: string | null;
  receipt_url: string | null;
}

const CATS = ["Electricity بجلی", "Fuel تیل", "Maintenance مرمت", "Transport ٹرانسپورٹ", "Misc متفرق"];

const empty = { category: CATS[0], description: "", amount: "", expense_date: todayISO(), paid_to: "" };

function Expenses() {
  const [rows, setRows] = useState<E[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [filterCat, setFilterCat] = useState("all");

  const load = async () => {
    const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false });
    setRows((data ?? []) as E[]);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.amount) return toast.error("Amount required");
    const { error } = await supabase.from("expenses").insert({
      category: form.category, description: form.description || null,
      amount: Number(form.amount), expense_date: form.expense_date,
      paid_to: form.paid_to || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Expense added");
    setOpen(false); setForm(empty); void load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    void load();
  };

  const filtered = filterCat === "all" ? rows : rows.filter((r) => r.category === filterCat);
  const total = filtered.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  // last 6 months chart
  const buckets: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = d.toLocaleDateString("en-US", { month: "short" });
    buckets[k] = 0;
  }
  rows.forEach((r) => {
    if (!r.expense_date) return;
    const d = new Date(r.expense_date);
    const k = d.toLocaleDateString("en-US", { month: "short" });
    if (k in buckets) buckets[k] += Number(r.amount ?? 0);
  });
  const chartData = Object.entries(buckets).map(([month, amt]) => ({ month, amt }));

  return (
    <div>
      <PageHeader title="Expenses" urdu="اخراجات"
        actions={<Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> Add Expense</Button>}
      />

      <Card className="p-5 mb-4">
        <h2 className="font-display text-lg text-primary mb-3">Monthly Trend</h2>
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

      <div className="flex items-center gap-3 mb-3">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Card className="px-4 py-2 ml-auto"><span className="text-xs text-muted-foreground">Total: </span><span className="font-display text-lg text-primary">{PKR(total)}</span></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead>
            <TableHead>Paid To</TableHead><TableHead className="text-right">Amount</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No expenses.</TableCell></TableRow> :
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.expense_date)}</TableCell>
                  <TableCell className="text-sm">{r.category}</TableCell>
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
        <DialogContent>
          <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
            </div>
            <div><Label>Paid To</Label><Input value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-primary text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
