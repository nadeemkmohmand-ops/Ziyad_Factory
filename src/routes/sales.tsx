import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Protected } from "@/components/Protected";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { PKR, fmtDate, todayISO } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, Eye, Printer, FileDown, Wallet } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const Route = createFileRoute("/sales")({
  component: () => (
    <Protected>
      <Sales />
    </Protected>
  ),
});

interface Customer { id: string; name: string; phone: string | null; current_balance: number | null }
interface Cat { id: string; name_urdu: string; name_english: string | null; price_per_sqft: number | null; price_per_slab: number | null; unit: string }
interface Inv { id: string; category_id: string | null; batch_number: string | null; quantity: number | null; unit: string | null; selling_price_per_unit: number | null; stock_status: string | null }
interface Order {
  id: string;
  order_number: string | null;
  customer_id: string | null;
  order_date: string | null;
  delivery_date: string | null;
  payment_type: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  remaining_amount: number | null;
  status: string | null;
  notes: string | null;
  created_at: string;
}
interface OrderItem {
  id: string;
  order_id: string | null;
  category_id: string | null;
  inventory_id: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  total_price: number | null;
}
interface Payment {
  id: string;
  payment_type: string | null;
  amount: number | null;
  payment_method: string | null;
  payment_date: string | null;
  notes: string | null;
}
interface Factory { name_urdu: string | null; name_english: string | null; address: string | null; logo_url: string | null }

interface LineDraft {
  category_id: string;
  inventory_id: string;
  quantity: string;
  unit_price: string;
  unit: string;
}

const newLine = (): LineDraft => ({ category_id: "", inventory_id: "", quantity: "", unit_price: "", unit: "sqft" });

