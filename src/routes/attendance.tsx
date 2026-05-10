import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { PKR, todayISO } from "@/lib/format";
import { JOB_ROLES } from "@/lib/lookups";
import { toast } from "sonner";
import { CheckCheck, Info } from "lucide-react";

export const Route = createFileRoute("/attendance")({
  component: () => (
    <Protected>
      <Attendance />
    </Protected>
  ),
});

interface L {
  id: string; name: string; job_role: string | null; is_active: boolean | null;
  monthly_salary: number | null; daily_wage: number | null; salary_type: string | null;
}
interface A { id: string; labour_id: string | null; date: string | null; status: string | null; overtime_hours: number | null }
interface MonthAtt { labour_id: string | null; status: string | null; overtime_hours: number | null }

function Attendance() {
  const [date, setDate] = useState(todayISO());
  const [labour, setLabour] = useState<L[]>([]);
  const [att, setAtt] = useState<Record<string, A>>({});
  const [monthAtt, setMonthAtt] = useState<MonthAtt[]>([]);

  const load = async () => {
    const now = new Date(date);
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const [l, a, ma] = await Promise.all([
      supabase.from("labour").select("*").eq("is_active", true).order("name"),
      supabase.from("attendance").select("*").eq("date", date),
      supabase.from("attendance").select("labour_id, status, overtime_hours")
        .gte("date", monthStart).lte("date", date),
    ]);
    setLabour((l.data ?? []) as L[]);
    const map: Record<string, A> = {};
    (a.data ?? []).forEach((r: A) => { if (r.labour_id) map[r.labour_id] = r; });
    setAtt(map);
    setMonthAtt((ma.data ?? []) as MonthAtt[]);
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
    toast.success("تمام حاضر / Marked all present");
  };

  // Salary estimate for a worker this month
  const getSalaryEstimate = (w: L) => {
    const wAtt = monthAtt.filter((a) => a.labour_id === w.id);
    const daysPresent = wAtt.filter((a) => a.status === "present" || a.status === "overtime").length;
    const halfDays = wAtt.filter((a) => a.status === "half_day").length;
    const totalOT = wAtt.reduce((s, a) => s + Number(a.overtime_hours ?? 0), 0);

    let estimated = 0;
    let otEarned = 0;
    if (w.salary_type === "daily") {
      const dailyRate = Number(w.daily_wage ?? 0);
      estimated = daysPresent * dailyRate + halfDays * (dailyRate / 2);
      otEarned = totalOT * (dailyRate / 8);
    } else {
      const daysInMonth = new Date(new Date(date).getFullYear(), new Date(date).getMonth() + 1, 0).getDate();
      const dailyEquiv = Number(w.monthly_salary ?? 0) / daysInMonth;
      estimated = daysPresent * dailyEquiv + halfDays * (dailyEquiv / 2);
      otEarned = totalOT * (dailyEquiv / 8);
    }
    return { daysPresent, halfDays, totalOT, estimated, otEarned };
  };

  const statusColors: Record<string, string> = {
    present: "bg-success/20 text-success border-success/40",
    absent: "bg-destructive/20 text-destructive border-destructive/40",
    half_day: "bg-warning/20 text-warning border-warning/40",
    overtime: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  };

  const urduRole = (val: string | null) =>
    JOB_ROLES.find((r) => r.value === val)?.urdu ?? val ?? "—";

  const presentCount = Object.values(att).filter((a) => a.status === "present" || a.status === "overtime").length;
  const absentCount = Object.values(att).filter((a) => a.status === "absent").length;

  return (
    <div className="pb-24">
      <PageHeader title="Attendance" urdu="حاضری" />

      {/* Date + summary */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Card className="p-3 flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">تاریخ</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-36 h-8" />
        </Card>
        <div className="flex gap-2">
          <Badge className="bg-success/20 text-success border-success/30">✅ {presentCount} حاضر</Badge>
          <Badge className="bg-destructive/20 text-destructive border-destructive/30">❌ {absentCount} غیر حاضر</Badge>
        </div>
      </div>

      {/* Mobile-first worker cards */}
      {labour.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-6xl mb-4">👷</div>
          <p className="font-urdu text-lg text-primary" style={{ direction: "rtl" }}>ابھی کوئی فعال مزدور نہیں</p>
          <p className="text-sm text-muted-foreground">No active workers found.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {labour.map((w) => {
            const a = att[w.id];
            const status = a?.status ?? "";
            const est = getSalaryEstimate(w);
            return (
              <Card key={w.id} className={`p-4 border-2 transition-colors ${status ? statusColors[status] ?? "" : "border-border/40"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-foreground">{w.name}</div>
                    <div className="font-urdu text-sm text-muted-foreground" style={{ direction: "rtl" }}>
                      {urduRole(w.job_role)}
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                          <Info className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-[200px] text-xs space-y-1 p-3">
                        <div className="font-urdu text-primary text-sm mb-1" style={{ direction: "rtl" }}>تنخواہ کا تخمینہ</div>
                        <div>حاضر دن: <strong>{est.daysPresent}</strong></div>
                        <div>آدھے دن: <strong>{est.halfDays}</strong></div>
                        <div>اوور ٹائم: <strong>{est.totalOT} hrs</strong></div>
                        <div className="border-t border-border/40 pt-1 mt-1">
                          <div>تخمینہ: <strong className="text-primary">{PKR(est.estimated)}</strong></div>
                          <div>OT کمائی: <strong className="text-purple-400">{PKR(est.otEarned)}</strong></div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Status buttons */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { val: "present", label: "✅ حاضر", cls: "border-success/40 hover:bg-success/20 text-success" },
                    { val: "half_day", label: "🟡 آدھا", cls: "border-warning/40 hover:bg-warning/20 text-warning" },
                    { val: "absent", label: "❌ غیر حاضر", cls: "border-destructive/40 hover:bg-destructive/20 text-destructive" },
                  ].map(({ val, label, cls }) => (
                    <Button
                      key={val}
                      size="sm"
                      variant="outline"
                      className={`text-xs font-urdu py-2 h-auto ${cls} ${status === val ? "ring-2 ring-offset-1" : ""}`}
                      onClick={() => setStatus(w.id, val, a?.overtime_hours ?? 0)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                {/* Overtime — only when present */}
                {(status === "present" || status === "overtime") && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">OT hrs</Label>
                    <Input
                      type="number"
                      className="h-7 w-20 text-sm"
                      defaultValue={a?.overtime_hours ?? 0}
                      min={0}
                      onBlur={(e) => setStatus(w.id, "present", Number(e.target.value || 0))}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky Mark All Present */}
      {labour.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 px-4">
          <Button
            onClick={markAllPresent}
            className="bg-primary text-primary-foreground shadow-lg gap-2 px-8 rounded-full font-urdu"
          >
            <CheckCheck className="h-4 w-4" /> تمام حاضر کریں / Mark All Present
          </Button>
        </div>
      )}
    </div>
  );
}
