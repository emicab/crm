// app/layout.tsx (Versión Simplificada)
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google'; // O la fuente que uses
import './globals.css';
import { Toaster } from 'react-hot-toast';
import LicenseGate from '@/components/LicenseGate';


const outfit = Outfit({ 
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ignite CRM',
  description: 'Gestión de negocios simplificada',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="es">
      <body className={`${outfit.variable} antialiased bg-background text-foreground`}>
        <Toaster position="top-right" />
        {isDev ? (
          children // En desarrollo, muestra la app directamente
        ) : (
          <LicenseGate>{children}</LicenseGate> // En producción, el "guardia" vigila
        )}
      </body>
    </html>
  );
}