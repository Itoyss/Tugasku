import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TugasKu — Tracker Tugas Mandiri & Kelompok",
  description:
    "Tracker tugas mandiri & kelompok mahasiswa anti-ghosting dengan reminder deadline yang simpel dan nyaman dilihat.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
