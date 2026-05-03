import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PKR } from "@/lib/format";

export const Route = createFileRoute("/public")({
  head: () => ({
    meta: [
      { title: "ماربل مینیجر — About the Factory" },
      { name: "description", content: "Premium marble factory — founders, gallery, contact." },
      { property: "og:title", content: "ماربل مینیجر — About the Factory" },
      { property: "og:description", content: "Premium marble factory — founders, gallery, contact." },
    ],
  }),
  component: PublicPage,
});

interface Factory { name_urdu: string | null; name_english: string | null; address: string | null; established_year: number | null; description: string | null; logo_url: string | null }
interface Founder { id: string; name_urdu: string | null; name_english: string | null; designation_urdu: string | null; designation_english: string | null; photo_url: string | null }
interface Cat { id: string; name_urdu: string; name_english: string | null; price_per_sqft: number | null; show_price: boolean; description_urdu: string | null }
interface Photo { id: string; category_id: string | null; photo_url: string; caption_urdu: string | null }

function PublicPage() {
  const [factory, setFactory] = useState<Factory | null>(null);
  const [founders, setFounders] = useState<Founder[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    void (async () => {
      const [f, fo, c, p] = await Promise.all([
        supabase.from("factory_info").select("*").maybeSingle(),
        supabase.from("founders").select("*").eq("is_active", true).order("display_order"),
        supabase.from("marble_categories").select("*").eq("is_active", true),
        supabase.from("marble_photos").select("*").order("display_order"),
      ]);
      setFactory((f.data as Factory) ?? null);
      setFounders((fo.data ?? []) as Founder[]);
      setCats((c.data ?? []) as Cat[]);
      setPhotos((p.data ?? []) as Photo[]);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="marble-texture border-b border-primary/20">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          {factory?.logo_url && <img src={factory.logo_url} className="h-24 mx-auto mb-6 rounded-xl gold-shadow" alt="" />}
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="font-urdu text-5xl md:text-7xl text-primary leading-tight">
            {factory?.name_urdu ?? "ماربل مینیجر"}
          </motion.h1>
          <p className="font-display text-xl md:text-2xl text-foreground mt-3">{factory?.name_english}</p>
          {factory?.established_year && <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-2">Established {factory.established_year}</p>}
          {factory?.description && <p className="max-w-2xl mx-auto mt-6 text-muted-foreground">{factory.description}</p>}
          <div className="mt-8">
            <Link to="/login"><Button className="bg-primary text-primary-foreground">Staff Login</Button></Link>
          </div>
        </div>
      </section>

      {/* Founders */}
      {founders.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="font-urdu text-3xl text-primary text-center mb-2">بانیان اور مالکان</h2>
          <p className="text-center text-sm text-muted-foreground uppercase tracking-widest mb-10">Founders & Owners</p>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {founders.map((f) => (
              <motion.div key={f.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Card className="text-center p-6 bg-card/60 border-primary/20">
                  {f.photo_url
                    ? <img src={f.photo_url} className="h-32 w-32 mx-auto rounded-full object-cover ring-4 ring-primary/40" alt="" />
                    : <div className="h-32 w-32 mx-auto rounded-full bg-muted ring-4 ring-primary/40" />}
                  <div className="font-urdu text-2xl text-primary mt-4">{f.name_urdu}</div>
                  <div className="text-sm text-foreground">{f.name_english}</div>
                  <div className="font-urdu text-base text-muted-foreground mt-2">{f.designation_urdu}</div>
                  <div className="text-xs text-muted-foreground">{f.designation_english}</div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {cats.length > 0 && (
        <section className="border-t border-primary/10 bg-muted/10">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <h2 className="font-urdu text-3xl text-primary text-center mb-2">ماربل گیلری</h2>
            <p className="text-center text-sm text-muted-foreground uppercase tracking-widest mb-10">Marble Gallery</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cats.map((c) => {
                const cover = photos.find((p) => p.category_id === c.id);
                return (
                  <Card key={c.id} className="overflow-hidden bg-card/60 border-primary/20">
                    {cover ? <img src={cover.photo_url} className="aspect-[4/3] w-full object-cover" alt="" /> : <div className="aspect-[4/3] bg-muted" />}
                    <div className="p-4">
                      <div className="font-urdu text-xl text-primary">{c.name_urdu}</div>
                      <div className="text-sm">{c.name_english}</div>
                      {c.show_price && c.price_per_sqft != null && (
                        <div className="mt-2 text-primary font-semibold">{PKR(c.price_per_sqft)} <span className="text-xs text-muted-foreground">/ sqft</span></div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="border-t border-primary/10">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h2 className="font-urdu text-3xl text-primary mb-2">رابطہ</h2>
          <p className="text-sm uppercase tracking-widest text-muted-foreground mb-6">Contact</p>
          {factory?.address && <p className="text-foreground">{factory.address}</p>}
        </div>
      </section>
    </div>
  );
}
