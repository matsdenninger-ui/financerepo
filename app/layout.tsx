import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mein Finanz-Hub",
  description: "Persönliches Finanz-Dashboard: Einkommen, Ausgaben, Abos, Budgets & Sparziele",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
