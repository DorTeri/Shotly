import type { Metadata, Viewport } from "next";
import { Archivo, Assistant, Azeret_Mono } from "next/font/google";
import "./globals.css";

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "600", "700", "800"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const azeret = Azeret_Mono({
  variable: "--font-azeret",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Shotly",
  description: "The photographer captures the wedding. The guests capture everything else.",
};

export const viewport: Viewport = {
  themeColor: "#0b0808",
  // The camera is a full-screen surface on a phone held in one hand.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${assistant.variable} ${archivo.variable} ${azeret.variable}`}>
        {children}
      </body>
    </html>
  );
}
