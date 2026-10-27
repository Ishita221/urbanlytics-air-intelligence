import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Urbanlytics | Air Intelligence",
  description: "Live city air quality, transparent forecasting and evidence-aware policy simulation.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
