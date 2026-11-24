import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import "./liquid-glass.css";
import { LiquidGlassLight } from "@/components/LiquidGlassLight";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://livegridav.com"),
  title: "livegridAV — LED Screen Rental & Event AV in Delhi, across India",
  description:
    "livegridAV designs, builds and operates LED displays, naked-eye 3D, projection mapping, content and show control — Delhi-based, working across India.",
  twitter: { card: "summary_large_image" },
  openGraph: {
    title: "livegridAV — We turn ideas into unforgettable experiences",
    description:
      "AV engineering, content, LED, projection and show technology — designed, programmed and operated as one.",
    url: "https://livegridav.com",
    siteName: "livegridAV",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <LiquidGlassLight />
      </body>
    </html>
  );
}
