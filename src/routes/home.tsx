import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, PKR } from "@/lib/format";
import {
  LayoutDashboard, ShieldCheck, LogIn, ChevronDown, Gem, Factory,
  BarChart3, Users, Package, ArrowRight, Clock, ShoppingCart, Wallet, HardHat,
} from "lucide-react";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "المدینہ فیکٹری — Al-Madina Factory" },
      { name: "description", content: "Premium marble factory management system." },
    ],
  }),
  component: HomePage,
});

interface Activity {
  id: string; type: "sale"|"payment"|"expense"|"labour";
  label: string; urdu: string; amount?: number; date: string; badge?: string;
}

function MarbleVeins() {
  return (
    <svg aria-hidden className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]"
      xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
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

const features = [
  { icon: BarChart3, title: "Live Dashboard", urdu: "لائیو ڈیش بورڈ", desc: "حقیقی وقت کے KPIs: سیلز، وصولیاں، اسٹاک، تنخواہ — سب ایک نظر میں۔" },
  { icon: Package, title: "Inventory Control", urdu: "اسٹاک کنٹرول", desc: "خام پتھر اور تیار ماربل کا ہر کیٹگری میں ریکارڈ رکھیں۔" },
  { icon: Users, title: "Workforce", urdu: "افرادی قوت", desc: "مزدوروں کی حاضری، تنخواہیں، اور مشین لاگ ایک جگہ۔" },
  { icon: Factory, title: "Production", urdu: "پیداوار", desc: "کٹنگ بیچ ریکارڈ کریں، خام پتھر کو تیار مال سے جوڑیں۔" },
  { icon: Gem, title: "Marble Gallery", urdu: "ماربل گیلری", desc: "عوامی گیلری جس میں کیٹگریز، قیمتیں اور خوبصورت تصاویر ہیں۔" },
  { icon: ShieldCheck, title: "Role Security", urdu: "کردار سیکیورٹی", desc: "ایڈمن کا مکمل کنٹرول۔ اسٹاف کی محدود رسائی۔ ہر عمل محفوظ۔" },
];

const activityIcon = { sale: ShoppingCart, payment: Wallet, expense: BarChart3, labour: HardHat };
const activityColor = {
  sale: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  payment: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  expense: "bg-red-500/10 text-red-400 border-red-500/20",
  labour: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

function HomePage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => { void loadActivity(); }, []);

  const loadActivity = async () => {
    const [sales, payments, expenses] = await Promise.all([
      supabase.from("sales_orders").select("id,order_number,total_amount,order_date,status").order("created_at",{ascending:false}).limit(5),
      supabase.from("payments").select("id,amount,payment_type,payment_date").order("created_at",{ascending:false}).limit(4),
      supabase.from("expenses").select("id,amount,category,expense_date").order("created_at",{ascending:false}).limit(3),
    ]);
    const list: Activity[] = [];
    (sales.data??[]).forEach(o=>list.push({id:`sale-${o.id}`,type:"sale",label:`آرڈر ${o.order_number??o.id.slice(0,8)}`,urdu:`فروخت آرڈر`,amount:o.total_amount??0,date:o.order_date??"",badge:o.status??undefined}));
    (payments.data??[]).forEach(p=>list.push({id:`pay-${p.id}`,type:"payment",label:`Payment ${p.payment_type??""}`,urdu:`ادائیگی`,amount:p.amount??0,date:p.payment_date??""}));
    (expenses.data??[]).forEach(e=>list.push({id:`exp-${e.id}`,type:"expense",label:`Expense — ${e.category??"Other"}`,urdu:`خرچ`,amount:e.amount??0,date:e.expense_date??""}));
    list.sort((a,b)=>b.date>a.date?1:-1);
    setActivities(list.slice(0,10));
  };

  const renderCTA = () => {
    if (loading) return null;
    if (!user) return (
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center mt-10">
        <Link to="/login"><Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-display text-base px-8 py-6 gap-2 gold-shadow"><LogIn className="h-5 w-5"/>داخل ہوں / Sign In</Button></Link>
        <Link to="/public"><Button size="lg" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 font-display text-base px-8 py-6 gap-2"><Gem className="h-5 w-5"/>گیلری / Gallery</Button></Link>
      </div>
    );
    return (
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center mt-10">
        <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-display text-base px-8 py-6 gap-2 gold-shadow" onClick={()=>navigate({to:"/dashboard"})}><LayoutDashboard className="h-5 w-5"/>ڈیش بورڈ / Dashboard</Button>
        {role==="admin"&&<Button size="lg" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 font-display text-base px-8 py-6 gap-2" onClick={()=>navigate({to:"/settings/admin"})}><ShieldCheck className="h-5 w-5"/>ایڈمن پینل / Admin</Button>}
        <Link to="/public"><Button size="lg" variant="ghost" className="text-muted-foreground hover:text-primary font-display text-base px-6 py-6 gap-2"><Gem className="h-5 w-5"/>عوامی گیلری</Button></Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.32_0.10_255/0.5),transparent)]"/>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_80%_60%,oklch(0.74_0.13_85/0.07),transparent)]"/>
        <MarbleVeins/>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"/>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"/>
        <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-primary/40 rounded-tl-sm"/>
        <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-primary/40 rounded-tr-sm"/>
        <div className="absolute bottom-16 left-6 w-12 h-12 border-l-2 border-b-2 border-primary/40 rounded-bl-sm"/>
        <div className="absolute bottom-16 right-6 w-12 h-12 border-r-2 border-b-2 border-primary/40 rounded-br-sm"/>

        <motion.div style={{y:heroY,opacity:heroOpacity}} className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} transition={{duration:0.6}} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs uppercase tracking-[0.3em] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/>فیکٹری مینجمنٹ سسٹم — Factory Management System
          </motion.div>

          <motion.h1 initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.7,delay:0.1}} className="font-urdu text-6xl md:text-8xl lg:text-9xl text-primary leading-tight mb-2" style={{direction:"rtl"}}>
            المدینہ فیکٹری
          </motion.h1>
          <motion.p initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.7,delay:0.2}} className="font-display text-2xl md:text-3xl text-foreground/80 tracking-wide mt-2">
            Al-Madina Factory
          </motion.p>
          <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.7,delay:0.3}} className="mt-3 font-urdu text-xl text-primary/70" style={{direction:"rtl"}}>
            شریک بانی: زیاد خان
          </motion.p>
          <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.7,delay:0.35}} className="text-xs tracking-widest text-muted-foreground uppercase">
            Co-Founder: Ziyad Khan
          </motion.p>
          <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.8,delay:0.4}} className="mt-6 text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed font-urdu" style={{direction:"rtl"}}>
            مکمل فیکٹری آپریشنز — اسٹاک، سیلز، افرادی قوت، اور مالیات — پاکستانی ماربل انڈسٹری کے لیے بنایا گیا۔
          </motion.p>
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.7,delay:0.55}}>{renderCTA()}</motion.div>
        </motion.div>

        <motion.div animate={{y:[0,8,0]}} transition={{repeat:Infinity,duration:2}} className="absolute bottom-8 left-1/2 -translate-x-1/2 text-primary/40">
          <ChevronDown className="h-6 w-6"/>
        </motion.div>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="border-y border-primary/10 bg-card/40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-5 w-5 text-primary"/>
            <div>
              <div className="font-urdu text-xl text-primary" style={{direction:"rtl"}}>حالیہ سرگرمی</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Recent Activity</div>
            </div>
          </div>
          {activities.length===0?(
            <div className="text-sm text-muted-foreground text-center py-8 font-urdu">ابھی کوئی سرگرمی نہیں — No activity yet.</div>
          ):(
            <div className="space-y-2">
              {activities.map((a,i)=>{
                const Icon=activityIcon[a.type];
                return(
                  <motion.div key={a.id} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:border-primary/30 bg-background/50 hover:bg-card/80 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg border grid place-items-center shrink-0 ${activityColor[a.type]}`}><Icon className="h-4 w-4"/></div>
                      <div className="min-w-0">
                        <div className="font-urdu text-sm text-foreground" style={{direction:"rtl"}}>{a.urdu}</div>
                        <div className="text-xs text-muted-foreground truncate">{a.label}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {a.amount!==undefined&&<div className="text-sm font-medium text-primary">{PKR(a.amount)}</div>}
                      {a.badge&&<Badge variant="outline" className="text-[10px]">{a.badge}</Badge>}
                      <div className="text-xs text-muted-foreground hidden sm:block">{fmtDate(a.date)}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">اندر کیا ہے / What's Inside</p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground">آپ کی فیکٹری کی ہر ضرورت</h2>
          <p className="text-muted-foreground mt-2">Everything Your Factory Needs</p>
          <div className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto"/>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f,i)=>(
            <motion.div key={f.title} initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:"-60px"}} transition={{delay:i*0.07}} whileHover={{y:-4}} className="group relative p-6 rounded-2xl border border-primary/10 bg-card/50 hover:border-primary/40 hover:bg-card/80 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_60%_60%_at_20%_20%,oklch(0.74_0.13_85/0.06),transparent)]"/>
              <div className="relative">
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary mb-4 group-hover:bg-primary/20 transition-colors"><f.icon className="h-5 w-5"/></div>
                <div className="font-urdu text-xl text-primary mb-0.5" style={{direction:"rtl"}}>{f.urdu}</div>
                <h3 className="font-display text-lg text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-urdu" style={{direction:"rtl"}}>{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ROLE CARDS */}
      <section className="border-t border-primary/10 bg-card/20">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">رسائی کی سطح / Access Levels</p>
            <h2 className="font-display text-4xl text-foreground">صحیح رسائی، صحیح لوگ</h2>
            <p className="text-muted-foreground mt-1">Right Access, Right People</p>
            <div className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto"/>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <motion.div initial={{opacity:0,x:-30}} whileInView={{opacity:1,x:0}} viewport={{once:true}} className="p-8 rounded-2xl border border-primary/20 bg-card/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"/>
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary mb-5"><LayoutDashboard className="h-6 w-6"/></div>
              <div className="font-urdu text-2xl text-primary/70 mb-1" style={{direction:"rtl"}}>اسٹاف</div>
              <h3 className="font-display text-xl text-foreground mb-3">Staff</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[{ur:"ڈیش بورڈ",en:"Dashboard"},{ur:"اسٹاک اور پیداوار",en:"Inventory & Production"},{ur:"سیلز اور گاہک",en:"Sales & Customers"},{ur:"حاضری اور مزدور",en:"Attendance & Labour"},{ur:"رپورٹس",en:"Reports"}].map(item=>(
                  <li key={item.en} className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary/60 shrink-0"/><span className="font-urdu">{item.ur}</span><span className="text-xs opacity-50">/ {item.en}</span></li>
                ))}
              </ul>
              {!user&&<Link to="/login"><Button className="mt-6 w-full gap-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"><LogIn className="h-4 w-4"/>داخل ہوں / Sign In</Button></Link>}
              {user&&<Button className="mt-6 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={()=>navigate({to:"/dashboard"})}><ArrowRight className="h-4 w-4"/>ڈیش بورڈ / Dashboard</Button>}
            </motion.div>

            <motion.div initial={{opacity:0,x:30}} whileInView={{opacity:1,x:0}} viewport={{once:true}} className="p-8 rounded-2xl border border-primary/40 bg-card/80 relative overflow-hidden gold-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2"/>
              <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/40 grid place-items-center text-primary mb-5"><ShieldCheck className="h-6 w-6"/></div>
              <div className="font-urdu text-2xl text-primary/80 mb-1" style={{direction:"rtl"}}>ایڈمن</div>
              <h3 className="font-display text-xl text-foreground mb-3">Admin <span className="ml-2 text-xs uppercase tracking-widest text-primary font-sans border border-primary/30 px-2 py-0.5 rounded-full">مکمل کنٹرول</span></h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[{ur:"اسٹاف جیسا سب کچھ",en:"Everything in Staff"},{ur:"ایڈمن پینل اور سیٹنگز",en:"Admin Panel & Settings"},{ur:"صارف اور کردار مینجمنٹ",en:"User & Role Management"},{ur:"فیکٹری معلومات اور بانی",en:"Factory Info & Founders"},{ur:"قیمت کی تاریخ اور بیک اپ",en:"Price History & Backup"}].map(item=>(
                  <li key={item.en} className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary shrink-0"/><span className="font-urdu">{item.ur}</span><span className="text-xs opacity-50">/ {item.en}</span></li>
                ))}
              </ul>
              {role==="admin"?(<Button className="mt-6 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 gold-shadow" onClick={()=>navigate({to:"/settings/admin"})}><ShieldCheck className="h-4 w-4"/>ایڈمن پینل / Admin Panel</Button>):(
                <div className="mt-6 text-xs text-center text-muted-foreground border border-primary/10 rounded-lg py-3 px-4 font-urdu">ایڈمن رسائی سسٹم ایڈمنسٹریٹر کی طرف سے دی جاتی ہے</div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-primary/10 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-display font-bold text-sm gold-glow">م</div>
            <div>
              <div className="font-urdu text-sm text-primary">المدینہ فیکٹری</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Al-Madina Factory · Ziyad Khan</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/public" className="hover:text-primary transition-colors">گیلری / Gallery</Link>
            <Link to="/login" className="hover:text-primary transition-colors">لاگ ان / Login</Link>
            {user&&<Link to="/dashboard" className="hover:text-primary transition-colors">ڈیش بورڈ / Dashboard</Link>}
            {role==="admin"&&<Link to="/settings/admin" className="hover:text-primary transition-colors">ایڈمن / Admin</Link>}
          </div>
        </div>
      </footer>
    </div>
  );
}
