"use client";

import React, { useState, useEffect } from 'react';
import ActivationScreen from './ActivationScreen';

interface LicenseGateProps {
  children: React.ReactNode;
}

const LicenseGate: React.FC<LicenseGateProps> = ({ children }) => {
    const [isLicensed, setIsLicensed] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const checkLicense = async () => {
        if (window.licenseAPI) {
            setIsLoading(true);
            const status = await window.licenseAPI.check();
            setIsLicensed(status.isActivated);
            setIsLoading(false);
        } else {
            console.warn('licenseAPI no está lista, reintentando en 100ms...');
            setTimeout(checkLicense, 100);
        }
    };

    useEffect(() => {
        checkLicense();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // El array vacío asegura que solo se llame una vez al montar el componente.

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-950">
                <div className="text-center">
                    <p className="text-lg text-gray-600 dark:text-gray-300">Verificando licencia...</p>
                </div>
            </div>
        );
    }

    if (isLicensed) {
        return <>{children}</>;
    }
    
    return <ActivationScreen onActivationSuccess={checkLicense} />;
};

export default LicenseGate;