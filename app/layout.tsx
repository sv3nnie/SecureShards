import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SecureShards | Securely split and recover secrets",
  applicationName: "SecureShards",
  description: "Securely split and recover secrets using Shamir's Secret Sharing algorithm and end-to-end encryption.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#2563EB" />
        <meta property="og:image" content="/secureshards.png" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
