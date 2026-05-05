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

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { profile, role, signOut, hasRole } = useAuth();

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
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.url} className="flex items-center gap-2 data-[active=true]:text-primary">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="font-urdu text-sm leading-tight">{item.title}</span>}
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
