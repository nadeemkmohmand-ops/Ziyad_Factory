import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/users")({
  component: () => (
    <Protected>
      <Users />
    </Protected>
  ),
});

interface Profile { id: string; full_name: string | null; phone: string | null }
interface UR { user_id: string; role: "admin" | "manager" | "viewer" }

function Users() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UR[]>([]);

  const load = async () => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles((p.data ?? []) as Profile[]);
    setRoles((r.data ?? []) as UR[]);
  };
  useEffect(() => { void load(); }, []);

  const setRole = async (uid: string, role: "admin" | "manager" | "viewer") => {
    if (!isAdmin) return toast.error("Admins only");
    await supabase.from("user_roles").delete().eq("user_id", uid);
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    void load();
  };

  return (
    <div>
      <PageHeader title="Users & Roles" urdu="یوزرز اور رولز" subtitle="Admin assigns roles. New signups default to viewer." />
      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Current Role</TableHead><TableHead>Change</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {profiles.map((p) => {
              const myRoles = roles.filter((r) => r.user_id === p.id).map((r) => r.role);
              const top = myRoles.includes("admin") ? "admin" : myRoles.includes("manager") ? "manager" : "viewer";
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.full_name ?? "—"}</TableCell>
                  <TableCell>{p.phone ?? "—"}</TableCell>
                  <TableCell><Badge className={top === "admin" ? "bg-primary/20 text-primary border-primary/40" : "bg-muted/40"}>{top}</Badge></TableCell>
                  <TableCell>
                    <Select disabled={!isAdmin} value={top} onValueChange={(v) => setRole(p.id, v as "admin" | "manager" | "viewer")}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
