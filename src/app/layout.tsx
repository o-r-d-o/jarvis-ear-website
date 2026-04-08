import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai.ordospaces.com";

export const metadata: Metadata = {
  title: "Ordo — AI-Powered Behind-Ear Wearable with Camera",
  description:
    "Ordo is a lightweight 18g behind-ear AI wearable with a 2MP camera. Voice commands to send Slack messages, create GitHub issues, take notes — hands-free.",
  keywords: [
    "AI wearable",
    "smart earpiece",
    "behind-ear device",
    "voice assistant",
    "camera earbuds",
    "AI copilot",
    "hands-free productivity",
    "ESP32",
    "Ordo",
  ],
  authors: [{ name: "Ordo" }],
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Ordo — AI Copilot, Behind Your Ear",
    description:
      "18g behind-ear wearable with 2MP camera. Voice-to-action: Slack, GitHub, Calendar, Notes — all hands-free.",
    siteName: "Ordo",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ordo — AI Copilot, Behind Your Ear",
    description: "18g behind-ear wearable with 2MP camera. Voice-to-action for developers.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/ordo.jpg",
    apple: "/ordo.jpg",
  },
  other: {
    "theme-color": "#0a0a0a",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: "Ordo",
              description:
                "AI-powered behind-ear wearable with 2MP camera. Voice commands to send Slack messages, create GitHub issues, manage calendar, and take notes — all hands-free.",
              brand: { "@type": "Brand", name: "Ordo" },
              category: "Wearable Technology",
              image: `${siteUrl}/og-image.png`,
              url: siteUrl,
              manufacturer: {
                "@type": "Organization",
                name: "Ordo",
                url: siteUrl,
              },
              weight: { "@type": "QuantitativeValue", value: "18", unitCode: "GRM" },
              additionalProperty: [
                { "@type": "PropertyValue", name: "Camera", value: "OV2640 2MP" },
                { "@type": "PropertyValue", name: "MCU", value: "ESP32-S3" },
                { "@type": "PropertyValue", name: "Battery", value: "400mAh LiPo" },
                { "@type": "PropertyValue", name: "Connectivity", value: "WiFi + BLE 5.0" },
              ],
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {/* Film grain overlay */}
        <div className="grain" aria-hidden="true" />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
