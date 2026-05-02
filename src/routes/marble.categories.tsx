import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PKR, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ImagePlus, X, Upload } from "lucide-react";

export const Route = createFileRoute("/marble/categories")({
  component: () => (
    <Protected>
      <Categories />
    </Protected>
  ),
});

interface Category {
  id: string;
  name_urdu: string;
  name_english: string | null;
  description_urdu: string | null;
  price_per_sqft: number | null;
  price_per_slab: number | null;
  unit: string;
  is_active: boolean | null;
  created_at: string;
}

interface Photo {
  id: string;
  category_id: string | null;
  photo_url: string;
  caption_urdu: string | null;
  display_order: number | null;
}

const empty = {
  name_urdu: "",
  name_english: "",
  description_urdu: "",
  price_per_sqft: "",
  price_per_slab: "",
  unit: "sqft",
};

function Categories() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [cats, setCats] = useState<Category[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Category | null>(null);
  const [form, setForm] = useState(empty);
  const [galleryFor, setGalleryFor] = useState<Category | null>(null);

  const load = async () => {
    const [c, p] = await Promise.all([
      supabase.from("marble_categories").select("*").order("created_at", { ascending: false }),
      supabase.from("marble_photos").select("*").order("display_order"),
    ]);
    setCats((c.data ?? []) as Category[]);
    setPhotos((p.data ?? []) as Photo[]);
  };
  useEffect(() => {
    void load();
  }, []);

  const startEdit = (c: Category) => {
    setEdit(c);
    setForm({
      name_urdu: c.name_urdu,
      name_english: c.name_english ?? "",
      description_urdu: c.description_urdu ?? "",
      price_per_sqft: String(c.price_per_sqft ?? ""),
      price_per_slab: String(c.price_per_slab ?? ""),
      unit: c.unit ?? "sqft",
    });
    setOpen(true);
  };

  const startNew = () => {
    setEdit(null);
    setForm(empty);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name_urdu.trim()) return toast.error("Urdu name required");
    const payload = {
      name_urdu: form.name_urdu,
      name_english: form.name_english || null,
      description_urdu: form.description_urdu || null,
      price_per_sqft: form.price_per_sqft ? Number(form.price_per_sqft) : null,
      price_per_slab: form.price_per_slab ? Number(form.price_per_slab) : null,
      unit: form.unit,
    };
    const { error } = edit
      ? await supabase.from("marble_categories").update(payload).eq("id", edit.id)
      : await supabase.from("marble_categories").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Updated" : "Category added");
    setOpen(false);
    void load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("marble_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void load();
  };

  const toggleActive = async (c: Category) => {
    const { error } = await supabase
      .from("marble_categories")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div>
      <PageHeader
        title="Marble Categories"
        urdu="ماربل کیٹیگریز"
        subtitle="Manage marble varieties, prices and gallery photos."
        actions={
          isAdmin && (
            <Button onClick={startNew} className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" /> New Category
            </Button>
          )
        }
      />

      {cats.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          No categories yet. Click "New Category" to add the first one.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cats.map((c) => {
            const cphotos = photos.filter((p) => p.category_id === c.id);
            return (
              <Card key={c.id} className="overflow-hidden border-border/60 hover:border-primary/40 transition">
                <div className="aspect-video bg-muted relative">
                  {cphotos[0] ? (
                    <img src={cphotos[0].photo_url} alt={c.name_english ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground">
                      <ImagePlus className="h-10 w-10 opacity-30" />
                    </div>
                  )}
                  <Badge
                    className={`absolute top-2 right-2 ${c.is_active ? "bg-success/30 text-success border-success/50" : "bg-muted text-muted-foreground"}`}
                  >
                    {c.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {cphotos.length > 1 && (
                    <Badge className="absolute bottom-2 right-2 bg-black/60 backdrop-blur">
                      +{cphotos.length - 1} photos
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-urdu text-2xl text-primary leading-none mb-1">{c.name_urdu}</div>
                  <div className="text-sm text-foreground">{c.name_english ?? "—"}</div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Per sqft</div>
                      <div className="font-medium">{PKR(c.price_per_sqft)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Per slab</div>
                      <div className="font-medium">{PKR(c.price_per_slab)}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2">Updated {fmtDate(c.created_at)}</div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => startEdit(c)}>
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setGalleryFor(c)}>
                        <ImagePlus className="h-3 w-3" /> Photos
                      </Button>
                      <div className="flex items-center gap-1 ml-auto">
                        <Switch checked={!!c.is_active} onCheckedChange={() => toggleActive(c)} />
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => del(c.id)} className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{edit ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اردو نام (Urdu Name) *</Label>
              <Input
                className="font-urdu text-lg"
                dir="rtl"
                value={form.name_urdu}
                onChange={(e) => setForm({ ...form, name_urdu: e.target.value })}
              />
            </div>
            <div>
              <Label>English name</Label>
              <Input
                value={form.name_english}
                onChange={(e) => setForm({ ...form, name_english: e.target.value })}
              />
            </div>
            <div>
              <Label>تفصیل (Description Urdu)</Label>
              <Textarea
                className="font-urdu"
                dir="rtl"
                value={form.description_urdu}
                onChange={(e) => setForm({ ...form, description_urdu: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Price/sqft</Label>
                <Input
                  type="number"
                  value={form.price_per_sqft}
                  onChange={(e) => setForm({ ...form, price_per_sqft: e.target.value })}
                />
              </div>
              <div>
                <Label>Price/slab</Label>
                <Input
                  type="number"
                  value={form.price_per_slab}
                  onChange={(e) => setForm({ ...form, price_per_slab: e.target.value })}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sqft">sqft</SelectItem>
                    <SelectItem value="slab">slab</SelectItem>
                    <SelectItem value="piece">piece</SelectItem>
                  </SelectContent>
                </Select>
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

      {galleryFor && (
        <GalleryDialog
          category={galleryFor}
          photos={photos.filter((p) => p.category_id === galleryFor.id)}
          onClose={() => {
            setGalleryFor(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function GalleryDialog({
  category,
  photos,
  onClose,
}: {
  category: Category;
  photos: Photo[];
  onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (files: File[]) => {
      setUploading(true);
      for (const file of files) {
        const path = `${category.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("marble-photos").upload(path, file);
        if (upErr) {
          toast.error(upErr.message);
          continue;
        }
        const { data } = supabase.storage.from("marble-photos").getPublicUrl(path);
        const { error: insErr } = await supabase.from("marble_photos").insert({
          category_id: category.id,
          photo_url: data.publicUrl,
          display_order: photos.length,
        });
        if (insErr) toast.error(insErr.message);
      }
      setUploading(false);
      toast.success("Uploaded");
      onClose();
    },
    [category.id, photos.length, onClose],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
  });

  const removePhoto = async (id: string) => {
    const { error } = await supabase.from("marble_photos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    onClose();
  };

  const updateCaption = async (id: string, caption: string) => {
    await supabase.from("marble_photos").update({ caption_urdu: caption }).eq("id", id);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            <span className="font-urdu text-xl text-primary mr-2">{category.name_urdu}</span>
            Photos
          </DialogTitle>
        </DialogHeader>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="text-sm">
            {uploading ? "Uploading…" : "Drag & drop images here, or click to select"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-h-96 overflow-auto">
          {photos.map((p) => (
            <div key={p.id} className="relative group">
              <img src={p.photo_url} className="w-full aspect-square object-cover rounded-lg" alt="" />
              <button
                onClick={() => removePhoto(p.id)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground grid place-items-center opacity-0 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
              <Input
                defaultValue={p.caption_urdu ?? ""}
                onBlur={(e) => updateCaption(p.id, e.target.value)}
                className="font-urdu mt-1 text-xs h-7"
                dir="rtl"
                placeholder="کیپشن"
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
