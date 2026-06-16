import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Evaluation & Observability Platform",
  description: "Dashboard for LLM eval runs, regressions, traces, cost, latency, and human review."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
