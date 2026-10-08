import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const newsreader = Newsreader({ 
  subsets: ["latin"],
  style: ['italic'],
  variable: "--font-newsreader",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Halte Ad Intelligence",
  description: "Internal Meta Ads reporting and lead-attribution tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${newsreader.variable} font-sans antialiased text-ink bg-bg min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
