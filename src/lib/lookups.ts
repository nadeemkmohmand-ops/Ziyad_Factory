import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LookupItem { id: string; label: string; display_order: number | null }

export function useLookup(table: "marble_sizes" | "expense_products") {
  const [items, setItems] = useState<LookupItem[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from(table).select("*").order("display_order", { ascending: true });
    setItems((data ?? []) as LookupItem[]);
  }, [table]);
  useEffect(() => { void load(); }, [load]);

  const add = async (label: string) => {
    const v = label.trim();
    if (!v) return null;
    if (items.some((i) => i.label.toLowerCase() === v.toLowerCase())) return v;
    const { error } = await supabase.from(table).insert({ label: v, display_order: items.length + 1 });
    if (error) { toast.error(error.message); return null; }
    await load();
    return v;
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };
  return { items, add, remove, reload: load };
}

export const JOB_ROLES = [
  { value: "cutter",       urdu: "کٹر آپریٹر",    dailyRate: true  },
  { value: "polisher",     urdu: "پالشر",          dailyRate: true  },
  { value: "loader",       urdu: "لوڈر",           dailyRate: true  },
  { value: "block_setter", urdu: "بلاک سیٹر",      dailyRate: true  },
  { value: "supervisor",   urdu: "سپروائزر",       dailyRate: false },
  { value: "electrician",  urdu: "الیکٹریشن",      dailyRate: false },
  { value: "security",     urdu: "چوکیدار (رات)",  dailyRate: false },
  { value: "manager",      urdu: "مینیجر",          dailyRate: false },
  { value: "driver",       urdu: "ڈرائیور",         dailyRate: true  },
  { value: "helper",       urdu: "ہیلپر",           dailyRate: true  },
];
