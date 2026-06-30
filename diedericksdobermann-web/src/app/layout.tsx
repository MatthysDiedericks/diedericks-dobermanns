import type { Metadata } from "next";
import { Cinzel, Lato } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "700", "900"],
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  weight: ["300", "400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://diedericksdobermanns.com"),
  title: {
    default: "Diedericks Dobermanns | Precision Bred. Professionally Trained.",
    template: "%s | Diedericks Dobermanns",
  },
  description:
    "Premium European Dobermanns — precision bred, professionally trained, and lifetime proven. Protection dogs, elite developed puppies, and family companions.",
  openGraph: {
    title: "Diedericks Dobermanns",
    description:
      "Premium European Dobermanns — precision bred, professionally trained, and lifetime proven.",
    images: ["/og-image.jpg"],
    type: "website",
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
      className={`${cinzel.variable} ${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text">
        {children}
      </body>
    </html>
  );
}
