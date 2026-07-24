import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Banheiras e Amostras | Ekko Revestimentos",
  description:
    "Controle de banheiras, amostras, localizações e movimentações da Ekko Revestimentos.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Sistema de Banheiras e Amostras",
    description: "Gestão visual e rastreabilidade para a Ekko Revestimentos.",
    images: [{ url: "/social-preview.png", width: 1728, height: 912 }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
