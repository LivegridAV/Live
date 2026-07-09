import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

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
  title: "livegridAV — LED Displays, AV Technology & Live Event Production",
  description:
    "Step inside a live LiveGridAV production: LED display rental, Watchout programming, naked-eye 3D, live streaming and full show technology — an interactive 3D experience.",
  openGraph: {
    title: "livegridAV — Powering events with brilliant visual experiences",
    description:
      "LED walls, show control and live event technology, presented as a real-time interactive 3D venue.",
    url: "https://livegridav.com",
    siteName: "livegridAV",
  },
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/favicon.svg` },
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
