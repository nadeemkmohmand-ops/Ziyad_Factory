import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/settings/founders")({
  component: () => (
    <Protected>
      <Founders />
    </Protected>
  ),
});

interface F { id: string; name_urdu: string | null; name_english: string | null; designation_urdu: string | null; designation_english: string | null; photo_url: string | null; display_order: number | null }

const empty = { name_urdu: "", name_english: "", designation_urdu: "", designation_english: "", photo_url: "" };

function Founders() {
  const [rows, setRows] = useState<F[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await supabase.from("founders").select("*").order("display_order");
    setRows((data ?? []) as F[]);
  };
  useEffect(() => { void load(); }, []);

  const upload = async (file: File) => {
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("founder-photos").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("founder-photos").getPublicUrl(path);
    setForm({ ...form, photo_url: data.publicUrl });
  };

  const save = async () => {
    const { error } = await supabase.from("founders").insert({
      name_urdu: form.name_urdu || null, name_english: form.name_english || null,
      designation_urdu: form.designation_urdu || null, designation_english: form.designation_english || null,
      photo_url: form.photo_url || null, display_order: rows.length,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false); setForm(empty); void load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("founders").delete().eq("id", id);
    void load();
  };

  return (
    <div>
      <PageHeader title="Founders" urdu="بانیان"
        actions={<Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> Add</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((f) => (
          <Card key={f.id} className="overflow-hidden">
            {f.photo_url ? <img src={f.photo_url} className="aspect-square w-full object-cover" alt="" /> : <div className="aspect-square bg-muted" />}
            <div className="p-4">
              <div className="font-urdu text-xl text-primary">{f.name_urdu}</div>
              <div className="text-sm">{f.name_english}</div>
              <div className="font-urdu text-sm text-muted-foreground mt-1">{f.designation_urdu}</div>
              <Button size="sm" variant="ghost" onClick={() => del(f.id)} className="text-destructive mt-2"><Trash2 className="h-3 w-3" /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Founder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اردو نام</Label><Input className="font-urdu text-lg" dir="rtl" value={form.name_urdu} onChange={(e) => setForm({ ...form, name_urdu: e.target.value })} /></div>
            <div><Label>English Name</Label><Input value={form.name_english} onChange={(e) => setForm({ ...form, name_english: e.target.value })} /></div>
            <div><Label>عہدہ</Label><Input className="font-urdu" dir="rtl" value={form.designation_urdu} onChange={(e) => setForm({ ...form, designation_urdu: e.target.value })} /></div>
            <div><Label>Designation (English)</Label><Input value={form.designation_english} onChange={(e) => setForm({ ...form, designation_english: e.target.value })} /></div>
            <div>
              <Label>Photo</Label>
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              {form.photo_url && <img src={form.photo_url} className="h-20 mt-2 rounded" alt="" />}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-primary text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
