export type TxType = "income" | "expense";

export interface Tx {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // immer positiv
  type: TxType;
  category: string;
  note?: string;
}

/** Buget pro Kategorie (monatlich), kind: subscription = monatlich wiederkehrend, fixed = fixe Kosten wie Miete */
export interface Sub {
  id: string;
  name: string;
  amount: number; // pro Monat
  day: number; // Fälligkeitstag im Monat (1-28)
  kind: "subscription" | "fixed";
  active: boolean;
}

export interface Budget {
  category: string;
  limit: number; // pro Monat
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline?: string; // YYYY-MM-DD (optional)
}

export interface FinanceData {
  transactions: Tx[];
  budgets: Budget[];
  subs: Sub[];
  goals: Goal[];
}

export const EMPTY_DATA: FinanceData = {
  transactions: [],
  budgets: [],
  subs: [],
  goals: [],
};

export const EXPENSE_CATEGORIES = [
  "Wohnen",
  "Lebensmittel",
  "Transport",
  "Restaurant/Café",
  "Shopping",
  "Abos",
  "Freizeit",
  "Gesundheit",
  "Bildung",
  "Sonstiges",
] as const;

export const INCOME_CATEGORIES = [
  "Gehalt",
  "Nebenjob",
  "Geschenke",
  "Sonstiges Einkommen",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Wohnen: "#f97316",
  Lebensmittel: "#22c55e",
  Transport: "#3b82f6",
  "Restaurant/Café": "#ef4444",
  Shopping: "#a855f7",
  Abos: "#06b6d4",
  Freizeit: "#eab308",
  Gesundheit: "#ec4899",
  Bildung: "#14b8a6",
  Sonstiges: "#6b7280",
  Gehalt: "#22c55e",
  Nebenjob: "#3b82f6",
  Geschenke: "#a855f7",
  "Sonstiges Einkommen": "#6b7280",
};

export const DEFAULT_BUDGETS: Budget[] = [
  { category: "Lebensmittel", limit: 250 },
  { category: "Restaurant/Café", limit: 100 },
  { category: "Shopping", limit: 100 },
  { category: "Freizeit", limit: 80 },
  { category: "Transport", limit: 60 },
];
