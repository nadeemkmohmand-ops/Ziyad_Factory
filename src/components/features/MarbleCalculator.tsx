/**
 * MarbleCalculator — Industry-specific calculators for rock/marble factory.
 * Inspired by EasyKhata's inline calculations and DigiKhata's running balance.
 * Provides: Area calculator, Volume calculator, Price calculator, Weight estimator
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PKR } from "@/lib/format";
import { Calculator, Ruler, Weight, Gem, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CalcTab = "area" | "price" | "weight" | "running";

function AreaCalc() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [thickness, setThickness] = useState("");
  const [unit, setUnit] = useState<"ft" | "m">("ft");

  const area = Number(length || 0) * Number(width || 0);
  const volume = area * Number(thickness || 0);
  const areaSqM = unit === "ft" ? area * 0.0929 : area;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label>لمبائی / Length</Label>
          <Input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label>چوڑائی / Width</Label>
          <Input
            type="number"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label>موٹائی / Thickness</Label>
          <Input
            type="number"
            value={thickness}
            onChange={(e) => setThickness(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <Label>یونٹ / Unit</Label>
        <Select value={unit} onValueChange={(v) => setUnit(v as "ft" | "m")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ft">فٹ / Feet</SelectItem>
            <SelectItem value="m">میٹر / Meters</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="p-3 bg-primary/5 border-primary/20">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">رقبہ / Area</div>
            <div className="font-display text-lg text-primary">
              {area.toFixed(2)} {unit === "ft" ? "sq ft" : "sq m"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">حجم / Volume</div>
            <div className="font-display text-lg text-primary">
              {volume.toFixed(2)} {unit === "ft" ? "cubic ft" : "cubic m"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">
              رقبہ (مربع میٹر) / Area (sq m)
            </div>
            <div className="font-display text-sm text-foreground">
              {areaSqM.toFixed(2)} sq m
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PriceCalc() {
  const [area, setArea] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<"sqft" | "slab" | "ton">("sqft");

  const total = Number(area || quantity || 0) * Number(pricePerUnit || 0);

  return (
    <div className="space-y-3">
      <div>
        <Label>قیمت کی اکائی / Pricing Unit</Label>
        <Select value={unit} onValueChange={(v) => setUnit(v as "sqft" | "slab" | "ton")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sqft">فی مربع فٹ / Per sq ft</SelectItem>
            <SelectItem value="slab">فی سلیب / Per slab</SelectItem>
            <SelectItem value="ton">فی ٹن / Per ton</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {unit === "sqft" ? (
          <div>
            <Label>رقبہ (مربع فٹ) / Area (sq ft)</Label>
            <Input type="number" value={area} onChange={(e) => setArea(e.target.value)} placeholder="0" />
          </div>
        ) : (
          <div>
            <Label>تعداد / Quantity ({unit})</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
          </div>
        )}
        <div>
          <Label>قیمت / Price per {unit}</Label>
          <Input type="number" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} placeholder="0" />
        </div>
      </div>
      <Card className="p-3 bg-primary/5 border-primary/20">
        <div className="text-[10px] uppercase text-muted-foreground">کل رقم / Total Amount</div>
        <div className="font-display text-2xl text-primary">{PKR(total)}</div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(String(total));
            toast.success("کاپی ہو گیا / Copied");
          }}
          className="mt-1 text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          <Copy className="h-3 w-3" /> Copy
        </button>
      </Card>
    </div>
  );
}

function WeightCalc() {
  const [volume, setVolume] = useState("");
  const [density, setDensity] = useState("2.7");

  const weight = Number(volume || 0) * Number(density || 0);
  const tons = weight / 1000;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>حجم / Volume (cubic meters)</Label>
          <Input type="number" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="0" />
        </div>
        <div>
          <Label>کثافت / Density (kg/m3)</Label>
          <Input type="number" value={density} onChange={(e) => setDensity(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        ماربل کی اوسط کثافت 2,700 kg/m3 ہے / Average marble density is ~2,700 kg/m3
      </p>
      <Card className="p-3 bg-primary/5 border-primary/20">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">وزن / Weight</div>
            <div className="font-display text-lg text-primary">{weight.toFixed(0)} kg</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">ٹن / Tons</div>
            <div className="font-display text-lg text-primary">{tons.toFixed(2)} tons</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RunningBalance() {
  const [entries, setEntries] = useState([
    { desc: "شروع / Opening", debit: "", credit: "" },
  ]);
  const [result, setResult] = useState<{ entries: { desc: string; debit: number; credit: number; balance: number }[]; final: number } | null>(null);

  const addEntry = () =>
    setEntries([...entries, { desc: "", debit: "", credit: "" }]);
  const removeEntry = (i: number) =>
    setEntries(entries.filter((_, idx) => idx !== i));
  const updateEntry = (i: number, field: string, val: string) =>
    setEntries(entries.map((e, idx) => (idx === i ? { ...e, [field]: val } : e)));

  const calculate = () => {
    let balance = 0;
    const res = entries.map((e) => {
      const d = Number(e.debit || 0);
      const c = Number(e.credit || 0);
      balance += d - c;
      return { desc: e.desc, debit: d, credit: c, balance };
    });
    setResult({ entries: res, final: balance });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-urdu" style={{ direction: "rtl" }}>
        ڈیبٹ = وصول (آپ کو ملنا)، کریڈٹ = ادا (آپ نے دینا)
      </p>
      {entries.map((e, i) => (
        <div key={i} className="grid grid-cols-12 gap-1 items-end">
          <div className="col-span-5">
            <Label className="text-[10px]">تفصیل</Label>
            <Input className="h-8 text-xs" value={e.desc} onChange={(ev) => updateEntry(i, "desc", ev.target.value)} placeholder="تفصیل" />
          </div>
          <div className="col-span-3">
            <Label className="text-[10px]">ڈیبٹ / Dr</Label>
            <Input className="h-8 text-xs" type="number" value={e.debit} onChange={(ev) => updateEntry(i, "debit", ev.target.value)} placeholder="0" />
          </div>
          <div className="col-span-3">
            <Label className="text-[10px]">کریڈٹ / Cr</Label>
            <Input className="h-8 text-xs" type="number" value={e.credit} onChange={(ev) => updateEntry(i, "credit", ev.target.value)} placeholder="0" />
          </div>
          <div className="col-span-1">
            <Button size="sm" variant="ghost" onClick={() => removeEntry(i)} className="text-destructive h-8 w-8 p-0">
              ×
            </Button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={addEntry}>+ سطر / Row</Button>
        <Button size="sm" onClick={calculate} className="bg-primary text-primary-foreground">
          حساب / Calculate
        </Button>
      </div>
      {result && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1">تفصیل</th>
                <th className="text-right py-1">ڈیبٹ</th>
                <th className="text-right py-1">کریڈٹ</th>
                <th className="text-right py-1">بیلنس</th>
              </tr>
            </thead>
            <tbody>
              {result.entries.map((r, i) => (
                <tr key={i} className="border-t border-border/20">
                  <td className="py-1">{r.desc}</td>
                  <td className="text-right">{r.debit ? PKR(r.debit) : ""}</td>
                  <td className="text-right">{r.credit ? PKR(r.credit) : ""}</td>
                  <td className={`text-right font-medium ${r.balance >= 0 ? "text-success" : "text-destructive"}`}>
                    {PKR(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 pt-2 border-t border-border/30 flex justify-between font-medium">
            <span>آخری بیلنس / Final Balance</span>
            <span className={result.final >= 0 ? "text-success" : "text-destructive"}>
              {PKR(result.final)}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

const tabs: { key: CalcTab; label: string; icon: typeof Calculator }[] = [
  { key: "area", label: "رقبہ / Area", icon: Ruler },
  { key: "price", label: "قیمت / Price", icon: Gem },
  { key: "weight", label: "وزن / Weight", icon: Weight },
  { key: "running", label: "بیلنس / Balance", icon: Calculator },
];

export function MarbleCalculator({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<CalcTab>("area");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <div>
                <div className="font-urdu text-lg text-primary" style={{ direction: "rtl" }}>
                  کیلکولیٹر
                </div>
                <div className="text-xs text-muted-foreground">Marble Calculator</div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Tab selector */}
        <div className="flex gap-1.5 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                tab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Calc content */}
        {tab === "area" && <AreaCalc />}
        {tab === "price" && <PriceCalc />}
        {tab === "weight" && <WeightCalc />}
        {tab === "running" && <RunningBalance />}
      </DialogContent>
    </Dialog>
  );
}
