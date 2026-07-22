"use client";

import React, { useState } from 'react';
import { Loader2, ArrowRight, XCircle } from 'lucide-react';

interface ActivationScreenProps {
  onActivationSuccess: () => void;
  onContinueFree: () => void;
}

const ActivationScreen: React.FC<ActivationScreenProps> = ({ onActivationSuccess, onContinueFree }) => {
    const [licenseKey, setLicenseKey] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');

    const handleActivate = async () => {
        if (!licenseKey) {
            setMessage('Por favor, introduce una clave de licencia.');
            return;
        }
        setIsLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/license/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licenseKey })
            });
            const data = await res.json();
            
            setIsLoading(false);

            if (res.ok) {
                setMessage(data.message || 'Licencia activada con éxito');
                setTimeout(onActivationSuccess, 1500);
            } else {
                setMessage(`Error: ${data.message || 'Error al activar'}`);
            }
        } catch (error) {
            setIsLoading(false);
            setMessage('Error: No se pudo conectar con el servidor.');
        }
    };

    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
            <div className="w-full max-w-md space-y-6 rounded-2xl bg-white dark:bg-gray-900 p-8 shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                        ClinPOS
                    </h1>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Ingresá tu clave de licencia para desbloquear todas las funciones, o continuá gratis con funciones limitadas.
                    </p>
                </div>
                <div className="space-y-3">
                    <div>
                        <label htmlFor="licenseKey" className="sr-only">Clave de Licencia</label>
                        <input
                            id="licenseKey"
                            name="licenseKey"
                            type="text"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value)}
                            disabled={isLoading}
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                            className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 text-center tracking-widest uppercase font-mono"
                        />
                    </div>
                    <button
                        onClick={handleActivate}
                        disabled={isLoading}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin mr-2" /> : <ArrowRight size={18} className="mr-2" />}
                        {isLoading ? 'Activando...' : 'Activar Licencia'}
                    </button>
                </div>
                {message && (
                    <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                        {message.startsWith('Error') ? <XCircle size={16} className="inline mr-1" /> : null}
                        {message}
                    </p>
                )}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-white dark:bg-gray-900 px-2 text-gray-400">O</span>
                    </div>
                </div>
                <button
                    onClick={onContinueFree}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Continuar en modo gratuito
                </button>
                <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                    Modo gratuito: hasta 2 vendedores, 2 órdenes de compra activas, 100 ventas/mes, 50 productos.
                </p>
            </div>
        </main>
    );
};

export default ActivationScreen;
