import type { Metadata } from "next";
import { Inter, Poppins } from 'next/font/google';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const poppins = Poppins({ weight: ["400", "600", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MediDiagnose - Diagnostic Parkinson",
  description: "Plateforme médicale intelligente pour le diagnostic de Parkinson",
  viewport: "width=device-width, initial-scale=1.0",
    generator: 'v0.app'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
