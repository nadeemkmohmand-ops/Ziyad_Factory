export const PKR = (n: number | null | undefined) => {
  const v = Number(n ?? 0);
  return "₨ " + v.toLocaleString("en-PK", { maximumFractionDigits: 2 });
};

export const num = (n: number | null | undefined, digits = 2) =>
  Number(n ?? 0).toLocaleString("en-PK", { maximumFractionDigits: digits });

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const monthLabel = (m: number, y: number) =>
  new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
