import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATFM OS Capital",
  description: "Système d'exploitation du groupe ATFM Legacy",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
