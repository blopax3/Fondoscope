import { headers } from "next/headers";
import { Instrument_Serif, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { getI18n, resolveRequestLanguage } from "../lib/i18n";

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

export async function generateMetadata() {
  const requestHeaders = await headers();
  const language = resolveRequestLanguage(requestHeaders.get("accept-language"));
  const { metadataDescription } = getI18n(language);

  return {
    title: "Fondoscope",
    description: metadataDescription,
  };
}

export default async function RootLayout({ children }) {
  const requestHeaders = await headers();
  const language = resolveRequestLanguage(requestHeaders.get("accept-language"));
  const { htmlLang } = getI18n(language);

  return (
    <html lang={htmlLang} className={`${instrumentSerif.variable} ${outfit.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
