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
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/format";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";

export const Route = createFileRoute("/attendance")({
  component: () => (
    <Protected>
      <Attendance />
    </Protected>
  ),
});

interface L { id: string; name: string; job_role: string | null; is_active: boolean | null }
interface A { id: string; labour_id: string | null; date: string | null; status: string | null; overtime_hours: number | null }

function Attendance() {
  const [date, setDate] = useState(todayISO());
  const [labour, setLabour] = useState<L[]>([]);
  const [att, setAtt] = useState<Record<string, A>>({});

  const load = async () => {
    const [l, a] = await Promise.all([
      supabase.from("labour").select("*").eq("is_active", true).order("name"),
      supabase.from("attendance").select("*").eq("date", date),
    ]);
    setLabour((l.data ?? []) as L[]);
    const map: Record<string, A> = {};
    (a.data ?? []).forEach((r: A) => { if (r.labour_id) map[r.labour_id] = r; });
    setAtt(map);
  };
  useEffect(() => { void load(); }, [date]);

  const setStatus = async (labour_id: string, status: string, overtime = 0) => {
    const existing = att[labour_id];
    if (existing) {
      await supabase.from("attendance").update({ status, overtime_hours: overtime }).eq("id", existing.id);
    } else {
      await supabase.from("attendance").insert({ labour_id, date, status, overtime_hours: overtime });
    }
    void load();
  };

  const markAllPresent = async () => {
    for (const l of labour) {
      if (!att[l.id]) await setStatus(l.id, "present");
    }
    toast.success("Marked all present");
  };

  const statusColor = (s: string | undefined) => ({
    present: "bg-success/20 text-success",
    absent: "bg-destructive/20 text-destructive",
    half_day: "bg-warning/20 text-warning",
    overtime: "bg-purple-500/20 text-purple-300",
  }[s ?? ""] ?? "");

  return (
    <div>
      <PageHeader title="Attendance" urdu="حاضری"
        actions={<Button onClick={markAllPresent} className="bg-primary text-primary-foreground"><CheckCheck className="h-4 w-4" /> Mark All Present</Button>}
      />
      <Card className="p-4 mb-4 inline-block"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Card>
      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader><TableRow>
            <TableHead>Worker</TableHead><TableHead>Role</TableHead>
            <TableHead>Status</TableHead><TableHead>Overtime (hrs)</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {labour.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No active workers.</TableCell></TableRow> :
              labour.map((l) => {
                const a = att[l.id];
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.job_role}</TableCell>
                    <TableCell>
                      <Select value={a?.status ?? ""} onValueChange={(v) => setStatus(l.id, v, a?.overtime_hours ?? 0)}>
                        <SelectTrigger className={`w-32 ${statusColor(a?.status ?? undefined)}`}><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="half_day">Half Day</SelectItem>
                          <SelectItem value="overtime">Overtime</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="w-24" defaultValue={a?.overtime_hours ?? 0} onBlur={(e) => setStatus(l.id, a?.status ?? "present", Number(e.target.value || 0))} />
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
