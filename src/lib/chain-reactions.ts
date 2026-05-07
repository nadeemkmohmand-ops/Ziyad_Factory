import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/format";

/** After saving a supplier with rock_type + tons + price, create a raw rock inventory entry. */
export async function afterSupplierSave(args: {
  supplier_id: string;
  name: string;
  rock_type?: string | null;
  quantity_tons?: number | null;
  price_per_ton?: number | null;
}) {
  const tons = Number(args.quantity_tons ?? 0);
  const price = Number(args.price_per_ton ?? 0);
  if (!tons || !args.rock_type) return;
  await supabase.from("raw_rock_inventory").insert({
    supplier_id: args.supplier_id,
    supplier_name: args.name,
    rock_name_urdu: args.rock_type,
    quantity_tons: tons,
    purchase_price_per_ton: price,
    total_cost: tons * price,
    purchase_date: todayISO(),
  });
}

/** Decrement raw rock FIFO by tons used. */
export async function decrementRawRockFIFO(tonsUsed: number) {
  if (!tonsUsed || tonsUsed <= 0) return;
  const { data: raws } = await supabase
    .from("raw_rock_inventory")
    .select("id, quantity_tons")
    .gt("quantity_tons", 0)
    .order("purchase_date", { ascending: true });
  let remaining = tonsUsed;
  for (const r of raws ?? []) {
    if (remaining <= 0) break;
    const have = Number(r.quantity_tons ?? 0);
    const take = Math.min(have, remaining);
    await supabase.rpc("decrement_raw_rock", { rock_id: r.id, used_tons: take });
    remaining -= take;
  }
}

/** Decrement a finished inventory line (uses RPC for atomic stock_status). */
export async function decrementFinishedInventory(inventory_id: string, sold_qty: number) {
  if (!inventory_id || !sold_qty) return;
  await supabase.rpc("decrement_finished_inventory", { inv_id: inventory_id, sold_qty });
}

/** Update customer balance (positive delta = they owe more, negative = they paid). */
export async function adjustCustomerBalance(customer_id: string, delta: number) {
  if (!customer_id || !delta) return;
  const { data } = await supabase.from("customers").select("current_balance").eq("id", customer_id).single();
  const next = Number(data?.current_balance ?? 0) + delta;
  await supabase.from("customers").update({ current_balance: next }).eq("id", customer_id);
}

/** Update supplier balance similarly. */
export async function adjustSupplierBalance(supplier_id: string, delta: number) {
  if (!supplier_id || !delta) return;
  const { data } = await supabase.from("suppliers").select("current_balance").eq("id", supplier_id).single();
  const next = Number(data?.current_balance ?? 0) + delta;
  await supabase.from("suppliers").update({ current_balance: next }).eq("id", supplier_id);
}

/** Recalculate paid/remaining on a sales order from all its payments. */
export async function recomputeOrderPayments(order_id: string) {
  const [{ data: order }, { data: pays }] = await Promise.all([
    supabase.from("sales_orders").select("total_amount, status").eq("id", order_id).single(),
    supabase.from("payments").select("amount").eq("related_order_id", order_id),
  ]);
  if (!order) return;
  const totalPaid = (pays ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const total = Number(order.total_amount ?? 0);
  const remaining = Math.max(0, total - totalPaid);
  const status = totalPaid >= total && total > 0
    ? (order.status === "delivered" ? "delivered" : "paid")
    : totalPaid > 0 ? "partial" : (order.status ?? "pending");
  await supabase.from("sales_orders").update({
    paid_amount: totalPaid,
    remaining_amount: remaining,
    status,
  }).eq("id", order_id);
}

/** After a payment row is inserted, cascade balances + order. */
export async function afterPaymentSave(p: {
  payment_type: string | null;
  amount: number | null;
  customer_id?: string | null;
  supplier_id?: string | null;
  related_order_id?: string | null;
}) {
  const amt = Number(p.amount ?? 0);
  if (!amt) return;
  if (p.customer_id && p.payment_type === "received") {
    await adjustCustomerBalance(p.customer_id, -amt);
  }
  if (p.supplier_id && p.payment_type === "paid") {
    await adjustSupplierBalance(p.supplier_id, -amt);
  }
  if (p.related_order_id) {
    await recomputeOrderPayments(p.related_order_id);
  }
}
