import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutClient } from "./layout-client";
import { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ResolveFast - Complaint Management Simplified",
  description: "Streamline your complaint resolution process with ResolveFast",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
