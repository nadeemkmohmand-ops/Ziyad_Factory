import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Layers,
  Users,
  Truck,
  ShoppingCart,
  Wallet,
  HardHat,
  CalendarCheck,
  Receipt,
  Banknote,
  Cog,
  Factory,
  Image as ImageIcon,
  UserCog,
  LogOut,
  BarChart3,
  ShieldCheck,
  Globe,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const groups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "ماربل / Marble",
    items: [
      { title: "Categories", url: "/marble/categories", icon: Layers },
      { title: "Photos", url: "/marble/photos", icon: ImageIcon },
      { title: "Raw Rock", url: "/inventory/raw", icon: Package },
      { title: "Finished Stock", url: "/inventory/finished", icon: Package },
      { title: "Production", url: "/production", icon: Factory },
    ],
  },
  {
    label: "Sales & Finance",
    items: [
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Suppliers", url: "/suppliers", icon: Truck },
      { title: "Sales Orders", url: "/sales", icon: ShoppingCart },
      { title: "Payments", url: "/payments", icon: Wallet },
      { title: "Lending / Borrow", url: "/lending", icon: Banknote },
      { title: "Expenses", url: "/expenses", icon: Receipt },
    ],
  },
  {
    label: "Workforce",
    items: [
      { title: "Labour", url: "/labour", icon: HardHat },
      { title: "Attendance", url: "/attendance", icon: CalendarCheck },
      { title: "Salaries", url: "/salaries", icon: Wallet },
      { title: "Machines", url: "/machines", icon: Cog },
    ],
  },
  {
    label: "Reports",
    items: [
      { title: "Reports", url: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Factory Info", url: "/settings/factory", icon: Factory, adminOnly: true },
      { title: "Founders", url: "/settings/founders", icon: Users, adminOnly: true },
      { title: "Users & Roles", url: "/settings/users", icon: UserCog, adminOnly: true },
      { title: "Admin Panel", url: "/settings/admin", icon: ShieldCheck, adminOnly: true },
      { title: "Public Page", url: "/public", icon: Globe },
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
              <div className="font-display text-base font-semibold text-primary">ماربل مینیجر</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Marble Manager
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.filter((it) => !("adminOnly" in it && it.adminOnly) || hasRole("admin")).map((item) => {
                  const active = path === item.url || path.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link
                          to={item.url}
                          className="flex items-center gap-2 data-[active=true]:text-primary"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
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
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-primary"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
