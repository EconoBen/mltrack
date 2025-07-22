import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MLTrack - Stop experimenting. Start shipping.",
  description: "Drop-in enhancement for MLflow that adds deployment capabilities and a modern UI. Deploy ML models in minutes, not weeks.",
  keywords: ["MLflow", "machine learning", "deployment", "MLOps", "model deployment", "AI"],
  authors: [{ name: "Ben LaBaschin" }],
  openGraph: {
    title: "MLTrack - Stop experimenting. Start shipping.",
    description: "Drop-in enhancement for MLflow that adds deployment capabilities and a modern UI.",
    url: "https://mltrack.xyz",
    siteName: "MLTrack",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MLTrack - Stop experimenting. Start shipping.",
    description: "Drop-in enhancement for MLflow that adds deployment capabilities and a modern UI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}
