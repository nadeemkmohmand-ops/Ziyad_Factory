import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { MarbleCalculator } from "./features/MarbleCalculator";
import { useAuth } from "@/lib/auth-context";
import { Calculator, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role } = useAuth();
  const [calcOpen, setCalcOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop sidebar */}
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header bar */}
          <header className="marble-texture h-14 flex items-center justify-between border-b border-border px-4" dir="rtl">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-primary" />
              <span className="font-urdu text-xl text-primary hidden sm:inline">ماربل مینیجر</span>
              <span className="font-urdu text-base text-primary sm:hidden">المکہ</span>
            </div>
            <div className="flex items-center gap-2 text-sm" dir="rtl">
              {/* Calculator button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalcOpen(true)}
                className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                title="کیلکولیٹر / Calculator"
              >
                <Calculator className="h-4 w-4" />
              </Button>
              <div className="text-right hidden sm:block">
                <div className="font-urdu font-medium">{profile?.full_name ?? "منتظم"}</div>
                <div className="font-urdu text-[11px] text-primary">{role}</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/40 grid place-items-center text-primary font-urdu">
                {(profile?.full_name ?? "م").charAt(0)}
              </div>
            </div>
          </header>

          {/* Main content with bottom padding for mobile nav */}
          <motion.main
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto"
          >
            {children}
          </motion.main>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />

      {/* Marble Calculator dialog */}
      <MarbleCalculator open={calcOpen} onOpenChange={setCalcOpen} />
    </SidebarProvider>
  );
}
