import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export const ALL_TABLES = [
  "customers", "suppliers", "marble_categories", "marble_photos",
  "raw_rock_inventory", "finished_marble_inventory",
  "sales_orders", "sales_order_items", "payments", "lending_borrowing",
  "labour", "attendance", "salary_payments", "expenses",
  "machine_equipment", "production_logs", "founders", "factory_info",
  "app_settings", "marble_price_history", "marble_sizes", "expense_products",
] as const;

export type TableName = (typeof ALL_TABLES)[number];

const LABELS: Record<TableName, string> = {
  customers: "گاہک / Customers",
  suppliers: "سپلائر / Suppliers",
  marble_categories: "ماربل اقسام / Categories",
  marble_photos: "ماربل تصاویر / Photos",
  raw_rock_inventory: "خام پتھر / Raw Rock",
  finished_marble_inventory: "تیار ماربل / Finished",
  sales_orders: "فروخت / Sales Orders",
  sales_order_items: "آرڈر آئٹمز / Order Items",
  payments: "ادائیگیاں / Payments",
  lending_borrowing: "قرض / Lending-Borrowing",
  labour: "مزدور / Labour",
  attendance: "حاضری / Attendance",
  salary_payments: "تنخواہ / Salary",
  expenses: "اخراجات / Expenses",
  machine_equipment: "مشینیں / Machines",
  production_logs: "پیداوار / Production",
  founders: "بانیان / Founders",
  factory_info: "فیکٹری معلومات / Factory",
  app_settings: "سیٹنگز / Settings",
  marble_price_history: "قیمت تاریخ / Price History",
  marble_sizes: "ماربل سائز / Sizes",
  expense_products: "اخراجات اشیاء / Expense Items",
};

export async function fetchAllData(): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  for (const t of ALL_TABLES) {
    const { data } = await supabase.from(t).select("*");
    out[t] = (data ?? []) as unknown[];
  }
  return out;
}

export async function exportAllToExcel(filename = `al-makkah-data-${new Date().toISOString().slice(0, 10)}.xlsx`) {
  const data = await fetchAllData();
  const wb = XLSX.utils.book_new();
  // Index sheet
  const idx = ALL_TABLES.map((t) => ({ Section: LABELS[t], Table: t, Rows: (data[t] ?? []).length }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(idx), "INDEX");
  for (const t of ALL_TABLES) {
    const rows = data[t] ?? [];
    const ws = rows.length ? XLSX.utils.json_to_sheet(rows as Record<string, unknown>[]) : XLSX.utils.aoa_to_sheet([["(no data)"]]);
    // sheet names ≤31 chars
    const sheetName = (LABELS[t].split("/")[1]?.trim() || t).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  XLSX.writeFile(wb, filename);
}

export async function downloadJsonBackup(): Promise<Record<string, unknown[]>> {
  const data = await fetchAllData();
  const dump = { exported_at: new Date().toISOString(), version: 1, data };
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `al-makkah-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return data;
}

// Tables to clear in safe order (children before parents)
const CLEAR_ORDER: TableName[] = [
  "sales_order_items", "payments", "salary_payments", "attendance",
  "production_logs", "marble_price_history", "marble_photos",
  "sales_orders", "lending_borrowing", "expenses",
  "raw_rock_inventory", "finished_marble_inventory",
  "machine_equipment", "labour", "customers", "suppliers",
  "marble_categories", "marble_sizes", "expense_products",
];

export async function clearAllData(): Promise<void> {
  // Auto-backup first
  await downloadJsonBackup();
  for (const t of CLEAR_ORDER) {
    await supabase.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }
}

const RESTORE_ORDER: TableName[] = [
  "marble_categories", "marble_sizes", "expense_products",
  "customers", "suppliers", "labour", "machine_equipment",
  "raw_rock_inventory", "finished_marble_inventory",
  "sales_orders", "sales_order_items", "payments", "lending_borrowing",
  "expenses", "attendance", "salary_payments", "production_logs",
  "marble_photos", "marble_price_history", "founders",
];

export async function restoreFromJson(file: File): Promise<{ ok: boolean; message: string }> {
  try {
    const txt = await file.text();
    const parsed = JSON.parse(txt);
    const data: Record<string, unknown[]> = parsed.data ?? parsed;
    for (const t of RESTORE_ORDER) {
      const rows = data[t];
      if (Array.isArray(rows) && rows.length > 0) {
        // upsert by id
        await supabase.from(t).upsert(rows as never[], { onConflict: "id" });
      }
    }
    return { ok: true, message: "بحالی مکمل / Restore complete" };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
