import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "APOY - Add Photos, Originate Yours",
  description:
    "Professional AI-powered photo curation and editing workspace for RAW and high-quality images.",
  keywords: [
    "APOY",
    "photo editing",
    "RAW",
    "AI photo curation",
    "photography workspace",
  ],
  authors: [{ name: "Pusat Humas dan Keterbukaan Informasi" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased bg-background text-on-background">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
