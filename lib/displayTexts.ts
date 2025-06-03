// lib/displayTexts.ts
import { PaymentTypeEnum } from '@/types'; // Asegúrate que la ruta a tus tipos sea correcta

// Este es el mapeo de los valores del enum a sus representaciones en español
export const paymentTypeDisplayMap: Record<PaymentTypeEnum, string> = {
  [PaymentTypeEnum.CASH]: 'Efectivo',
  [PaymentTypeEnum.TRANSFER]: 'Transferencia',
  [PaymentTypeEnum.CARD]: 'Tarjeta',
  [PaymentTypeEnum.OTHER]: 'Otro',
};

// Esta función tomará el valor del enum (o un string) y devolverá el texto en español
export function getPaymentTypeDisplay(paymentType: PaymentTypeEnum | string | undefined | null): string {
  if (!paymentType) {
    return '-'; // O lo que prefieras mostrar para valores nulos o indefinidos
  }
  
  // Comprobamos si el paymentType es una clave válida en nuestro mapa
  if (paymentTypeDisplayMap.hasOwnProperty(paymentType as PaymentTypeEnum)) {
    return paymentTypeDisplayMap[paymentType as PaymentTypeEnum];
  }
  
  // Si no se encuentra en el mapa (por si acaso o si es un valor inesperado), devolvemos el valor original
  return String(paymentType); 
}