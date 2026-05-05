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
    label: "عمومی / Overview",
    items: [
      { title: "ہوم / Home", url: "/home", icon: Home },
      { title: "ڈیش بورڈ / Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "ماربل / Marble",
    items: [
      { title: "کیٹگریز / Categories", url: "/marble/categories", icon: Layers },
      { title: "تصاویر / Photos", url: "/marble/photos", icon: ImageIcon },
      { title: "خام پتھر / Raw Rock", url: "/inventory/raw", icon: Package },
      { title: "تیار اسٹاک / Finished Stock", url: "/inventory/finished", icon: Package },
      { title: "پیداوار / Production", url: "/production", icon: Factory },
    ],
  },
  {
    label: "سیلز اور مالیات / Sales & Finance",
    items: [
      { title: "گاہک / Customers", url: "/customers", icon: Users },
      { title: "سپلائر / Suppliers", url: "/suppliers", icon: Truck },
      { title: "سیلز آرڈر / Sales Orders", url: "/sales", icon: ShoppingCart },
      { title: "ادائیگیاں / Payments", url: "/payments", icon: Wallet },
      { title: "قرض / Lending & Borrow", url: "/lending", icon: Banknote },
      { title: "اخراجات / Expenses", url: "/expenses", icon: Receipt },
    ],
  },
  {
    label: "افرادی قوت / Workforce",
    items: [
      { title: "مزدور / Labour", url: "/labour", icon: HardHat },
      { title: "حاضری / Attendance", url: "/attendance", icon: CalendarCheck },
      { title: "تنخواہیں / Salaries", url: "/salaries", icon: Wallet },
      { title: "مشینیں / Machines", url: "/machines", icon: Cog },
    ],
  },
  {
    label: "رپورٹس / Reports",
    items: [
      { title: "رپورٹس / Reports", url: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "سیٹنگز / Settings",
    items: [
      { title: "فیکٹری معلومات / Factory Info", url: "/settings/factory", icon: Factory, adminOnly: true },
      { title: "بانی / Founders", url: "/settings/founders", icon: Users, adminOnly: true },
      { title: "صارفین / Users & Roles", url: "/settings/users", icon: UserCog, adminOnly: true },
      { title: "ایڈمن پینل / Admin Panel", url: "/settings/admin", icon: ShieldCheck, adminOnly: true },
      { title: "عوامی صفحہ / Public Page", url: "/public", icon: Globe },
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
            <div className="leading-tight">
              <div className="font-urdu text-base font-semibold text-primary">المدینہ فیکٹری</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Al-Madina Factory
              </div>
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
          {!collapsed && <span className="ml-2 font-urdu">لاگ آؤٹ / Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
