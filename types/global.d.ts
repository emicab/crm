import { PrismaClient } from '@prisma/client';

export interface IElectronAPI {
  saveSaleAsPDF: () => Promise<{ success: boolean; path: string | null; error?: string }>;
}
declare global {
  var prisma: PrismaClient | undefined;
  
  interface Window {
    electronAPI: IElectronAPI;
    licenseAPI: {
      activate: (licenseKey: string) => Promise<{ success: boolean; message: string; }>;
      check: () => Promise<{ isActivated: boolean; licenseKey: string; }>;
    };
  }


}

