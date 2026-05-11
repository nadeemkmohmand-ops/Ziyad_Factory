/**
 * ExcelImportExport — Reusable component for importing/exporting data per section.
 * Inspired by DigiKhata / EasyKhata pattern:
 *   - "Download Template" exports an .xlsx with column headers
 *   - "Upload Data" reads .xlsx and inserts rows into Supabase
 *   - "Export Data" exports current data to .xlsx
 */
import * as XLSX from "xlsx";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileDown,
  FileUp,
  Upload,
  Download,
  Table2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ColumnDef {
  key: string;
  label: string;
  labelUrdu?: string;
  type?: "text" | "number" | "date" | "select";
  required?: boolean;
  options?: string[];
  note?: string;
}

interface Props {
  tableName: string;
  label: string;
  labelUrdu: string;
  columns: ColumnDef[];
  /** Custom transform after reading Excel row, before inserting */
  transformRow?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Called after successful import to refresh parent data */
  onImported?: () => void;
  /** Current data to export */
  data?: Record<string, unknown>[];
  /** Exclude these columns from export */
  excludeFromExport?: string[];
}

export function ExcelImportExport({
  tableName,
  label,
  labelUrdu,
  columns,
  transformRow,
  onImported,
  data,
  excludeFromExport = ["id", "created_at"],
}: Props) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [result, setResult] = useState<{
    ok: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Download Template ───────────────────────────
  const downloadTemplate = () => {
    const headers = columns.map((c) => ({
      header: `${c.label}${c.labelUrdu ? " / " + c.labelUrdu : ""}${c.required ? " *" : ""}`,
      key: c.key,
    }));
    const wsData = [
      headers.map((h) => h.header),
      // Add a sample row with hints
      columns.map((c) => {
        if (c.type === "number") return "0";
        if (c.type === "date") return "2025-01-01";
        if (c.type === "select" && c.options?.length) return c.options[0];
        if (c.note) return c.note;
        return "";
      }),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Set column widths
    ws["!cols"] = columns.map((c) => ({
      wch: Math.max(c.label.length + 5, 16),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");

    // Add a README sheet
    const readmeRows = [
      ["Column", "Description / تفصیل", "Required / ضروری", "Type", "Options"],
      ...columns.map((c) => [
        c.key,
        `${c.label}${c.labelUrdu ? " / " + c.labelUrdu : ""}`,
        c.required ? "Yes / ہاں" : "No / نہیں",
        c.type ?? "text",
        c.options?.join(", ") ?? "",
      ]),
    ];
    const readmeWs = XLSX.utils.aoa_to_sheet(readmeRows);
    XLSX.utils.book_append_sheet(wb, readmeWs, "README");

    XLSX.writeFile(wb, `${tableName}_template.xlsx`);
    toast.success("ٹیمپلیٹ ڈاؤن لوڈ ہوئی / Template downloaded");
  };

  // ─── Export Current Data ─────────────────────────
  const exportData = async () => {
    const rows = data ?? (await fetchTableData());
    if (rows.length === 0) {
      toast.error("ڈیٹا نہیں ملا / No data to export");
      return;
    }
    // Filter out excluded columns and format
    const filtered = rows.map((row) => {
      const out: Record<string, unknown> = {};
      columns.forEach((c) => {
        out[`${c.label}${c.labelUrdu ? " / " + c.labelUrdu : ""}`] =
          row[c.key] ?? "";
      });
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(filtered);
    ws["!cols"] = columns.map((c) => ({
      wch: Math.max(c.label.length + 5, 16),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31));
    XLSX.writeFile(wb, `${tableName}_data_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`ایکسپورٹ ہو گیا / Exported ${rows.length} rows`);
  };

  const fetchTableData = async () => {
    const { data } = await supabase.from(tableName).select("*");
    return (data ?? []) as Record<string, unknown>[];
  };

  // ─── Parse Uploaded File ─────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const ab = ev.target?.result;
        const wb = XLSX.read(ab, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        if (rows.length === 0) {
          toast.error("فائل خالی ہے / File is empty");
          return;
        }
        // Map header names back to keys
        const mapped = rows.map((row) => {
          const out: Record<string, unknown> = {};
          columns.forEach((c) => {
            const headerKey = `${c.label}${c.labelUrdu ? " / " + c.labelUrdu : ""}`;
            // Try both the full header and just the key
            const val = row[headerKey] ?? row[c.key] ?? "";
            out[c.key] = val;
          });
          return out;
        });
        setPreview(mapped);
        setResult(null);
      } catch {
        toast.error("فائل پڑھنے میں مسئلہ / Failed to read file");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ─── Import to Supabase ──────────────────────────
  const doImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    let ok = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches of 25
    for (let i = 0; i < preview.length; i += 25) {
      const batch = preview.slice(i, i + 25);
      const rows = batch.map((row) => {
        let processed = { ...row };
        // Convert number fields
        columns.forEach((c) => {
          if (c.type === "number" && processed[c.key] !== undefined && processed[c.key] !== "") {
            (processed as Record<string, unknown>)[c.key] = Number(processed[c.key]);
          }
          // Remove empty strings (set to null)
          if (processed[c.key] === "" || processed[c.key] === undefined) {
            (processed as Record<string, unknown>)[c.key] = null;
          }
        });
        // Remove id/created_at if present
        delete processed.id;
        delete processed.created_at;
        // Apply custom transform
        if (transformRow) processed = transformRow(processed);
        return processed;
      });

      const { error } = await supabase.from(tableName).insert(rows);
      if (error) {
        failed += batch.length;
        errors.push(error.message);
      } else {
        ok += batch.length;
      }
    }

    setResult({ ok, failed, errors });
    setImporting(false);
    if (ok > 0 && onImported) onImported();
    if (ok > 0) toast.success(`${ok} ریکارڈ درآمد ہوئے / ${ok} rows imported`);
    if (failed > 0) toast.error(`${failed} ریکارڈ ناکام / ${failed} rows failed`);
  };

  const close = () => {
    setOpen(false);
    setPreview([]);
    setResult(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Table2 className="h-3.5 w-3.5" />
          <span className="font-urdu">ٹیمپلیٹ</span> / Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        >
          <FileUp className="h-3.5 w-3.5" />
          <span className="font-urdu">اپ لوڈ</span> / Upload
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportData}
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        >
          <FileDown className="h-3.5 w-3.5" />
          <span className="font-urdu">ایکسپورٹ</span> / Export
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <div className="font-urdu text-xl text-primary" style={{ direction: "rtl" }}>
                {labelUrdu} — درآمد / Import
              </div>
              <div className="text-sm text-muted-foreground">
                Upload Excel file for {label}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Download template */}
            <Card className="p-4 border-primary/20">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
                  <Download className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    مرحلہ ۱: ٹیمپلیٹ ڈاؤن لوڈ کریں / Step 1: Download Template
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-urdu" style={{ direction: "rtl" }}>
                    پہلے ٹیمپلیٹ ڈاؤن لوڈ کریں، اس میں اپنا ڈیٹا بھریں، پھر اپ لوڈ کریں۔
                    کالم کے نام تبدیل نہ کریں۔
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadTemplate}
                    className="mt-2 gap-1"
                  >
                    <Table2 className="h-3.5 w-3.5" /> Download Template
                  </Button>
                </div>
              </div>
            </Card>

            {/* Step 2: Upload file */}
            <Card className="p-4 border-primary/20">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    مرحلہ ۲: فائل اپ لوڈ کریں / Step 2: Upload File
                  </div>
                  <div className="mt-2">
                    <Label htmlFor="excel-import" className="cursor-pointer">
                      <div className="border-2 border-dashed border-primary/20 rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
                        <FileUp className="h-8 w-8 text-primary/40 mx-auto mb-2" />
                        <div className="text-sm text-muted-foreground font-urdu" style={{ direction: "rtl" }}>
                          ایکسل فائل منتخب کریں (.xlsx)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Select Excel file (.xlsx)
                        </div>
                      </div>
                    </Label>
                    <Input
                      id="excel-import"
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFile}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Preview */}
            {preview.length > 0 && !result && (
              <Card className="p-4 border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium font-urdu text-primary" style={{ direction: "rtl" }}>
                    جائزہ / Preview — {preview.length} ریکارڈ
                  </div>
                  <Badge variant="outline" className="text-primary">
                    {preview.length} rows
                  </Badge>
                </div>
                <div className="overflow-x-auto max-h-48 overflow-y-auto rounded border border-border/30">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/40">
                        {columns.map((c) => (
                          <th key={c.key} className="text-left p-2 border-b border-border/30 font-medium">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-card/60">
                          {columns.map((c) => (
                            <td key={c.key} className="p-2 border-b border-border/20">
                              {String(row[c.key] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {preview.length > 10 && (
                        <tr>
                          <td
                            colSpan={columns.length}
                            className="p-2 text-center text-muted-foreground text-xs"
                          >
                            ... اور {preview.length - 10} مزید / {preview.length - 10} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={close} className="flex-1 font-urdu">
                    منسوخ / Cancel
                  </Button>
                  <Button
                    onClick={doImport}
                    disabled={importing}
                    className="flex-1 bg-primary text-primary-foreground font-urdu"
                  >
                    {importing ? "درآمد ہو رہی ہے..." : `درآمد کریں / Import ${preview.length} rows`}
                  </Button>
                </div>
              </Card>
            )}

            {/* Result */}
            {result && (
              <Card className="p-4 border-primary/20">
                <div className="flex items-start gap-3">
                  {result.failed === 0 ? (
                    <CheckCircle2 className="h-8 w-8 text-success shrink-0" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-warning shrink-0" />
                  )}
                  <div>
                    <div className="font-medium font-urdu text-lg" style={{ direction: "rtl" }}>
                      درآمد مکمل / Import Complete
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="text-sm text-success">
                        کامیاب / Success: {result.ok} ریکارڈ
                      </div>
                      {result.failed > 0 && (
                        <div className="text-sm text-destructive">
                          ناکام / Failed: {result.failed} ریکارڈ
                        </div>
                      )}
                      {result.errors.map((e, i) => (
                        <div key={i} className="text-xs text-destructive/80">
                          {e}
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={close}
                      className="mt-3 bg-primary text-primary-foreground font-urdu"
                    >
                      ٹھیک ہے / OK
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Column reference */}
            <div className="border-t pt-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                کالم کی معلومات / Column Reference
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {columns.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-center gap-1.5 text-xs p-1.5 rounded bg-muted/30"
                  >
                    <span className="font-medium text-foreground">{c.label}</span>
                    {c.required && <span className="text-destructive">*</span>}
                    <span className="text-muted-foreground">
                      ({c.type ?? "text"})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
