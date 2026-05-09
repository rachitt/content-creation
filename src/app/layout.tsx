import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enigma Labs — Content Engine",
  description: "Mine viral. Forge in voice. Ship daily.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg-0 text-ink">{children}</body>
    </html>
  );
}
