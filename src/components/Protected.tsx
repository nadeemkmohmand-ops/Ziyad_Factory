import type { ReactNode } from "react";
import { AuthGate } from "./AuthGate";
import { AppLayout } from "./AppLayout";

export function Protected({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AppLayout>{children}</AppLayout>
    </AuthGate>
  );
}
