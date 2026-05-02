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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { PKR } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/customers")({
  component: () => (
    <Protected>
      <Customers />
    </Protected>
  ),
});

interface Row {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  customer_type: string | null;
  credit_limit: number | null;
  current_balance: number | null;
  notes: string | null;
}

const empty = {
  name: "",
  phone: "",
  address: "",
  customer_type: "retail",
  credit_limit: "0",
  notes: "",
};

function Customers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => {
    void load();
  }, []);

  const startNew = () => {
    setEdit(null);
    setForm(empty);
    setOpen(true);
  };
  const startEdit = (r: Row) => {
    setEdit(r);
    setForm({
      name: r.name,
      phone: r.phone ?? "",
      address: r.address ?? "",
      customer_type: r.customer_type ?? "retail",
      credit_limit: String(r.credit_limit ?? 0),
      notes: r.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const payload = {
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      customer_type: form.customer_type,
      credit_limit: Number(form.credit_limit || 0),
      notes: form.notes || null,
    };
    const { error } = edit
      ? await supabase.from("customers").update(payload).eq("id", edit.id)
      : await supabase.from("customers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Updated" : "Added");
    setOpen(false);
    void load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  const filtered = rows.filter(
    (r) => r.name.toLowerCase().includes(q.toLowerCase()) || (r.phone ?? "").includes(q),
  );

  const balanceColor = (b: number) =>
    b > 0 ? "text-destructive" : b < 0 ? "text-blue-400" : "text-success";

  return (
    <div>
      <PageHeader
        title="Customers"
        urdu="گاہک"
        subtitle="Manage customer accounts and balances."
        actions={
          <Button onClick={startNew} className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" /> New Customer
          </Button>
        }
      />
      <div className="mb-3">
        <Input placeholder="Search by name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Credit Limit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const b = Number(r.current_balance ?? 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.name}
                      {r.address && (
                        <div className="text-xs text-muted-foreground">{r.address}</div>
                      )}
                    </TableCell>
                    <TableCell>{r.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.customer_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{PKR(r.credit_limit)}</TableCell>
                    <TableCell className={`text-right font-medium ${balanceColor(b)}`}>{PKR(b)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => del(r.id)} className="text-destructive">
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
            <DialogTitle>{edit ? "Edit" : "New"} Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Credit Limit</Label>
              <Input
                type="number"
                value={form.credit_limit}
                onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
