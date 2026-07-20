import type { Metadata } from 'next';
import { Outfit } from 'next/font/google'; // O la fuente que uses
import './globals.css';
import { Toaster } from 'react-hot-toast';
import LicenseGate from '@/components/LicenseGate';
import { ModuleProvider } from '@/hooks/useModules';
import GlobalGateways from '@/components/auth/GlobalGateways';

const outfit = Outfit({ 
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ClinPOS',
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
        <ModuleProvider>
          <Toaster position="top-right" />
          {isDev ? (
            children // En desarrollo, muestra la app directamente
          ) : (
            <LicenseGate>{children}</LicenseGate> // En producción, el "guardia" vigila
          )}
          <GlobalGateways />
        </ModuleProvider>
      </body>
    </html>
  );
}