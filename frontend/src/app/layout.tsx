import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Fuentes propias (subconjunto latin): el build no depende de que el servidor llegue a Google Fonts.
const inter = localFont({
  src: './fonts/Inter-Variable.woff2',
  weight: '100 900',
  variable: '--font-inter',
});
const poppins = localFont({
  src: [
    { path: './fonts/Poppins-400.woff2', weight: '400' },
    { path: './fonts/Poppins-500.woff2', weight: '500' }, // texto de botones y badges (UI Spec §2.2)
    { path: './fonts/Poppins-600.woff2', weight: '600' },
    { path: './fonts/Poppins-700.woff2', weight: '700' },
  ],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Pintu Clic',
  description: 'Tu tienda de pinturas y revestimientos',
  // Sin esta declaración el navegador pide /favicon.ico, que no existe (404).
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${poppins.variable}`}>
      <body className="bg-neutral-lightest font-sans antialiased">{children}</body>
    </html>
  );
}
