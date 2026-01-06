import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fust Beheer Systeem",
  description: "Systeem voor het bijhouden van fust mutaties",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}

