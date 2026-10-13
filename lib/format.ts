export const eur = (n: number): string =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })
    .format(n);

/** Akzeptiert "12,50" und "12.50" */
export const parseAmount = (s: string): number => {
  const v = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : NaN;
};

/** lokal, kein UTC-Off-by-one */
export const todayISO = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export const ymOf = (iso: string): string => iso.slice(0, 7);

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const monthLabel = (ym: string): string =>
  new Date(`${ym}-01T12:00:00`).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

export const dayLabel = (iso: string): string =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}
