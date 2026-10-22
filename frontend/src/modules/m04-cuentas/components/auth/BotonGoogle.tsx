import { Button } from '@/core/components';

/**
 * "Continuar con Google" (mockup pág. 3). Decisión del Director (2026-10-22):
 * visible pero deshabilitado hasta tener credenciales OAuth reales (HU-CUE-02).
 * El logotipo de Google es la única excepción de color: es una marca de terceros.
 */
export function BotonGoogle() {
  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        fullWidth
        disabled
        aria-describedby="google-proximamente"
        className="border border-neutral-light"
        leftIcon={
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
          </svg>
        }
      >
        Continuar con Google
      </Button>
      <span id="google-proximamente" className="font-sans text-xs text-neutral-medium">
        Próximamente
      </span>
    </div>
  );
}
