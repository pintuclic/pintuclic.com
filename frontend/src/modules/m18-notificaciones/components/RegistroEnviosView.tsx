'use client';

import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Badge, Skeleton } from '@/core/components';
import { useRegistroEnviosStore } from '../store/registroEnviosStore';
import { NotificacionesPagination } from './NotificacionesPagination';

function badgeDeEstado(estado: string): 'action' | 'success' | 'danger' {
  if (estado === 'enviado') return 'success';
  if (estado === 'fallido') return 'danger';
  return 'action';
}

export const RegistroEnviosView: React.FC = () => {
  const {
    envios,
    totalEnvios,
    paginaEnvios,
    limiteEnvios,
    cargandoEnvios,
    rebotes,
    totalRebotes,
    paginaRebotes,
    limiteRebotes,
    cargandoRebotes,
    error,
    cargarEnvios,
    establecerPaginaEnvios,
    cargarRebotes,
    establecerPaginaRebotes,
  } = useRegistroEnviosStore();

  useEffect(() => {
    void cargarEnvios();
    void cargarRebotes();
  }, [cargarEnvios, cargarRebotes]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/30 rounded-card flex items-center gap-2 text-xs text-danger font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-neutral-white border border-neutral-light/70 rounded-card shadow-card overflow-hidden">
        <div className="p-4 border-b border-neutral-light/60">
          <h3 className="font-title font-bold text-sm text-corporate">Registro de envíos (RT-23)</h3>
        </div>
        {cargandoEnvios ? (
          <div className="p-4"><Skeleton className="h-32 w-full" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-lightest text-neutral-medium uppercase">
                <tr>
                  <th className="text-left p-3">Destinatario</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3">Intentos</th>
                  <th className="text-left p-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {envios.map((envio) => (
                  <tr key={envio.idEnvio} className="border-t border-neutral-light/50">
                    <td className="p-3 font-mono">{envio.destinatario}</td>
                    <td className="p-3">{envio.tipo}</td>
                    <td className="p-3"><Badge variant={badgeDeEstado(envio.estado)}>{envio.estado}</Badge></td>
                    <td className="p-3">{envio.intentos}/{envio.maxIntentos}</td>
                    <td className="p-3">{new Date(envio.fechaCreacion).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
                {envios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-neutral-medium">Sin envíos registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <NotificacionesPagination
          total={totalEnvios}
          pagina={paginaEnvios}
          limite={limiteEnvios}
          totalPaginas={Math.max(1, Math.ceil(totalEnvios / limiteEnvios))}
          etiquetaItem="envíos"
          onCambiarPagina={establecerPaginaEnvios}
        />
      </div>

      <div className="bg-neutral-white border border-neutral-light/70 rounded-card shadow-card overflow-hidden">
        <div className="p-4 border-b border-neutral-light/60">
          <h3 className="font-title font-bold text-sm text-corporate">Rebotes de entrega (HU-NOT-04)</h3>
        </div>
        {cargandoRebotes ? (
          <div className="p-4"><Skeleton className="h-32 w-full" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-neutral-lightest text-neutral-medium uppercase">
                <tr>
                  <th className="text-left p-3">Destinatario</th>
                  <th className="text-left p-3">Motivo</th>
                  <th className="text-left p-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {rebotes.map((rebote) => (
                  <tr key={rebote.idRebote} className="border-t border-neutral-light/50">
                    <td className="p-3 font-mono">{rebote.destinatario}</td>
                    <td className="p-3">{rebote.motivo ?? '—'}</td>
                    <td className="p-3">{new Date(rebote.fechaRegistro).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
                {rebotes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-neutral-medium">Sin rebotes registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <NotificacionesPagination
          total={totalRebotes}
          pagina={paginaRebotes}
          limite={limiteRebotes}
          totalPaginas={Math.max(1, Math.ceil(totalRebotes / limiteRebotes))}
          etiquetaItem="rebotes"
          onCambiarPagina={establecerPaginaRebotes}
        />
      </div>
    </div>
  );
};
