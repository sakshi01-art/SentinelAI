import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SentinelAI — Intelligent Intrusion Detection Platform",
  description:
    "AI-powered Security Operations Center: Intrusion detection, threat analytics, and real-time security monitoring platform.",
  keywords: ["cybersecurity", "intrusion detection", "SIEM", "SOC", "threat intelligence"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="matrix-bg min-h-screen antialiased">{children}</body>
    </html>
  );
}
