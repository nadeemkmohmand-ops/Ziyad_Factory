import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PKR, monthLabel, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Calculator, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/salaries")({
  component: () => (
    <Protected>
      <Salaries />
    </Protected>
  ),
});

interface L { id: string; name: string; salary_type: string | null; monthly_salary: number | null; daily_wage: number | null }
interface A { labour_id: string | null; status: string | null; overtime_hours: number | null }
interface SP {
  id: string; labour_id: string | null; month: number | null; year: number | null;
  base_salary: number | null; overtime_pay: number | null; deductions: number | null;
  net_salary: number | null; days_present: number | null; half_days: number | null;
  overtime_hours: number | null; is_paid: boolean | null;
}

interface Calc {
  labour: L;
  daysPresent: number;
  halfDays: number;
  absent: number;
  overtimeHours: number;
  base: number;
  overtimePay: number;
  deductions: number;
  net: number;
  existing?: SP;
}

function Salaries() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [labour, setLabour] = useState<L[]>([]);
  const [att, setAtt] = useState<A[]>([]);
  const [paid, setPaid] = useState<SP[]>([]);
  const [deductMap, setDeductMap] = useState<Record<string, string>>({});

  const load = async () => {
    const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const end = new Date(year, month, 1).toISOString().slice(0, 10);
    const [l, a, sp] = await Promise.all([
      supabase.from("labour").select("*").eq("is_active", true),
      supabase.from("attendance").select("labour_id, status, overtime_hours").gte("date", start).lt("date", end),
      supabase.from("salary_payments").select("*").eq("month", month).eq("year", year),
    ]);
    setLabour((l.data ?? []) as L[]);
    setAtt((a.data ?? []) as A[]);
    setPaid((sp.data ?? []) as SP[]);
  };
  useEffect(() => { void load(); }, [month, year]);

  const calcs: Calc[] = labour.map((l) => {
    const mine = att.filter((x) => x.labour_id === l.id);
    const daysPresent = mine.filter((x) => x.status === "present" || x.status === "overtime").length;
    const halfDays = mine.filter((x) => x.status === "half_day").length;
    const absent = mine.filter((x) => x.status === "absent").length;
    const overtimeHours = mine.reduce((s, x) => s + Number(x.overtime_hours ?? 0), 0);
    const daily = Number(l.daily_wage ?? 0);
    let base = 0, overtimePay = 0;
    if (l.salary_type === "daily") {
      base = daysPresent * daily + halfDays * (daily / 2);
      overtimePay = (overtimeHours * (daily / 8)) * 1.5;
    } else {
      const monthly = Number(l.monthly_salary ?? 0);
      const dayEq = monthly / 30;
      base = monthly - absent * dayEq - halfDays * (dayEq / 2);
      overtimePay = (overtimeHours * (dayEq / 8)) * 1.5;
    }
    const deductions = Number(deductMap[l.id] ?? 0);
    const net = Math.max(0, base + overtimePay - deductions);
    const existing = paid.find((p) => p.labour_id === l.id);
    return { labour: l, daysPresent, halfDays, absent, overtimeHours, base, overtimePay, deductions, net, existing };
  });

  const markPaid = async (c: Calc) => {
    const payload = {
      labour_id: c.labour.id, month, year,
      base_salary: c.base, overtime_pay: c.overtimePay, deductions: c.deductions, net_salary: c.net,
      days_present: c.daysPresent, half_days: c.halfDays, overtime_hours: c.overtimeHours,
      is_paid: true, paid_date: todayISO(), payment_method: "cash",
    };
    if (c.existing) await supabase.from("salary_payments").update(payload).eq("id", c.existing.id);
    else await supabase.from("salary_payments").insert(payload);
    toast.success("Marked paid");
    void load();
  };

  const totalPayroll = calcs.reduce((s, c) => s + c.net, 0);

  return (
    <div>
      <PageHeader title="Salaries" urdu="تنخواہیں" subtitle={`Auto-calculated for ${monthLabel(month, year)}`} />
      <div className="flex items-end gap-3 mb-4">
        <div><Label>Month</Label>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 12 }).map((_, i) => <SelectItem key={i+1} value={String(i+1)}>{new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" })}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Year</Label>
          <Input type="number" className="w-28" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <Card className="p-3 ml-auto"><div className="text-xs uppercase tracking-widest text-muted-foreground">Total Payroll</div><div className="font-display text-xl text-primary">{PKR(totalPayroll)}</div></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader><TableRow>
            <TableHead>Worker</TableHead><TableHead>Type</TableHead>
            <TableHead className="text-center">Present</TableHead><TableHead className="text-center">Half</TableHead>
            <TableHead className="text-center">Absent</TableHead><TableHead className="text-center">OT (h)</TableHead>
            <TableHead className="text-right">Base</TableHead><TableHead className="text-right">OT Pay</TableHead>
            <TableHead className="text-right">Deduct</TableHead><TableHead className="text-right">Net</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {calcs.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No active workers.</TableCell></TableRow> :
              calcs.map((c) => (
                <TableRow key={c.labour.id}>
                  <TableCell className="font-medium">{c.labour.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.labour.salary_type}</Badge></TableCell>
                  <TableCell className="text-center">{c.daysPresent}</TableCell>
                  <TableCell className="text-center">{c.halfDays}</TableCell>
                  <TableCell className="text-center">{c.absent}</TableCell>
                  <TableCell className="text-center">{c.overtimeHours}</TableCell>
                  <TableCell className="text-right">{PKR(c.base)}</TableCell>
                  <TableCell className="text-right">{PKR(c.overtimePay)}</TableCell>
                  <TableCell className="text-right">
                    <Input type="number" className="w-24 ml-auto" defaultValue={c.deductions} onBlur={(e) => setDeductMap({ ...deductMap, [c.labour.id]: e.target.value })} />
                  </TableCell>
                  <TableCell className="text-right font-medium text-primary">{PKR(c.net)}</TableCell>
                  <TableCell>
                    {c.existing?.is_paid ? <Badge className="bg-success/20 text-success border-success/30"><CheckCircle2 className="h-3 w-3" /> Paid</Badge> :
                      <Button size="sm" variant="outline" onClick={() => markPaid(c)}><Calculator className="h-3 w-3" /> Pay</Button>}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
