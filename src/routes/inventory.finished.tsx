import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PKR, num, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/inventory/finished")({
  component: () => (
    <Protected>
      <Finished />
    </Protected>
  ),
});

interface Row {
  id: string;
  category_id: string | null;
  batch_number: string | null;
  quantity: number | null;
  unit: string | null;
  production_date: string | null;
  cost_per_unit: number | null;
  selling_price_per_unit: number | null;
  stock_status: string | null;
}
interface Cat {
  id: string;
  name_urdu: string;
  name_english: string | null;
  unit: string;
  price_per_sqft: number | null;
}

const empty = {
  category_id: "",
  batch_number: "",
  quantity: "",
  unit: "sqft",
  production_date: todayISO(),
  cost_per_unit: "",
  selling_price_per_unit: "",
  stock_status: "in_stock",
};

function Finished() {
  const [rows, setRows] = useState<Row[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [r, c] = await Promise.all([
      supabase.from("finished_marble_inventory").select("*").order("production_date", { ascending: false }),
      supabase.from("marble_categories").select("id, name_urdu, name_english, unit, price_per_sqft"),
    ]);
    setRows((r.data ?? []) as Row[]);
    setCats((c.data ?? []) as Cat[]);
  };
  useEffect(() => {
    void load();
  }, []);

  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name_english ?? "—";
  const catUrdu = (id: string | null) => cats.find((c) => c.id === id)?.name_urdu ?? "";

  const save = async () => {
    if (!form.category_id) return toast.error("Select category");
    const { error } = await supabase.from("finished_marble_inventory").insert({
      category_id: form.category_id,
      batch_number: form.batch_number || null,
      quantity: Number(form.quantity || 0),
      unit: form.unit,
      production_date: form.production_date,
      cost_per_unit: Number(form.cost_per_unit || 0),
      selling_price_per_unit: Number(form.selling_price_per_unit || 0),
      stock_status: form.stock_status,
    });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setOpen(false);
    setForm(empty);
    void load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete batch?")) return;
    const { error } = await supabase.from("finished_marble_inventory").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("finished_marble_inventory").update({ stock_status: status }).eq("id", id);
    void load();
  };

  // summaries
  const summary: Record<string, { qty: number; value: number; sell: number; n: number }> = {};
  rows.forEach((r) => {
    const k = r.category_id ?? "x";
    summary[k] = summary[k] ?? { qty: 0, value: 0, sell: 0, n: 0 };
    summary[k].qty += Number(r.quantity ?? 0);
    summary[k].value += Number(r.quantity ?? 0) * Number(r.cost_per_unit ?? 0);
    summary[k].sell += Number(r.selling_price_per_unit ?? 0);
    summary[k].n += 1;
  });

  return (
    <div>
      <PageHeader
        title="Finished Marble Inventory"
        urdu="تیار شدہ ماربل"
        subtitle="Manage cut & polished stock by batch."
        actions={
          <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" /> New Batch
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 mb-6">
        {Object.entries(summary).map(([cid, s]) => (
          <Card key={cid} className="p-4">
            <div className="font-urdu text-lg text-primary">{catUrdu(cid)}</div>
            <div className="text-xs text-muted-foreground">{catName(cid)}</div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div>
                <div className="text-muted-foreground">Qty</div>
                <div className="font-medium">{num(s.qty)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Value</div>
                <div className="font-medium">{PKR(s.value)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg sell</div>
                <div className="font-medium">{PKR(s.n ? s.sell / s.n : 0)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Cost/u</TableHead>
              <TableHead className="text-right">Sell/u</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No batches yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const sell = Number(r.selling_price_per_unit ?? 0);
                const cost = Number(r.cost_per_unit ?? 0);
                const margin = sell ? ((sell - cost) / sell) * 100 : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.production_date)}</TableCell>
                    <TableCell>
                      <div className="font-urdu text-base">{catUrdu(r.category_id)}</div>
                      <div className="text-xs text-muted-foreground">{catName(r.category_id)}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.batch_number ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {num(r.quantity)} {r.unit}
                    </TableCell>
                    <TableCell className="text-right">{PKR(cost)}</TableCell>
                    <TableCell className="text-right">{PKR(sell)}</TableCell>
                    <TableCell className={`text-right ${margin > 0 ? "text-success" : "text-destructive"}`}>
                      {margin.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Select value={r.stock_status ?? "in_stock"} onValueChange={(v) => updateStatus(r.id, v)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_stock">In Stock</SelectItem>
                          <SelectItem value="reserved">Reserved</SelectItem>
                          <SelectItem value="sold_out">Sold Out</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Finished Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Category *</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => {
                  const c = cats.find((x) => x.id === v);
                  setForm({
                    ...form,
                    category_id: v,
                    unit: c?.unit ?? "sqft",
                    selling_price_per_unit: c?.price_per_sqft ? String(c.price_per_sqft) : form.selling_price_per_unit,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-urdu mr-2">{c.name_urdu}</span>{" "}
                      <span className="text-xs text-muted-foreground">{c.name_english}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Batch #</Label>
                <Input
                  value={form.batch_number}
                  onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Production Date</Label>
                <Input
                  type="date"
                  value={form.production_date}
                  onChange={(e) => setForm({ ...form, production_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div>
                <Label>Cost/unit</Label>
                <Input
                  type="number"
                  value={form.cost_per_unit}
                  onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                />
              </div>
              <div>
                <Label>Sell/unit</Label>
                <Input
                  type="number"
                  value={form.selling_price_per_unit}
                  onChange={(e) => setForm({ ...form, selling_price_per_unit: e.target.value })}
                />
              </div>
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

export const Badge_ = Badge;
