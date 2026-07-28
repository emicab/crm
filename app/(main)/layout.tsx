// app/(main)/layout.tsx
import LayoutComponent from '@/components/layout/Layout'; // O la ruta correcta a tu Layout
import ClinIAWidget from '@/components/ia/ClinIAWidget';
export const dynamic = 'force-dynamic'; 

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutComponent>
      {children}
      <ClinIAWidget />
    </LayoutComponent>
  );
}