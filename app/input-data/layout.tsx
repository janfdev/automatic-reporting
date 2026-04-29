import React from "react";
import { Metadata } from "next";
import ThemeProvider from "@/components/themes/theme-provider";

export const metadata: Metadata = {
  title: "Input Data",
  description: "Halaman input data kasir"
};

export default function InputDataLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning={true}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex-1 min-h-screen">{children}</div>
      </ThemeProvider>
    </html>
  );
}
