/**
 * MobileBottomNav — Fixed bottom navigation bar for mobile screens.
 * Inspired by DigiKhata's 5-tab bottom nav pattern.
 * Shows on screens < 768px, hidden on desktop.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, LayoutDashboard, Package, Users, Menu,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ShoppingCart, Wallet, HardHat, Truck, Receipt, Layers,
  Factory, CalendarCheck, Banknote, Cog, BarChart3, Image as ImageIcon,
  Globe, ShieldCheck, UserCog, LogOut,
} from "lucide-react";

interface KPIs {
  salesPending: number;
  rawLowStock: boolean;
}

const bottomTabs = [
  { title: "ہوم", sub: "Home", url: "/home", icon: Home },
  { title: "ڈیش بورڈ", sub: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "اسٹاک", sub: "Stock", url: "/inventory/raw", icon: Package },
  { title: "پارٹی", sub: "Parties", url: "/customers", icon: Users },
  { title: "مزید", sub: "More", url: "__more__", icon: Menu },
];

const moreItems = [
  { group: "ماربل / Marble", items: [
    { title: "اقسام", url: "/marble/categories", icon: Layers },
    { title: "تصاویر", url: "/marble/photos", icon: ImageIcon },
    { title: "خام پتھر", url: "/inventory/raw", icon: Package },
    { title: "تیار اسٹاک", url: "/inventory/finished", icon: Package },
    { title: "پیداوار", url: "/production", icon: Factory },
  ]},
  { group: "فروخت اور مالیات / Sales & Finance", items: [
    { title: "گاہک", url: "/customers", icon: Users },
    { title: "سپلائر", url: "/suppliers", icon: Truck },
    { title: "سیلز آرڈر", url: "/sales", icon: ShoppingCart },
    { title: "ادائیگیاں", url: "/payments", icon: Wallet },
    { title: "قرض و ادھار", url: "/lending", icon: Banknote },
    { title: "اخراجات", url: "/expenses", icon: Receipt },
  ]},
  { group: "افرادی قوت / Workforce", items: [
    { title: "مزدور", url: "/labour", icon: HardHat },
    { title: "حاضری", url: "/attendance", icon: CalendarCheck },
    { title: "تنخواہیں", url: "/salaries", icon: Wallet },
    { title: "مشینیں", url: "/machines", icon: Cog },
  ]},
  { group: "رپورٹس / Reports", items: [
    { title: "رپورٹس", url: "/reports", icon: BarChart3 },
  ]},
];

export function MobileBottomNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { role, hasRole, signOut, profile } = useAuth();
  const [kpis, setKpis] = useState<KPIs>({ salesPending: 0, rawLowStock: false });

  useEffect(() => {
    const load = async () => {
      const [sales, raw] = await Promise.all([
        supabase.from("sales_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("raw_rock_inventory").select("quantity_tons"),
      ]);
      const totalRaw = (raw.data ?? []).reduce((s, r) => s + Number(r.quantity_tons ?? 0), 0);
      setKpis({ salesPending: sales.count ?? 0, rawLowStock: totalRaw < 5 });
    };
    void load();
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      <div className="grid grid-cols-5 h-16">
        {bottomTabs.map((tab) => {
          if (tab.url === "__more__") {
            return (
              <Sheet key={tab.url}>
                <SheetTrigger asChild>
                  <button className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors">
                    <tab.icon className="h-5 w-5" />
                    <span className="font-urdu text-[10px] leading-tight">{tab.title}</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl overflow-auto">
                  <SheetHeader>
                    <SheetTitle>
                      <div className="font-urdu text-xl text-primary" style={{ direction: "rtl" }}>
                        مینو / Menu
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    {moreItems.map((g) => (
                      <div key={g.group}>
                        <div className="font-urdu text-xs text-muted-foreground mb-2 px-1" style={{ direction: "rtl" }}>
                          {g.group}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {g.items.map((item) => {
                            const active = path === item.url || path.startsWith(item.url + "/");
                            return (
                              <Link
                                key={item.url}
                                to={item.url}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                                  active
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : "border-border/40 text-foreground hover:border-primary/30 hover:bg-card/80"
                                }`}
                              >
                                <item.icon className="h-5 w-5" />
                                <span className="font-urdu text-[10px] leading-tight text-center">{item.title}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Admin items */}
                    {hasRole("admin") && (
                      <div>
                        <div className="font-urdu text-xs text-muted-foreground mb-2 px-1" style={{ direction: "rtl" }}>
                          ترتیبات / Settings
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { title: "فیکٹری", url: "/settings/factory", icon: Factory },
                            { title: "بانیان", url: "/settings/founders", icon: Users },
                            { title: "صارفین", url: "/settings/users", icon: UserCog },
                            { title: "ایڈمن", url: "/settings/admin", icon: ShieldCheck },
                            { title: "عوامی", url: "/public", icon: Globe },
                          ].map((item) => (
                            <Link
                              key={item.url}
                              to={item.url}
                              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/40 text-foreground hover:border-primary/30 hover:bg-card/80 transition-all"
                            >
                              <item.icon className="h-5 w-5" />
                              <span className="font-urdu text-[10px] leading-tight text-center">{item.title}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Profile & Logout */}
                    <div className="border-t pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/40 grid place-items-center text-primary font-urdu text-lg">
                          {(profile?.full_name ?? "م").charAt(0)}
                        </div>
                        <div>
                          <div className="font-urdu text-sm font-medium" style={{ direction: "rtl" }}>
                            {profile?.full_name ?? "منتظم"}
                          </div>
                          <div className="text-[10px] text-primary uppercase">{role}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-destructive gap-1">
                        <LogOut className="h-4 w-4" />
                        <span className="font-urdu">لاگ آؤٹ</span>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            );
          }

          const active = path === tab.url || path.startsWith(tab.url + "/");
          return (
            <Link
              key={tab.url}
              to={tab.url}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                active ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
              <div className="relative">
                <tab.icon className="h-5 w-5" />
                {tab.url === "/dashboard" && kpis.salesPending > 0 && (
                  <div className="absolute -top-1 -right-2 h-3.5 w-3.5 rounded-full bg-warning text-[8px] text-warning-foreground grid place-items-center font-bold">
                    {kpis.salesPending > 9 ? "9+" : kpis.salesPending}
                  </div>
                )}
                {tab.url === "/inventory/raw" && kpis.rawLowStock && (
                  <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                )}
              </div>
              <span className="font-urdu text-[10px] leading-tight">{tab.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
