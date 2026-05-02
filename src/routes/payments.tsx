import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PKR, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/payments")({
  component: () => (
    <Protected>
      <Payments />
    </Protected>
  ),
});

interface P {
  id: string;
  payment_type: string | null;
  amount: number | null;
  payment_method: string | null;
  payment_date: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  related_order_id: string | null;
  is_settled: boolean | null;
  notes: string | null;
}

function Payments() {
  const [rows, setRows] = useState<P[]>([]);
  const [custMap, setCustMap] = useState<Record<string, string>>({});
  const [supMap, setSupMap] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      const [p, c, s] = await Promise.all([
        supabase.from("payments").select("*").order("payment_date", { ascending: false }),
        supabase.from("customers").select("id, name"),
        supabase.from("suppliers").select("id, name"),
      ]);
      setRows((p.data ?? []) as P[]);
      const cm: Record<string, string> = {}; (c.data ?? []).forEach((r) => (cm[r.id] = r.name)); setCustMap(cm);
      const sm: Record<string, string> = {}; (s.data ?? []).forEach((r) => (sm[r.id] = r.name)); setSupMap(sm);
    })();
  }, []);

  const totalIn = rows.filter((r) => r.payment_type === "received").reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalOut = rows.filter((r) => r.payment_type === "paid").reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return (
    <div>
      <PageHeader title="Payments" urdu="ادائیگیاں" subtitle="All money in and out, linked to orders or suppliers." />
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Card className="p-4"><div className="text-xs uppercase tracking-widest text-muted-foreground">Total Received</div><div className="font-display text-2xl text-success mt-1">{PKR(totalIn)}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-widest text-muted-foreground">Total Paid</div><div className="font-display text-2xl text-destructive mt-1">{PKR(totalOut)}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase tracking-widest text-muted-foreground">Net</div><div className="font-display text-2xl text-primary mt-1">{PKR(totalIn - totalOut)}</div></Card>
      </div>
      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader><TableRow>
            <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Method</TableHead>
            <TableHead>Party</TableHead><TableHead>Note</TableHead><TableHead className="text-right">Amount</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments yet.</TableCell></TableRow> :
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.payment_date)}</TableCell>
                  <TableCell><Badge className={r.payment_type === "received" ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>{r.payment_type}</Badge></TableCell>
                  <TableCell>{r.payment_method ?? "—"}</TableCell>
                  <TableCell>{r.customer_id ? custMap[r.customer_id] : r.supplier_id ? supMap[r.supplier_id] : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.notes ?? "—"}</TableCell>
                  <TableCell className={`text-right font-medium ${r.payment_type === "received" ? "text-success" : "text-destructive"}`}>{PKR(r.amount)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
