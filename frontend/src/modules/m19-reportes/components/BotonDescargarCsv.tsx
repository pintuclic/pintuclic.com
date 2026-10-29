'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Alert, Button } from '@/core/components';
import { mensajeDeError } from '@/core/utils/errorApi';
import { descargarCsv } from '../services/reportes-api';

/** Descarga el reporte que se está viendo, con el mismo rango. Sin el permiso de exportar, el servidor responde 404 y aquí se explica. */
export const BotonDescargarCsv: React.FC<{ ruta: string; params: Record<string, string | number> }> = ({ ruta, params }) => {
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bajar = async (): Promise<void> => {
    setBajando(true);
    setError(null);
    try {
      await descargarCsv(ruta, params);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(status === 404 ? 'Tu cuenta no tiene permiso para descargar reportes.' : mensajeDeError(err));
    } finally {
      setBajando(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" aria-hidden="true" />} onClick={() => void bajar()} isLoading={bajando}>
        Descargar CSV
      </Button>
      {error !== null && <Alert variant="warning">{error}</Alert>}
    </div>
  );
};
