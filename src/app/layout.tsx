import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";
import "./globals.css";

// Variable fonts: one file per family instead of a file per weight.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

// The boards load Newsreader with its optical-size axis (opsz 6–72). Without it every
// heading uses the 16px text cut, which looks heavy and loose at display sizes.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Dr. Nneoma Oparaji · Virtual care",
    template: "%s · Dr. Nneoma Oparaji",
  },
  description:
    "Virtual obesity, lifestyle and internal medicine care for African families in Houston, Lagos and between.",
};

export const viewport: Viewport = {
  themeColor: "#17604B",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
