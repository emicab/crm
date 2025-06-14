"use client";

import React, { useState } from 'react';

interface ActivationScreenProps {
  onActivationSuccess: () => void;
}

const ActivationScreen: React.FC<ActivationScreenProps> = ({ onActivationSuccess }) => {
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

        const result = await window.licenseAPI.activate(licenseKey);
        setIsLoading(false);

        if (result.success) {
            setMessage(result.message);
            setTimeout(onActivationSuccess, 1500);
        } else {
            setMessage(`Error: ${result.message}`);
        }
    };

    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
            <div className="w-full max-w-md space-y-6 rounded-2xl bg-white dark:bg-gray-900 p-8 shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                        Activación del Producto
                    </h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                        Introduce tu clave de licencia para desbloquear el CRM.
                    </p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="licenseKey" className="sr-only">Clave de Licencia</label>
                        <input
                            id="licenseKey"
                            name="licenseKey"
                            type="text"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value)}
                            disabled={isLoading}
                            placeholder="CRM-XXXX-XXXX-XXXX"
                            className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
                        />
                    </div>
                    <button
                        onClick={handleActivate}
                        disabled={isLoading}
                        className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isLoading ? 'Activando...' : 'Activar Licencia'}
                    </button>
                </div>
                {message && (
                    <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                        {message}
                    </p>
                )}
            </div>
        </main>
    );
};

export default ActivationScreen;