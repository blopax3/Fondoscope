import { Instrument_Serif, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--fi-display",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--fi-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--fi-mono",
  display: "swap",
});

export const metadata = {
  title: "FI Comparison",
  description: "Histórico interactivo de fondos de inversión por ISIN",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${instrumentSerif.variable} ${outfit.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
