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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PKR, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/machines")({
  component: () => (
    <Protected>
      <Machines />
    </Protected>
  ),
});

interface M {
  id: string; machine_name: string | null;
  purchase_date: string | null; purchase_price: number | null;
  current_status: string | null; last_maintenance_date: string | null; notes: string | null;
}

const empty = { machine_name: "", purchase_date: todayISO(), purchase_price: "", current_status: "operational", last_maintenance_date: "", notes: "" };

function Machines() {
  const [rows, setRows] = useState<M[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await supabase.from("machine_equipment").select("*").order("purchase_date", { ascending: false });
    setRows((data ?? []) as M[]);
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!form.machine_name) return toast.error("Name required");
    const { error } = await supabase.from("machine_equipment").insert({
      machine_name: form.machine_name, purchase_date: form.purchase_date,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
      current_status: form.current_status,
      last_maintenance_date: form.last_maintenance_date || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false); setForm(empty); void load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("machine_equipment").delete().eq("id", id);
    void load();
  };

  return (
    <div>
      <PageHeader title="Machines & Equipment" urdu="مشینری"
        actions={<Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> Add Machine</Button>}
      />
      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Purchased</TableHead>
            <TableHead className="text-right">Price</TableHead><TableHead>Status</TableHead>
            <TableHead>Last Maintenance</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No machines.</TableCell></TableRow> :
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.machine_name}</TableCell>
                  <TableCell>{fmtDate(r.purchase_date)}</TableCell>
                  <TableCell className="text-right">{PKR(r.purchase_price)}</TableCell>
                  <TableCell><Badge variant="outline">{r.current_status ?? "—"}</Badge></TableCell>
                  <TableCell>{fmtDate(r.last_maintenance_date)}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Machine</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.machine_name} onChange={(e) => setForm({ ...form, machine_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
              <div><Label>Price</Label><Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Status</Label>
                <Select value={form.current_status} onValueChange={(v) => setForm({ ...form, current_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="broken">Broken</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Last Maintenance</Label><Input type="date" value={form.last_maintenance_date} onChange={(e) => setForm({ ...form, last_maintenance_date: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-primary text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
