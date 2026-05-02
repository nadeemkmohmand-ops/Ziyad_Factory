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
import { PKR } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/suppliers")({
  component: () => (
    <Protected>
      <Suppliers />
    </Protected>
  ),
});

interface Row {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  supply_type: string | null;
  current_balance: number | null;
  notes: string | null;
}

const empty = { name: "", phone: "", address: "", supply_type: "", notes: "" };

function Suppliers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const payload = {
      name: form.name,
      phone: form.phone || null,
      address: form.address || null,
      supply_type: form.supply_type || null,
      notes: form.notes || null,
    };
    const { error } = edit
      ? await supabase.from("suppliers").update(payload).eq("id", edit.id)
      : await supabase.from("suppliers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    void load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div>
      <PageHeader
        title="Suppliers"
        urdu="سپلائر"
        subtitle="Vendors who supply raw rock and other materials."
        actions={
          <Button
            onClick={() => {
              setEdit(null);
              setForm(empty);
              setOpen(true);
            }}
            className="bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New Supplier
          </Button>
        }
      />

      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Supply</TableHead>
              <TableHead className="text-right">Balance Owed</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No suppliers yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const b = Number(r.current_balance ?? 0);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.phone ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.supply_type ?? "—"}</TableCell>
                    <TableCell className={`text-right ${b > 0 ? "text-destructive" : "text-success"}`}>
                      {PKR(b)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEdit(r);
                          setForm({
                            name: r.name,
                            phone: r.phone ?? "",
                            address: r.address ?? "",
                            supply_type: r.supply_type ?? "",
                            notes: r.notes ?? "",
                          });
                          setOpen(true);
                        }}
                      >
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
            <DialogTitle>{edit ? "Edit" : "New"} Supplier</DialogTitle>
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
                <Label>Supply Type</Label>
                <Input
                  value={form.supply_type}
                  onChange={(e) => setForm({ ...form, supply_type: e.target.value })}
                  placeholder="e.g. Raw rock"
                />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
