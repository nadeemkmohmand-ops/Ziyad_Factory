import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/lib/auth-context";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="marble-texture h-14 flex items-center justify-between border-b border-border px-4" dir="rtl">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-primary" />
              <span className="font-urdu text-xl text-primary">ماربل مینیجر</span>
            </div>
            <div className="flex items-center gap-3 text-sm" dir="rtl">
              <div className="text-right hidden sm:block">
                <div className="font-urdu font-medium">{profile?.full_name ?? "منتظم"}</div>
                <div className="font-urdu text-[11px] text-primary">{role}</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/40 grid place-items-center text-primary font-urdu">
                {(profile?.full_name ?? "م").charAt(0)}
              </div>
            </div>
          </header>
          <motion.main
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 p-4 md:p-6 overflow-auto"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </SidebarProvider>
  );
}
