import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prisma | Conexão Terapêutica & Escolar ABA',
  description: 'Plataforma integrada de registro escolar, intervenção ABA e acompanhamento familiar.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Prisma',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#4F46E5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Ícones para dispositivos Apple */}
        <link rel="apple-touch-icon" href="/logo.png" sizes="180x180" />
        <link rel="apple-touch-icon-precomposed" href="/logo.png" />
        
        {/* Meta tags para PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Prisma" />
        
        {/* Ícone para Android/Chrome */}
        <link rel="icon" href="/logo.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/logo.png" type="image/png" sizes="512x512" />
        
        {/* Meta tag para compartilhamento */}
        <meta property="og:title" content="Prisma - Conexão Terapêutica & Escolar ABA" />
        <meta property="og:description" content="Plataforma integrada de registro escolar, intervenção ABA e acompanhamento familiar." />
        <meta property="og:image" content="/logo.png" />
        <meta property="og:type" content="website" />
      </head>
      <body className="bg-slate-50 text-slate-800 antialiased min-h-screen selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
