import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/lending")({
  component: () => (
    <Protected>
      <Lending />
    </Protected>
  ),
});

interface Row {
  id: string;
  party_name: string;
  party_type: string | null;
  transaction_type: string | null;
  amount: number | null;
  amount_returned: number | null;
  interest_rate: number | null;
  interest_type: string | null;
  transaction_date: string | null;
  due_date: string | null;
  is_settled: boolean | null;
  notes: string | null;
}

const empty = {
  party_name: "",
  party_type: "person",
  transaction_type: "lend",
  amount: "",
  interest_rate: "0",
  interest_type: "none",
  transaction_date: todayISO(),
  due_date: "",
  notes: "",
};

function calcInterest(r: Row): number {
  const principal = Number(r.amount ?? 0);
  const rate = Number(r.interest_rate ?? 0);
  if (!r.transaction_date) return 0;
  const start = new Date(r.transaction_date).getTime();
  const days = Math.max(0, (Date.now() - start) / 86400000);
  const years = days / 365;
  if (r.interest_type === "simple") return (principal * rate * years) / 100;
  if (r.interest_type === "compound") return principal * (Math.pow(1 + rate / 100, years) - 1);
  return 0;
}

function Lending() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [repayFor, setRepayFor] = useState<Row | null>(null);
  const [repayAmt, setRepayAmt] = useState("");

  const load = async () => {
    const { data } = await supabase.from("lending_borrowing").select("*").order("transaction_date", { ascending: false });
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.party_name) return toast.error("Party name required");
    const { error } = await supabase.from("lending_borrowing").insert({
      party_name: form.party_name,
      party_type: form.party_type,
      transaction_type: form.transaction_type,
      amount: Number(form.amount || 0),
      interest_rate: Number(form.interest_rate || 0),
      interest_type: form.interest_type,
      transaction_date: form.transaction_date,
      due_date: form.due_date || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false); setForm(empty); void load();
  };

  const repay = async () => {
    if (!repayFor) return;
    const newReturned = Number(repayFor.amount_returned ?? 0) + Number(repayAmt || 0);
    const totalDue = Number(repayFor.amount ?? 0) + calcInterest(repayFor);
    const settled = newReturned >= totalDue;
    await supabase.from("lending_borrowing").update({ amount_returned: newReturned, is_settled: settled }).eq("id", repayFor.id);
    setRepayFor(null); setRepayAmt("");
    toast.success("Repayment recorded");
    void load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("lending_borrowing").delete().eq("id", id);
    void load();
  };

  const filtered = (type: "lend" | "borrow" | "marble_lend") => rows.filter((r) => r.transaction_type === type);

  const renderTable = (type: "lend" | "borrow" | "marble_lend") => {
    const data = filtered(type);
    return (
      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Party</TableHead>
            <TableHead className="text-right">Principal</TableHead><TableHead className="text-right">Interest</TableHead>
            <TableHead className="text-right">Total Due</TableHead><TableHead className="text-right">Returned</TableHead>
            <TableHead className="text-right">Balance</TableHead><TableHead>Due</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data.length === 0 ? <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">None.</TableCell></TableRow> :
              data.map((r) => {
                const interest = calcInterest(r);
                const totalDue = Number(r.amount ?? 0) + interest;
                const balance = Math.max(0, totalDue - Number(r.amount_returned ?? 0));
                const overdue = r.due_date && !r.is_settled && new Date(r.due_date) < new Date();
                const dueSoon = r.due_date && !r.is_settled && !overdue && (new Date(r.due_date).getTime() - Date.now()) < 7 * 86400000;
                return (
                  <TableRow key={r.id} className={overdue ? "bg-destructive/10" : dueSoon ? "bg-warning/10" : ""}>
                    <TableCell>{fmtDate(r.transaction_date)}</TableCell>
                    <TableCell>
                      <div>{r.party_name}</div>
                      <div className="text-xs text-muted-foreground">{r.party_type}</div>
                    </TableCell>
                    <TableCell className="text-right">{PKR(r.amount)}</TableCell>
                    <TableCell className="text-right text-warning">{PKR(interest)}</TableCell>
                    <TableCell className="text-right font-medium">{PKR(totalDue)}</TableCell>
                    <TableCell className="text-right text-success">{PKR(r.amount_returned)}</TableCell>
                    <TableCell className={`text-right font-medium ${balance > 0 ? "text-destructive" : "text-success"}`}>{PKR(balance)}</TableCell>
                    <TableCell>
                      {r.is_settled ? <Badge className="bg-success/20 text-success border-success/30"><CheckCircle2 className="h-3 w-3" /> Settled</Badge> :
                        overdue ? <Badge className="bg-destructive/20 text-destructive border-destructive/30"><AlertTriangle className="h-3 w-3" /> Overdue</Badge> :
                        <span className="text-xs">{fmtDate(r.due_date)}</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {!r.is_settled && <Button size="sm" variant="outline" onClick={() => setRepayFor(r)}>Repay</Button>}
                      <Button size="sm" variant="ghost" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </Card>
    );
  };

  const totalLent = filtered("lend").reduce((s, r) => s + (Number(r.amount ?? 0) + calcInterest(r) - Number(r.amount_returned ?? 0)), 0);
  const totalBorrowed = filtered("borrow").reduce((s, r) => s + (Number(r.amount ?? 0) + calcInterest(r) - Number(r.amount_returned ?? 0)), 0);

  return (
    <div>
      <PageHeader title="Lending & Borrowing" urdu="قرض / ادھار" subtitle="Money lent out, money borrowed, and marble on credit."
        actions={<Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> New Entry</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <Card className="p-4"><div className="text-xs uppercase tracking-widest text-muted-foreground">We are owed (lending)</div><div className="font-display text-2xl text-success mt-1">{PKR(totalLent)}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-widest text-muted-foreground">We owe (borrowing)</div><div className="font-display text-2xl text-destructive mt-1">{PKR(totalBorrowed)}</div></Card>
      </div>

      <Tabs defaultValue="lend">
        <TabsList>
          <TabsTrigger value="lend">قرض دینا — Lent</TabsTrigger>
          <TabsTrigger value="borrow">قرض لینا — Borrowed</TabsTrigger>
          <TabsTrigger value="marble_lend">ادھار ماربل — Marble on Credit</TabsTrigger>
        </TabsList>
        <TabsContent value="lend">{renderTable("lend")}</TabsContent>
        <TabsContent value="borrow">{renderTable("borrow")}</TabsContent>
        <TabsContent value="marble_lend">{renderTable("marble_lend")}</TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Lending/Borrowing Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={form.transaction_type} onValueChange={(v) => setForm({ ...form, transaction_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lend">Lend (we gave)</SelectItem>
                    <SelectItem value="borrow">Borrow (we took)</SelectItem>
                    <SelectItem value="marble_lend">Marble on Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Party Type</Label>
                <Select value={form.party_type} onValueChange={(v) => setForm({ ...form, party_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">Person</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Party Name *</Label><Input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Interest</Label>
                <Select value={form.interest_type} onValueChange={(v) => setForm({ ...form, interest_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="compound">Compound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Rate %</Label><Input type="number" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-primary text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!repayFor} onOpenChange={(o) => !o && setRepayFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Repayment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">Party: <strong>{repayFor?.party_name}</strong></div>
            <div><Label>Amount</Label><Input type="number" value={repayAmt} onChange={(e) => setRepayAmt(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRepayFor(null)}>Cancel</Button><Button onClick={repay} className="bg-primary text-primary-foreground">Record</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
