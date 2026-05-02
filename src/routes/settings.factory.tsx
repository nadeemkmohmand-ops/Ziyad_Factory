import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/factory")({
  component: () => (
    <Protected>
      <Factory />
    </Protected>
  ),
});

function Factory() {
  const [id, setId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name_urdu: "", name_english: "", address: "",
    established_year: "", description: "", logo_url: "",
  });

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("factory_info").select("*").maybeSingle();
      if (data) {
        setId(data.id);
        setForm({
          name_urdu: data.name_urdu ?? "",
          name_english: data.name_english ?? "",
          address: data.address ?? "",
          established_year: String(data.established_year ?? ""),
          description: data.description ?? "",
          logo_url: data.logo_url ?? "",
        });
      }
    })();
  }, []);

  const save = async () => {
    const payload = {
      name_urdu: form.name_urdu || null,
      name_english: form.name_english || null,
      address: form.address || null,
      established_year: form.established_year ? Number(form.established_year) : null,
      description: form.description || null,
      logo_url: form.logo_url || null,
    };
    const { error } = id
      ? await supabase.from("factory_info").update(payload).eq("id", id)
      : await supabase.from("factory_info").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  const upload = async (file: File) => {
    const path = `logo-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("factory-assets").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("factory-assets").getPublicUrl(path);
    setForm({ ...form, logo_url: data.publicUrl });
  };

  return (
    <div>
      <PageHeader title="Factory Info" urdu="فیکٹری معلومات" />
      <Card className="p-6 max-w-2xl space-y-4">
        <div>
          <Label>اردو نام</Label>
          <Input className="font-urdu text-lg" dir="rtl" value={form.name_urdu} onChange={(e) => setForm({ ...form, name_urdu: e.target.value })} />
        </div>
        <div><Label>English Name</Label><Input value={form.name_english} onChange={(e) => setForm({ ...form, name_english: e.target.value })} /></div>
        <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Established Year</Label><Input type="number" value={form.established_year} onChange={(e) => setForm({ ...form, established_year: e.target.value })} /></div>
          <div>
            <Label>Logo</Label>
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            {form.logo_url && <img src={form.logo_url} className="h-16 mt-2 rounded" alt="logo" />}
          </div>
        </div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <Button onClick={save} className="bg-primary text-primary-foreground">Save</Button>
      </Card>
    </div>
  );
}
