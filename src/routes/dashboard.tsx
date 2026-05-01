import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Package, Users, Wallet, Factory, ShoppingCart, HardHat } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AuthGate>
      <AppLayout>
        <Dashboard />
      </AppLayout>
    </AuthGate>
  ),
});

const stats = [
  { label: "Marble Categories", value: "—", icon: Package, accent: true },
  { label: "Customers", value: "—", icon: Users },
  { label: "Open Sales Orders", value: "—", icon: ShoppingCart },
  { label: "Active Labour", value: "—", icon: HardHat },
  { label: "Pending Payments", value: "—", icon: Wallet },
  { label: "Production Today", value: "—", icon: Factory },
];

function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-primary">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your marble factory operations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={`p-5 border-border/60 ${s.accent ? "gold-shadow border-primary/30" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </div>
                <div className="font-display text-3xl mt-2 text-foreground">{s.value}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 marble-texture border-primary/20">
        <h2 className="font-display text-xl text-primary mb-2">Welcome to ماربل مینیجر</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          The foundation is ready: database, authentication, roles, storage, and the dark luxury
          design system. Send your next prompt to add the management screens (categories, inventory,
          sales, payments, labour, etc.).
        </p>
      </Card>
    </div>
  );
}
