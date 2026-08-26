import type { Metadata, Viewport } from "next";
import { Archivo, Assistant, Azeret_Mono, Quicksand } from "next/font/google";
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

// The logo's lettering: soft, rounded, low contrast. Used for the wordmark only.
const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const azeret = Azeret_Mono({
  variable: "--font-azeret",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Shotly",
  description: "הצלם מצלם את החתונה. האורחים מצלמים את כל השאר.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Shotly",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#14100f",
  // The camera is a full-screen surface on a phone held in one hand.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The font variables go on <html>, not <body>. The theme tokens that consume
  // them (--font-sans, --font-brand, …) are declared at :root, and a custom
  // property is substituted in the scope it is *declared* in — so a --font-*
  // defined only on <body> is undefined there, which makes the whole token
  // invalid and silently drops every face back to the system stack.
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${assistant.variable} ${archivo.variable} ${quicksand.variable} ${azeret.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
