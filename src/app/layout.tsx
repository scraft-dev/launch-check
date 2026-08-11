import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Launch Check | Website Quality Scan",
  description:
    "Check website availability, speed, SEO, accessibility, and broken links before launch.",
  metadataBase: new URL("https://launch-check-five.vercel.app"),
  openGraph: {
    title: "Launch Check",
    description:
      "Find website issues and prioritize what to fix before launch.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
