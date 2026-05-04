import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShieldCheck,
  LogIn,
  ChevronDown,
  Gem,
  Factory,
  BarChart3,
  Users,
  Package,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "ماربل مینیجر — Marble Manager" },
      { name: "description", content: "Premium marble factory management system." },
    ],
  }),
  component: HomePage,
});

/* ─── tiny hook: count‑up animation ─── */
function useCountUp(target: number, duration = 1800) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      if (ref.current) ref.current.textContent = Math.floor(ease * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return ref;
}

/* ─── stat counter card ─── */
function StatCard({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  const ref = useCountUp(value);
  return (
    <div className="text-center">
      <div className="font-display text-4xl md:text-5xl text-primary font-bold">
        <span ref={ref}>0</span>
        <span>{suffix}</span>
      </div>
      <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

/* ─── marble vein SVG background ─── */
function MarbleVeins() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <filter id="turbulence">
        <feTurbulence type="turbulence" baseFrequency="0.012 0.008" numOctaves="4" seed="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="180" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <rect width="100%" height="100%" fill="none" stroke="#c9a84c" strokeWidth="1.5" filter="url(#turbulence)" />
      <rect width="100%" height="100%" fill="none" stroke="#c9a84c" strokeWidth="0.8" filter="url(#turbulence)" x="20" y="40" />
      <rect width="100%" height="100%" fill="none" stroke="#c9a84c" strokeWidth="0.5" filter="url(#turbulence)" x="-30" y="80" />
    </svg>
  );
}

/* ─── feature card ─── */
const features = [
  { icon: BarChart3, title: "Live Dashboard", urdu: "لائیو ڈیش بورڈ", desc: "Real-time KPIs: sales, receivables, stock, payroll — all at a glance." },
  { icon: Package, title: "Inventory Control", urdu: "اسٹاک کنٹرول", desc: "Track raw rock tonnes and finished marble across every category." },
  { icon: Users, title: "Workforce", urdu: "افرادی قوت", desc: "Labour attendance, salaries, and machine logs in one place." },
  { icon: Factory, title: "Production", urdu: "پیداوار", desc: "Log cutting batches, link raw rock to finished goods, zero guesswork." },
  { icon: Gem, title: "Marble Gallery", urdu: "ماربل گیلری", desc: "Public-facing gallery with categories, pricing, and beautiful photos." },
  { icon: ShieldCheck, title: "Role Security", urdu: "کردار سیکیورٹی", desc: "Admin full control. Staff access. Every action protected by RLS." },
];

/* ─── main component ─── */
function HomePage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  /* CTA buttons based on auth state */
  const renderCTA = () => {
    if (loading) return null;

    if (!user) {
      return (
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center mt-10">
          <Link to="/login">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-display text-base px-8 py-6 gap-2 gold-shadow">
              <LogIn className="h-5 w-5" />
              Staff Sign In
            </Button>
          </Link>
          <Link to="/public">
            <Button size="lg" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 font-display text-base px-8 py-6 gap-2">
              <Gem className="h-5 w-5" />
              View Gallery
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center mt-10">
        <Button
          size="lg"
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-display text-base px-8 py-6 gap-2 gold-shadow"
          onClick={() => navigate({ to: "/dashboard" })}
        >
          <LayoutDashboard className="h-5 w-5" />
          Staff Dashboard
        </Button>
        {role === "admin" && (
          <Button
            size="lg"
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10 font-display text-base px-8 py-6 gap-2"
            onClick={() => navigate({ to: "/settings/admin" })}
          >
            <ShieldCheck className="h-5 w-5" />
            Admin Panel
          </Button>
        )}
        <Link to="/public">
          <Button size="lg" variant="ghost" className="text-muted-foreground hover:text-primary font-display text-base px-6 py-6 gap-2">
            <Gem className="h-5 w-5" />
            Public Gallery
          </Button>
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* layered background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.32_0.10_255/0.5),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_80%_60%,oklch(0.74_0.13_85/0.07),transparent)]" />
        <MarbleVeins />

        {/* decorative gold horizontal lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* corner ornaments */}
        <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-primary/40 rounded-tl-sm" />
        <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-primary/40 rounded-tr-sm" />
        <div className="absolute bottom-16 left-6 w-12 h-12 border-l-2 border-b-2 border-primary/40 rounded-bl-sm" />
        <div className="absolute bottom-16 right-6 w-12 h-12 border-r-2 border-b-2 border-primary/40 rounded-br-sm" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 text-center px-4 max-w-5xl mx-auto">

          {/* badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs uppercase tracking-[0.3em] mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Factory Management System
          </motion.div>

          {/* Urdu headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-urdu text-6xl md:text-8xl lg:text-9xl text-primary leading-tight mb-2"
            style={{ direction: "rtl" }}
          >
            ماربل مینیجر
          </motion.h1>

          {/* English headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-display text-2xl md:text-3xl text-foreground/80 tracking-wide mt-2"
          >
            Marble Manager
          </motion.p>

          {/* tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed"
          >
            Complete factory operations — inventory, sales, workforce, and finance —
            built for the Pakistani marble industry.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
          >
            {renderCTA()}
          </motion.div>

        </motion.div>

        {/* scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-primary/40"
        >
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════ */}
      <section className="border-y border-primary/10 bg-card/40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-10">
          <StatCard value={15} label="Modules" suffix="+" />
          <StatCard value={20} label="DB Tables" suffix="+" />
          <StatCard value={100} label="RLS Secured" suffix="%" />
          <StatCard value={24} label="Uptime" suffix="/7" />
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES GRID
      ══════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">What's Inside</p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground">
            Everything Your Factory Needs
          </h2>
          <div className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4 }}
              className="group relative p-6 rounded-2xl border border-primary/10 bg-card/50 hover:border-primary/40 hover:bg-card/80 transition-all duration-300 overflow-hidden"
            >
              {/* hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_60%_60%_at_20%_20%,oklch(0.74_0.13_85/0.06),transparent)]" />

              <div className="relative">
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="font-urdu text-lg text-primary/70 mb-0.5" style={{ direction: "rtl" }}>{f.urdu}</div>
                <h3 className="font-display text-xl text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          ROLE CARDS — who gets what
      ══════════════════════════════════════ */}
      <section className="border-t border-primary/10 bg-card/20">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">Access Levels</p>
            <h2 className="font-display text-4xl text-foreground">Right Access, Right People</h2>
            <div className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">

            {/* Staff card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border border-primary/20 bg-card/60 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary mb-5">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div className="font-urdu text-xl text-primary/70 mb-1" style={{ direction: "rtl" }}>اسٹاف</div>
              <h3 className="font-display text-2xl text-foreground mb-3">Staff</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Staff Dashboard", "Inventory & Production", "Sales & Customers", "Attendance & Labour", "Reports"].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary/60 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {!user && (
                <Link to="/login">
                  <Button className="mt-6 w-full gap-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20">
                    <LogIn className="h-4 w-4" /> Sign In
                  </Button>
                </Link>
              )}
              {user && (
                <Button className="mt-6 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate({ to: "/dashboard" })}>
                  <ArrowRight className="h-4 w-4" /> Go to Dashboard
                </Button>
              )}
            </motion.div>

            {/* Admin card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border border-primary/40 bg-card/80 relative overflow-hidden gold-shadow"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/40 grid place-items-center text-primary mb-5">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="font-urdu text-xl text-primary/80 mb-1" style={{ direction: "rtl" }}>ایڈمن</div>
              <h3 className="font-display text-2xl text-foreground mb-3">
                Admin
                <span className="ml-2 text-xs uppercase tracking-widest text-primary font-sans border border-primary/30 px-2 py-0.5 rounded-full">Full Control</span>
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Everything in Staff", "Admin Panel & Settings", "User & Role Management", "Factory Info & Founders", "Price History & Backup"].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {role === "admin" ? (
                <Button className="mt-6 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 gold-shadow" onClick={() => navigate({ to: "/settings/admin" })}>
                  <ShieldCheck className="h-4 w-4" /> Admin Panel
                </Button>
              ) : (
                <div className="mt-6 text-xs text-center text-muted-foreground border border-primary/10 rounded-lg py-3 px-4">
                  Admin access assigned by the system administrator
                </div>
              )}
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer className="border-t border-primary/10 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-display font-bold text-sm gold-glow">
              م
            </div>
            <div>
              <div className="font-display text-sm text-primary">ماربل مینیجر</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Marble Manager</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/public" className="hover:text-primary transition-colors">Gallery</Link>
            <Link to="/login" className="hover:text-primary transition-colors">Login</Link>
            {user && <Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>}
            {role === "admin" && <Link to="/settings/admin" className="hover:text-primary transition-colors">Admin</Link>}
          </div>
        </div>
      </footer>

    </div>
  );
}