function Sales() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [inv, setInv] = useState<Inv[]>([]);
  const [factory, setFactory] = useState<Factory | null>(null);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");

  // create form
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [newCustName, setNewCustName] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [orderDate, setOrderDate] = useState(todayISO());
  const [deliveryDate, setDeliveryDate] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);

  // detail
  const [detail, setDetail] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [pays, setPays] = useState<Payment[]>([]);

  // add payment
  const [payDlg, setPayDlg] = useState(false);
  const [payAmt, setPayAmt] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const load = async () => {
    const [o, c, ca, i, f] = await Promise.all([
      supabase.from("sales_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("id, name, phone, current_balance").order("name"),
      supabase.from("marble_categories").select("id, name_urdu, name_english, price_per_sqft, price_per_slab, unit"),
      supabase.from("finished_marble_inventory").select("id, category_id, batch_number, quantity, unit, selling_price_per_unit, stock_status").gt("quantity", 0),
      supabase.from("factory_info").select("name_urdu, name_english, address, logo_url").maybeSingle(),
    ]);
    setOrders((o.data ?? []) as Order[]);
    setCustomers((c.data ?? []) as Customer[]);
    setCats((ca.data ?? []) as Cat[]);
    setInv((i.data ?? []) as Inv[]);
    setFactory((f.data ?? null) as Factory | null);
  };
  useEffect(() => { void load(); }, []);

  const total = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0), 0);
  const remaining = paymentType === "partial" ? Math.max(0, total - Number(paidAmount || 0)) : paymentType === "cash" ? 0 : total;

  const addLine = () => setLines([...lines, newLine()]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, p: Partial<LineDraft>) => {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...p } : l)));
  };
  const onSelectCat = (i: number, cid: string) => {
    const c = cats.find((x) => x.id === cid);
    updateLine(i, {
      category_id: cid,
      inventory_id: "",
      unit: c?.unit ?? "sqft",
      unit_price: c?.price_per_sqft ? String(c.price_per_sqft) : "",
    });
  };
  const onSelectInv = (i: number, iid: string) => {
    const item = inv.find((x) => x.id === iid);
    updateLine(i, {
      inventory_id: iid,
      unit_price: item?.selling_price_per_unit ? String(item.selling_price_per_unit) : lines[i].unit_price,
      unit: item?.unit ?? lines[i].unit,
    });
  };

  const reset = () => {
    setCustomerId(""); setNewCustName(""); setPaymentType("cash"); setOrderDate(todayISO());
    setDeliveryDate(""); setPaidAmount(""); setNotes(""); setLines([newLine()]);
  };

  const create = async () => {
    if (lines.length === 0 || lines.every((l) => !l.inventory_id)) return toast.error("Add at least one line");
    let custId = customerId;
    if (!custId && newCustName.trim()) {
      const { data, error } = await supabase.from("customers").insert({ name: newCustName.trim() }).select("id").single();
      if (error) return toast.error(error.message);
      custId = data.id;
    }
    if (!custId) return toast.error("Select or add a customer");

    const orderNumber = "INV-" + Date.now().toString().slice(-8);
    const computedPaid = paymentType === "cash" ? total : paymentType === "partial" ? Number(paidAmount || 0) : 0;
    const { data: ord, error: oe } = await supabase.from("sales_orders").insert({
      order_number: orderNumber,
      customer_id: custId,
      order_date: orderDate,
      delivery_date: deliveryDate || null,
      payment_type: paymentType,
      total_amount: total,
      paid_amount: computedPaid,
      remaining_amount: total - computedPaid,
      status: "pending",
      notes: notes || null,
    }).select().single();
    if (oe || !ord) return toast.error(oe?.message ?? "Failed to create order");

    const itemRows = lines.filter((l) => l.inventory_id).map((l) => ({
      order_id: ord.id,
      category_id: l.category_id || null,
      inventory_id: l.inventory_id,
      quantity: Number(l.quantity || 0),
      unit: l.unit,
      unit_price: Number(l.unit_price || 0),
      total_price: Number(l.quantity || 0) * Number(l.unit_price || 0),
    }));
    await supabase.from("sales_order_items").insert(itemRows);

    // Deduct from inventory
    for (const l of itemRows) {
      const item = inv.find((x) => x.id === l.inventory_id);
      if (!item) continue;
      const newQty = Number(item.quantity ?? 0) - Number(l.quantity);
      await supabase.from("finished_marble_inventory").update({
        quantity: Math.max(0, newQty),
        stock_status: newQty <= 0 ? "sold_out" : item.stock_status,
      }).eq("id", l.inventory_id);
    }

    // Update customer balance (they owe us = remaining)
    if (total - computedPaid > 0) {
      const cust = customers.find((c) => c.id === custId);
      const newBal = Number(cust?.current_balance ?? 0) + (total - computedPaid);
      await supabase.from("customers").update({ current_balance: newBal }).eq("id", custId);
    }

    // Record payment if any
    if (computedPaid > 0) {
      await supabase.from("payments").insert({
        payment_type: "received",
        amount: computedPaid,
        payment_method: "cash",
        customer_id: custId,
        related_order_id: ord.id,
        payment_date: orderDate,
        is_settled: true,
      });
    }

    toast.success("Order created — " + orderNumber);
    setOpen(false);
    reset();
    void load();
  };

  const openDetail = async (o: Order) => {
    setDetail(o);
    const [it, pa] = await Promise.all([
      supabase.from("sales_order_items").select("*").eq("order_id", o.id),
      supabase.from("payments").select("*").eq("related_order_id", o.id).order("payment_date"),
    ]);
    setItems((it.data ?? []) as OrderItem[]);
    setPays((pa.data ?? []) as Payment[]);
  };

  const markDelivered = async () => {
    if (!detail) return;
    await supabase.from("sales_orders").update({ status: "delivered" }).eq("id", detail.id);
    setDetail({ ...detail, status: "delivered" });
    void load();
  };

  const addPayment = async () => {
    if (!detail) return;
    const amt = Number(payAmt || 0);
    if (amt <= 0) return toast.error("Enter amount");
    await supabase.from("payments").insert({
      payment_type: "received",
      amount: amt,
      payment_method: payMethod,
      customer_id: detail.customer_id,
      related_order_id: detail.id,
      payment_date: todayISO(),
      is_settled: true,
    });
    const newPaid = Number(detail.paid_amount ?? 0) + amt;
    const newRem = Math.max(0, Number(detail.total_amount ?? 0) - newPaid);
    await supabase.from("sales_orders").update({ paid_amount: newPaid, remaining_amount: newRem }).eq("id", detail.id);
    if (detail.customer_id) {
      const cust = customers.find((c) => c.id === detail.customer_id);
      const newBal = Math.max(0, Number(cust?.current_balance ?? 0) - amt);
      await supabase.from("customers").update({ current_balance: newBal }).eq("id", detail.customer_id);
    }
    setPayDlg(false);
    setPayAmt("");
    toast.success("Payment recorded");
    openDetail({ ...detail, paid_amount: newPaid, remaining_amount: newRem });
    void load();
  };

  const invoiceRef = useRef<HTMLDivElement>(null);
  const exportPDF = async () => {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save(`${detail?.order_number ?? "invoice"}.pdf`);
  };

  const filtered = orders.filter((o) => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (filterCustomer !== "all" && o.customer_id !== filterCustomer) return false;
    if (filterPayment !== "all" && o.payment_type !== filterPayment) return false;
    return true;
  });

  const cName = (id: string | null) => customers.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader title="Sales Orders" urdu="سیلز" subtitle="Create orders, manage payments, and print invoices."
        actions={<Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> New Order</Button>}
      />

      <div className="grid gap-2 sm:grid-cols-3 mb-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCustomer} onValueChange={setFilterCustomer}><SelectTrigger><SelectValue placeholder="Customer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPayment} onValueChange={setFilterPayment}><SelectTrigger><SelectValue placeholder="Payment Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment Types</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="lend">Lend</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table className="marble-table">
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No orders.</TableCell></TableRow>
            ) : filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs text-primary">{o.order_number}</TableCell>
                <TableCell>{fmtDate(o.order_date)}</TableCell>
                <TableCell>{cName(o.customer_id)}</TableCell>
                <TableCell><Badge variant="outline">{o.payment_type}</Badge></TableCell>
                <TableCell className="text-right">{PKR(o.total_amount)}</TableCell>
                <TableCell className="text-right text-success">{PKR(o.paid_amount)}</TableCell>
                <TableCell className={`text-right ${Number(o.remaining_amount ?? 0) > 0 ? "text-destructive" : ""}`}>{PKR(o.remaining_amount)}</TableCell>
                <TableCell>
                  <Badge className={o.status === "delivered" ? "bg-success/20 text-success border-success/30" : o.status === "pending" ? "bg-warning/20 text-warning border-warning/30" : "bg-muted/40"}>{o.status}</Badge>
                </TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => openDetail(o)}><Eye className="h-3 w-3" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New Sales Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setNewCustName(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select existing" /></SelectTrigger>
                  <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Or new customer</Label>
                <Input value={newCustName} onChange={(e) => { setNewCustName(e.target.value); setCustomerId(""); }} placeholder="New customer name" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Payment Type</Label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="lend">Lend (ادھار)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Order Date</Label><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></div>
              {(paymentType === "credit" || paymentType === "lend" || paymentType === "partial") && (
                <div><Label>Due Date</Label><Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
              )}
            </div>

            <div className="border border-border/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3" /> Line</Button>
              </div>
              {lines.map((l, i) => {
                const catInv = inv.filter((x) => x.category_id === l.category_id);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Select value={l.category_id} onValueChange={(v) => onSelectCat(i, v)}>
                        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}><span className="font-urdu mr-2">{c.name_urdu}</span> {c.name_english}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Select value={l.inventory_id} onValueChange={(v) => onSelectInv(i, v)} disabled={!l.category_id}>
                        <SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger>
                        <SelectContent>{catInv.map((x) => <SelectItem key={x.id} value={x.id}>{x.batch_number ?? x.id.slice(0,6)} ({x.quantity} {x.unit})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2"><Input type="number" placeholder="Qty" value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} /></div>
                    <div className="col-span-2"><Input type="number" placeholder="Price" value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: e.target.value })} /></div>
                    <div className="col-span-1 text-right text-sm font-medium">{PKR(Number(l.quantity||0)*Number(l.unit_price||0))}</div>
                    <div className="col-span-1"><Button size="icon" variant="ghost" onClick={() => removeLine(i)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button></div>
                  </div>
                );
              })}
            </div>

            {paymentType === "partial" && (
              <div><Label>Paid Amount</Label><Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} /></div>
            )}

            <div className="flex justify-between text-lg font-display">
              <span>Total: <span className="text-primary">{PKR(total)}</span></span>
              {remaining > 0 && <span>Remaining: <span className="text-destructive">{PKR(remaining)}</span></span>}
            </div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} className="bg-primary text-primary-foreground">Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-auto">
          <SheetHeader><SheetTitle>Order Detail — {detail?.order_number}</SheetTitle></SheetHeader>
          {detail && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setPayDlg(true)} className="bg-primary text-primary-foreground"><Wallet className="h-3 w-3" /> Add Payment</Button>
                {detail.status !== "delivered" && <Button size="sm" variant="outline" onClick={markDelivered}>Mark Delivered</Button>}
                <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-3 w-3" /> Print</Button>
                <Button size="sm" variant="outline" onClick={exportPDF}><FileDown className="h-3 w-3" /> PDF</Button>
              </div>

              <div ref={invoiceRef} className="bg-white text-black p-8 rounded">
                <div className="flex justify-between border-b border-gray-300 pb-4 mb-4">
                  <div>
                    <div style={{ fontFamily: "'Noto Nastaliq Urdu', serif", fontSize: 28, color: "#c9a84c" }}>{factory?.name_urdu ?? "ماربل مینیجر"}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18 }}>{factory?.name_english ?? "Marble Manager"}</div>
                    <div className="text-xs text-gray-600">{factory?.address ?? ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">INVOICE</div>
                    <div className="text-sm">{detail.order_number}</div>
                    <div className="text-xs text-gray-600">{fmtDate(detail.order_date)}</div>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-xs text-gray-500">Bill To / گاہک</div>
                  <div className="font-medium">{cName(detail.customer_id)}</div>
                </div>
                <table className="w-full text-sm mb-4">
                  <thead className="bg-gray-100"><tr><th className="text-left p-2">Item</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Price</th><th className="text-right p-2">Total</th></tr></thead>
                  <tbody>
                    {items.map((it) => {
                      const c = cats.find((x) => x.id === it.category_id);
                      return (
                        <tr key={it.id} className="border-b">
                          <td className="p-2"><div style={{ fontFamily: "'Noto Nastaliq Urdu', serif", fontSize: 16 }}>{c?.name_urdu}</div><div className="text-xs text-gray-600">{c?.name_english}</div></td>
                          <td className="text-right p-2">{it.quantity} {it.unit}</td>
                          <td className="text-right p-2">{PKR(it.unit_price)}</td>
                          <td className="text-right p-2 font-medium">{PKR(it.total_price)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="ml-auto w-1/2 text-sm space-y-1">
                  <div className="flex justify-between"><span>Subtotal</span><span>{PKR(detail.total_amount)}</span></div>
                  <div className="flex justify-between text-green-700"><span>Paid</span><span>{PKR(detail.paid_amount)}</span></div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Balance Due</span><span>{PKR(detail.remaining_amount)}</span></div>
                </div>
                <div className="text-xs text-gray-500 mt-8 text-center">شکریہ — Thank you for your business</div>
              </div>

              <Card className="p-4">
                <div className="text-sm font-medium mb-2">Payment History</div>
                {pays.length === 0 ? <div className="text-xs text-muted-foreground">No payments.</div> : pays.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0">
                    <span>{fmtDate(p.payment_date)} • {p.payment_method}</span>
                    <span className="text-success font-medium">{PKR(p.amount)}</span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={payDlg} onOpenChange={setPayDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Amount</Label><Input type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} /></div>
            <div>
              <Label>Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDlg(false)}>Cancel</Button>
            <Button onClick={addPayment} className="bg-primary text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
