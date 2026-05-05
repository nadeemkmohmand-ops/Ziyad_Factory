import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Trash2, ShieldCheck, UserCog, Eye } from "lucide-react";

export const Route = createFileRoute("/settings/users")({
  component: () => (
    <Protected>
      <Users />
    </Protected>
  ),
});

interface Profile { id: string; full_name: string | null; phone: string | null }
interface UR { user_id: string; role: "admin" | "manager" | "viewer" }

const roleMeta = {
  admin:   { label: "ایڈمن",        color: "bg-primary/20 text-primary border-primary/40",       icon: ShieldCheck },
  manager: { label: "مینیجر",       color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: UserCog },
  viewer:  { label: "دیکھنے والا",  color: "bg-muted/40 text-muted-foreground border-border",    icon: Eye },
};

function Users() {
  const { hasRole, user: currentUser } = useAuth();
  const isAdmin = hasRole("admin");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles]       = useState<UR[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = async () => {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles((p.data ?? []) as Profile[]);
    setRoles((r.data ?? []) as UR[]);
  };

  useEffect(() => { void load(); }, []);

  const topRole = (uid: string): "admin" | "manager" | "viewer" => {
    const myRoles = roles.filter((r) => r.user_id === uid).map((r) => r.role);
    return myRoles.includes("admin") ? "admin" : myRoles.includes("manager") ? "manager" : "viewer";
  };

  const setRole = async (uid: string, role: "admin" | "manager" | "viewer") => {
    if (!isAdmin) return toast.error("صرف ایڈمن یہ کام کر سکتا ہے");
    await supabase.from("user_roles").delete().eq("user_id", uid);
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) return toast.error(error.message);
    toast.success("کردار تبدیل ہو گیا / Role updated");
    void load();
  };

  const removeUser = async (uid: string, name: string | null) => {
    if (!isAdmin) return toast.error("صرف ایڈمن یہ کام کر سکتا ہے");
    if (uid === currentUser?.id) return toast.error("آپ خود کو نہیں ہٹا سکتے");
    setRemovingId(uid);
    try {
      await supabase.from("user_roles").delete().eq("user_id", uid);
      await supabase.from("profiles").delete().eq("id", uid);
      toast.success(`${name ?? "یوزر"} کو ہٹا دیا گیا`);
      void load();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setRemovingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <PageHeader title="Users & Roles" urdu="یوزرز اور رولز" subtitle="صرف ایڈمن کے لیے / Admins only." />
        <Card className="p-6 text-center text-muted-foreground font-urdu">آپ کو یہ صفحہ دیکھنے کا اختیار نہیں۔</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        urdu="یوزرز اور رولز"
        subtitle={`${profiles.length} رجسٹرڈ یوزر — ایڈمن کسی کو بھی کردار دے یا ہٹا سکتا ہے`}
      />

      {/* Role legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {(["admin", "manager", "viewer"] as const).map((r) => {
          const m = roleMeta[r];
          const Icon = m.icon;
          return (
            <div key={r} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-urdu ${m.color}`}>
              <Icon className="h-3.5 w-3.5" />
              <span>{m.label}</span>
              <span className="text-[10px] opacity-60">({profiles.filter((p) => topRole(p.id) === r).length})</span>
            </div>
          );
        })}
      </div>

      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader>
            <TableRow>
              <TableHead className="font-urdu">نام</TableHead>
              <TableHead className="font-urdu">فون</TableHead>
              <TableHead className="font-urdu">موجودہ کردار</TableHead>
              <TableHead className="font-urdu">کردار بدلیں</TableHead>
              <TableHead className="font-urdu text-destructive">ہٹائیں</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => {
              const top = topRole(p.id);
              const meta = roleMeta[top];
              const Icon = meta.icon;
              const isSelf = p.id === currentUser?.id;
              return (
                <TableRow key={p.id} className={isSelf ? "bg-primary/5" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 grid place-items-center text-primary font-urdu text-sm">
                        {(p.full_name ?? "؟").charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{p.full_name ?? "—"}</div>
                        {isSelf && <div className="text-[10px] text-primary font-urdu">آپ (You)</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={`gap-1 ${meta.color}`}>
                      <Icon className="h-3 w-3" />
                      <span className="font-urdu">{meta.label}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={top}
                      onValueChange={(v) => setRole(p.id, v as "admin" | "manager" | "viewer")}
                    >
                      <SelectTrigger className="w-36 font-urdu">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin" className="font-urdu">
                          <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" />ایڈمن</span>
                        </SelectItem>
                        <SelectItem value="manager" className="font-urdu">
                          <span className="flex items-center gap-2"><UserCog className="h-3.5 w-3.5 text-amber-400" />مینیجر</span>
                        </SelectItem>
                        <SelectItem value="viewer" className="font-urdu">
                          <span className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-muted-foreground" />دیکھنے والا</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {isSelf ? (
                      <span className="text-xs text-muted-foreground font-urdu">خود نہیں</span>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={removingId === p.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-urdu">یوزر ہٹائیں؟</AlertDialogTitle>
                            <AlertDialogDescription className="font-urdu">
                              کیا آپ <strong>{p.full_name ?? "اس یوزر"}</strong> کو ویب سائٹ سے مکمل طور پر ہٹانا چاہتے ہیں؟
                              یہ عمل واپس نہیں ہو سکتا۔
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel className="font-urdu">منسوخ</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground font-urdu"
                              onClick={() => removeUser(p.id, p.full_name)}
                            >
                              ہٹائیں
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground font-urdu py-10">
                  کوئی یوزر نہیں ملا
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="text-xs text-muted-foreground mt-3 font-urdu">
        نوٹ: یوزر ہٹانے سے اس کا پروفائل اور کردار ہٹ جاتا ہے۔ مکمل auth اکاؤنٹ ڈیلیٹ کے لیے Supabase Dashboard استعمال کریں۔
      </p>
    </div>
  );
}
