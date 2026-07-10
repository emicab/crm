import { PrismaClient } from '@prisma/client';

export interface IElectronAPI {
  saveSaleAsPDF: () => Promise<{ success: boolean; path: string | null; error?: string }>;
  backupDatabase: () => Promise<{ success: boolean; path?: string; error?: string; canceled?: boolean }>;
  restoreDatabase: () => Promise<{ success: boolean; message?: string; error?: string; canceled?: boolean }>;
}
declare global {
  var prisma: PrismaClient | undefined;
  
  interface Window {
    electronAPI: IElectronAPI;
    licenseAPI: {
      activate: (licenseKey: string) => Promise<{ success: boolean; message: string; }>;
      check: () => Promise<{ isActivated: boolean; licenseKey?: string; }>;
    };
    updateAPI?: {
      check: () => Promise<{ status: string; version?: string; error?: string }>;
      onStatus: (callback: (status: any) => void) => () => void;
    };
  }


}

