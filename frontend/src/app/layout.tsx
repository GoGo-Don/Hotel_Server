import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hotel Services",
  description: "Request room services",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#c9973a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
