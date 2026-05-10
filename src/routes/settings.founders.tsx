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
import { Plus, Trash2, Star } from "lucide-react";

export const Route = createFileRoute("/settings/founders")({
  component: () => (<Protected><Founders /></Protected>),
});

interface F {
  id: string; name_urdu: string|null; name_english: string|null;
  designation_urdu: string|null; designation_english: string|null;
  photo_url: string|null; display_order: number|null;
}

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

  const seedZiyad = async () => {
    const { error } = await supabase.from("founders").insert({
      name_urdu: "زیاد خان",
      name_english: "Ziyad Khan",
      designation_urdu: "بانی",
      designation_english: "Founder",
      photo_url: null,
      display_order: 0,
    });
    if (error) return toast.error(error.message);
    toast.success("زیاد خان شامل ہو گئے / Ziyad Khan added");
    void load();
  };

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
    toast.success("محفوظ ہو گیا / Saved");
    setOpen(false); setForm(empty); void load();
  };

  const del = async (id: string) => {
    if (!confirm("کیا آپ واقعی حذف کرنا چاہتے ہیں؟ / Delete?")) return;
    await supabase.from("founders").delete().eq("id", id);
    void load();
  };

  return (
    <div>
      <PageHeader
        title="Founders"
        urdu="بانیان — المکہ فیکٹری"
        subtitle="Al-Makkah Factory — Founder: Ziyad Khan"
        actions={
          <div className="flex gap-2">
            {rows.length === 0 && (
              <Button variant="outline" onClick={seedZiyad} className="gap-2 font-urdu border-primary/40 text-primary">
                <Star className="h-4 w-4" /> زیاد خان شامل کریں
              </Button>
            )}
            <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground gap-2 font-urdu">
              <Plus className="h-4 w-4" /> نیا بانی
            </Button>
          </div>
        }
      />

      {rows.length === 0 && (
        <Card className="p-8 text-center border-primary/20">
          <Star className="h-12 w-12 text-primary/30 mx-auto mb-3" />
          <div className="font-urdu text-xl text-primary mb-2" style={{ direction: "rtl" }}>کوئی بانی نہیں</div>
          <p className="text-sm text-muted-foreground mb-4">No founders added yet. Add Ziyad Khan as Founder.</p>
          <Button onClick={seedZiyad} className="bg-primary text-primary-foreground font-urdu gap-2">
            <Star className="h-4 w-4" /> زیاد خان — بانی شامل کریں
          </Button>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((f) => (
          <Card key={f.id} className="overflow-hidden hover:border-primary/40 transition-colors">
            {f.photo_url
              ? <img src={f.photo_url} className="aspect-square w-full object-cover" alt="" />
              : (
                <div className="aspect-square bg-primary/5 grid place-items-center">
                  <div className="font-urdu text-6xl text-primary/20">{f.name_urdu?.[0] ?? "ز"}</div>
                </div>
              )
            }
            <div className="p-4">
              <div className="font-urdu text-2xl text-primary mb-0.5" style={{ direction: "rtl" }}>{f.name_urdu}</div>
              <div className="text-sm font-medium text-foreground">{f.name_english}</div>
              <div className="font-urdu text-sm text-muted-foreground mt-1" style={{ direction: "rtl" }}>{f.designation_urdu}</div>
              <div className="text-xs text-muted-foreground">{f.designation_english}</div>
              <Button size="sm" variant="ghost" onClick={() => del(f.id)} className="text-destructive mt-3 gap-1 font-urdu">
                <Trash2 className="h-3 w-3" /> حذف کریں
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <div className="font-urdu text-xl text-primary" style={{ direction: "rtl" }}>نیا بانی شامل کریں</div>
              <div className="text-sm text-muted-foreground">Add New Founder</div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="font-urdu">اردو نام</Label><Input className="font-urdu text-lg" dir="rtl" value={form.name_urdu} onChange={(e) => setForm({ ...form, name_urdu: e.target.value })} placeholder="زیاد خان" /></div>
            <div><Label>English Name</Label><Input value={form.name_english} onChange={(e) => setForm({ ...form, name_english: e.target.value })} placeholder="Ziyad Khan" /></div>
            <div><Label className="font-urdu">عہدہ (اردو)</Label><Input className="font-urdu" dir="rtl" value={form.designation_urdu} onChange={(e) => setForm({ ...form, designation_urdu: e.target.value })} placeholder="بانی" /></div>
            <div><Label>Designation (English)</Label><Input value={form.designation_english} onChange={(e) => setForm({ ...form, designation_english: e.target.value })} placeholder="Founder" /></div>
            <div>
              <Label className="font-urdu">تصویر / Photo</Label>
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              {form.photo_url && <img src={form.photo_url} className="h-20 mt-2 rounded" alt="" />}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="font-urdu">منسوخ</Button>
            <Button onClick={save} className="bg-primary text-primary-foreground font-urdu">محفوظ کریں</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
