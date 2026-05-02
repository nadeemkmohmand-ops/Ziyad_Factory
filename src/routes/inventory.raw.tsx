import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PKR, num, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, AlertTriangle, Trash2 } from "lucide-react";

export const Route = createFileRoute("/inventory/raw")({
  component: () => (
    <Protected>
      <RawRock />
    </Protected>
  ),
});

interface Row {
  id: string;
  rock_name_urdu: string | null;
  supplier_name: string | null;
  purchase_date: string | null;
  quantity_tons: number | null;
  purchase_price_per_ton: number | null;
  total_cost: number | null;
  notes: string | null;
}

const empty = {
  rock_name_urdu: "",
  supplier_name: "",
  purchase_date: todayISO(),
  quantity_tons: "",
  purchase_price_per_ton: "",
  notes: "",
};

const LOW_THRESHOLD = 5;

function RawRock() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await supabase
      .from("raw_rock_inventory")
      .select("*")
      .order("purchase_date", { ascending: false });
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!form.rock_name_urdu) return toast.error("Rock name required");
    const tons = Number(form.quantity_tons || 0);
    const price = Number(form.purchase_price_per_ton || 0);
    const { error } = await supabase.from("raw_rock_inventory").insert({
      rock_name_urdu: form.rock_name_urdu,
      supplier_name: form.supplier_name || null,
      purchase_date: form.purchase_date,
      quantity_tons: tons,
      purchase_price_per_ton: price,
      total_cost: tons * price,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setOpen(false);
    setForm(empty);
    void load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("raw_rock_inventory").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  const totalTons = rows.reduce((s, r) => s + Number(r.quantity_tons ?? 0), 0);
  const totalValue = rows.reduce((s, r) => s + Number(r.total_cost ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Raw Rock Inventory"
        urdu="خام پتھر"
        subtitle="Track purchases of raw marble rock from suppliers."
        actions={
          <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" /> Add Purchase
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Total Stock</div>
          <div className="font-display text-2xl mt-1">{num(totalTons)} tons</div>
          {totalTons < LOW_THRESHOLD && (
            <div className="flex items-center gap-1 text-xs text-destructive mt-2">
              <AlertTriangle className="h-3 w-3" /> Low stock alert
            </div>
          )}
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Total Value</div>
          <div className="font-display text-2xl mt-1">{PKR(totalValue)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Avg Price/ton</div>
          <div className="font-display text-2xl mt-1">{PKR(totalTons ? totalValue / totalTons : 0)}</div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Rock</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Tons</TableHead>
              <TableHead className="text-right">Price/ton</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No purchases yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.purchase_date)}</TableCell>
                  <TableCell className="font-urdu text-lg">{r.rock_name_urdu}</TableCell>
                  <TableCell>{r.supplier_name ?? "—"}</TableCell>
                  <TableCell className="text-right">{num(r.quantity_tons)}</TableCell>
                  <TableCell className="text-right">{PKR(r.purchase_price_per_ton)}</TableCell>
                  <TableCell className="text-right font-medium">{PKR(r.total_cost)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Raw Rock Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>پتھر کا نام (Rock name) *</Label>
              <Input
                className="font-urdu text-lg"
                dir="rtl"
                value={form.rock_name_urdu}
                onChange={(e) => setForm({ ...form, rock_name_urdu: e.target.value })}
              />
            </div>
            <div>
              <Label>Supplier</Label>
              <Input
                value={form.supplier_name}
                onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Quantity (tons)</Label>
                <Input
                  type="number"
                  value={form.quantity_tons}
                  onChange={(e) => setForm({ ...form, quantity_tons: e.target.value })}
                />
              </div>
              <div>
                <Label>Price/ton</Label>
                <Input
                  type="number"
                  value={form.purchase_price_per_ton}
                  onChange={(e) => setForm({ ...form, purchase_price_per_ton: e.target.value })}
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Total auto-cost:{" "}
              <span className="text-primary font-medium">
                {PKR(Number(form.quantity_tons || 0) * Number(form.purchase_price_per_ton || 0))}
              </span>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} className="bg-primary text-primary-foreground">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
