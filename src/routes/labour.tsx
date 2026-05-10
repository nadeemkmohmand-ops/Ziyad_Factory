import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { PKR, todayISO } from "@/lib/format";
import { JOB_ROLES } from "@/lib/lookups";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/labour")({
  component: () => (
    <Protected>
      <Labour />
    </Protected>
  ),
});

interface L {
  id: string;
  name: string;
  cnic: string | null;
  phone: string | null;
  job_role: string | null;
  salary_type: string | null;
  monthly_salary: number | null;
  daily_wage: number | null;
  join_date: string | null;
  is_active: boolean | null;
}

const empty = {
  name: "", cnic: "", phone: "", job_role: "cutter", salary_type: "daily",
  monthly_salary: "", daily_wage: "", join_date: todayISO(),
};

function Labour() {
  const [rows, setRows] = useState<L[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<L | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("labour").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as L[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  // Auto-suggest salary_type based on JOB_ROLES dailyRate
  const onSelectRole = (v: string) => {
    const role = JOB_ROLES.find((r) => r.value === v);
    setForm((f) => ({ ...f, job_role: v, salary_type: role?.dailyRate ? "daily" : "monthly" }));
  };

  const save = async () => {
    if (!form.name) return toast.error("Name required");
    const payload = {
      name: form.name, cnic: form.cnic || null, phone: form.phone || null,
      job_role: form.job_role, salary_type: form.salary_type,
      monthly_salary: form.monthly_salary ? Number(form.monthly_salary) : null,
      daily_wage: form.daily_wage ? Number(form.daily_wage) : null,
      join_date: form.join_date || null,
    };
    const { error } = edit
      ? await supabase.from("labour").update(payload).eq("id", edit.id)
      : await supabase.from("labour").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("محفوظ / Saved");
    setOpen(false); void load();
  };

  const toggle = async (l: L) => {
    await supabase.from("labour").update({ is_active: !l.is_active }).eq("id", l.id);
    void load();
  };
  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("labour").delete().eq("id", id);
    void load();
  };

  const urduRole = (val: string | null) =>
    JOB_ROLES.find((r) => r.value === val)?.urdu ?? val ?? "—";

  return (
    <div>
      <PageHeader title="Labour" urdu="مزدور"
        actions={<Button onClick={() => { setEdit(null); setForm(empty); setOpen(true); }} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> مزدور شامل</Button>}
      />

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table className="marble-table min-w-[600px]">
            <TableHeader><TableRow>
              <TableHead>نام / Name</TableHead>
              <TableHead>عہدہ / Role</TableHead>
              <TableHead>قسم</TableHead>
              <TableHead className="text-right">تنخواہ / Wage</TableHead>
              <TableHead>فون</TableHead>
              <TableHead>فعال</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="py-16 text-center">
                      <div className="text-6xl mb-4">👷</div>
                      <p className="font-urdu text-lg text-primary" style={{ direction: "rtl" }}>
                        ابھی کوئی ریکارڈ نہیں
                      </p>
                      <p className="text-sm text-muted-foreground">No records yet. Add your first worker.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.cnic ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-urdu text-base" style={{ direction: "rtl" }}>{urduRole(r.job_role)}</div>
                    <Badge variant="outline" className="text-[10px] mt-0.5">{r.job_role}</Badge>
                  </TableCell>
                  <TableCell>{r.salary_type}</TableCell>
                  <TableCell className="text-right">{PKR(r.salary_type === "daily" ? r.daily_wage : r.monthly_salary)}</TableCell>
                  <TableCell>{r.phone ?? "—"}</TableCell>
                  <TableCell><Switch checked={!!r.is_active} onCheckedChange={() => toggle(r)} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEdit(r);
                      setForm({ name: r.name, cnic: r.cnic ?? "", phone: r.phone ?? "", job_role: r.job_role ?? "cutter", salary_type: r.salary_type ?? "daily", monthly_salary: String(r.monthly_salary ?? ""), daily_wage: String(r.daily_wage ?? ""), join_date: r.join_date ?? todayISO() });
                      setOpen(true);
                    }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <div className="font-urdu text-lg text-primary" style={{ direction: "rtl" }}>
                {edit ? "ترمیم کریں" : "نیا مزدور"}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>CNIC</Label><Input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>عہدہ / Job Role</Label>
                <Select value={form.job_role} onValueChange={onSelectRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JOB_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <span className="font-urdu mr-2" style={{ direction: "rtl" }}>{r.urdu}</span>
                        <span className="text-xs text-muted-foreground">({r.value})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Salary Type</Label>
                <Select value={form.salary_type} onValueChange={(v) => setForm({ ...form, salary_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Monthly Salary</Label><Input type="number" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })} /></div>
              <div><Label>Daily Wage</Label><Input type="number" value={form.daily_wage} onChange={(e) => setForm({ ...form, daily_wage: e.target.value })} /></div>
            </div>
            <div><Label>Join Date</Label><Input type="date" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-primary text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
