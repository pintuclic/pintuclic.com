import React from 'react';
import type { Metadata } from 'next';
import { AdminShell } from './AdminShell';

export const metadata: Metadata = {
  title: 'Panel Administrativo — Pintu Clic',
  description: 'Sistema integral de administración, gestión de colaboradores y permisos de Pintu Clic.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}