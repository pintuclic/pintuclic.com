import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'], // 500: texto de botones y badges (UI Spec §2.2)
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
