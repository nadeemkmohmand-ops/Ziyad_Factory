import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Layers, Users, Truck, ShoppingCart, Wallet,
  HardHat, CalendarCheck, Receipt, Banknote, Cog, Factory, Image as ImageIcon,
  UserCog, LogOut, BarChart3, ShieldCheck, Globe, Home,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface KPIs {
  suppliers: number;
  labour: number;
  salesPending: number;
  attendanceAbsent: number;
  paymentsOverdue: number;
  rawLowStock: boolean;
  finishedLowStock: number;
}

function useSidebarKPIs() {
  const [kpis, setKpis] = useState<KPIs>({
    suppliers: 0, labour: 0, salesPending: 0, attendanceAbsent: 0,
    paymentsOverdue: 0, rawLowStock: false, finishedLowStock: 0,
  });

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [sup, lab, sales, att, fin, raw] = await Promise.all([
      supabase.from("suppliers").select("id", { count: "exact", head: true }),
      supabase.from("labour").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("sales_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", today).eq("status", "absent"),
      supabase.from("finished_marble_inventory").select("id", { count: "exact", head: true }).eq("stock_status", "low_stock"),
      supabase.from("raw_rock_inventory").select("quantity_tons"),
    ]);
    const totalRaw = (raw.data ?? []).reduce((s, r) => s + Number(r.quantity_tons ?? 0), 0);
    setKpis({
      suppliers: sup.count ?? 0,
      labour: lab.count ?? 0,
      salesPending: sales.count ?? 0,
      attendanceAbsent: att.count ?? 0,
      paymentsOverdue: 0,
      rawLowStock: totalRaw < 5,
      finishedLowStock: fin.count ?? 0,
    });
  };

  useEffect(() => {
    void load();
    // Realtime subscriptions
    const ch = supabase.channel("sidebar-kpi")
      .on("postgres_changes", { event: "*", schema: "public", table: "suppliers" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "labour" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "finished_marble_inventory" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "raw_rock_inventory" }, load)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  return kpis;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { profile, role, signOut, hasRole } = useAuth();
  const kpis = useSidebarKPIs();

  const getBadge = (url: string) => {
    if (collapsed) return null;
    if (url === "/suppliers" && kpis.suppliers > 0)
      return <Badge className="ml-auto text-[10px] h-5 bg-primary/20 text-primary border-primary/30">{kpis.suppliers}</Badge>;
    if (url === "/labour" && kpis.labour > 0)
      return <Badge className="ml-auto text-[10px] h-5 bg-primary/20 text-primary border-primary/30">{kpis.labour}</Badge>;
    if (url === "/sales" && kpis.salesPending > 0)
      return <Badge className="ml-auto text-[10px] h-5 bg-warning/20 text-warning border-warning/30">{kpis.salesPending}</Badge>;
    if (url === "/attendance" && kpis.attendanceAbsent > 0)
      return <Badge className="ml-auto text-[10px] h-5 bg-destructive/20 text-destructive border-destructive/30">{kpis.attendanceAbsent}</Badge>;
    if (url === "/inventory/raw" && kpis.rawLowStock)
      return <Badge className="ml-auto text-[10px] h-5 bg-amber-500/20 text-amber-400 border-amber-500/30">!</Badge>;
    if (url === "/inventory/finished" && kpis.finishedLowStock > 0)
      return <Badge className="ml-auto text-[10px] h-5 bg-amber-500/20 text-amber-400 border-amber-500/30">{kpis.finishedLowStock}</Badge>;
    return null;
  };

  const groups = [
    {
      label: "عمومی",
      items: [
        { title: "ہوم", url: "/home", icon: Home },
        { title: "ڈیش بورڈ", url: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "ماربل",
      items: [
        { title: "اقسام", url: "/marble/categories", icon: Layers },
        { title: "تصاویر", url: "/marble/photos", icon: ImageIcon },
        { title: "خام پتھر", url: "/inventory/raw", icon: Package },
        { title: "تیار اسٹاک", url: "/inventory/finished", icon: Package },
        { title: "پیداوار", url: "/production", icon: Factory },
      ],
    },
    {
      label: "فروخت اور مالیات",
      items: [
        { title: "گاہک", url: "/customers", icon: Users },
        { title: "سپلائر", url: "/suppliers", icon: Truck },
        { title: "فروخت کے آرڈر", url: "/sales", icon: ShoppingCart },
        { title: "ادائیگیاں", url: "/payments", icon: Wallet },
        { title: "قرض و ادھار", url: "/lending", icon: Banknote },
        { title: "اخراجات", url: "/expenses", icon: Receipt },
      ],
    },
    {
      label: "افرادی قوت",
      items: [
        { title: "مزدور", url: "/labour", icon: HardHat },
        { title: "حاضری", url: "/attendance", icon: CalendarCheck },
        { title: "تنخواہیں", url: "/salaries", icon: Wallet },
        { title: "مشینیں", url: "/machines", icon: Cog },
      ],
    },
    {
      label: "رپورٹس",
      items: [
        { title: "رپورٹس", url: "/reports", icon: BarChart3 },
      ],
    },
    {
      label: "ترتیبات",
      items: [
        { title: "فیکٹری معلومات", url: "/settings/factory", icon: Factory, adminOnly: true },
        { title: "بانیان", url: "/settings/founders", icon: Users, adminOnly: true },
        { title: "صارفین و کردار", url: "/settings/users", icon: UserCog, adminOnly: true },
        { title: "ایڈمن پینل", url: "/settings/admin", icon: ShieldCheck, adminOnly: true },
        { title: "عوامی صفحہ", url: "/public", icon: Globe },
      ],
    },
  ] as const;

  return (
    <Sidebar collapsible="icon" className="marble-texture border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-display font-bold text-lg gold-glow">
            م
          </div>
          {!collapsed && (
            <div className="leading-tight text-right" dir="rtl">
              <div className="font-urdu text-lg font-semibold text-primary">المکہ فیکٹری</div>
              <div className="font-urdu text-[11px] text-muted-foreground">ماربل مینیجر</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel className="font-urdu text-xs">{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.filter((it) => !("adminOnly" in it && it.adminOnly) || hasRole("admin")).map((item) => {
                  const active = path === item.url || path.startsWith(item.url + "/");
                  const badge = getBadge(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.url} className="flex items-center gap-2 data-[active=true]:text-primary">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && (
                            <>
                              <span className="font-urdu text-sm leading-tight flex-1">{item.title}</span>
                              {badge}
                            </>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-2 text-xs">
            <div className="font-medium text-foreground">{profile.full_name ?? "User"}</div>
            <div className="uppercase tracking-wider text-[10px] text-primary">{role}</div>
          </div>
        )}
        <Button
          variant="ghost" size="sm"
          className="w-full justify-start text-muted-foreground hover:text-primary"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2 font-urdu">لاگ آؤٹ</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
