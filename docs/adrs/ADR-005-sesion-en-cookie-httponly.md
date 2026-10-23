# ADR-005 — La sesión viaja en cookie HttpOnly, no en localStorage

> **Estado:** PROPUESTO (ratificable en Gate 2) · **Fecha:** 2026-10-21
> **Decide:** Software Architect Lead · **Módulo:** M20

## Contexto
`RNF-SEG-02-01` exige que el identificador de sesión *"no debe ser accesible desde el código de la
página"*. El esqueleto actual del frontend hace exactamente lo contrario:

```typescript
// frontend/src/core/api/apiClient.ts
const token = localStorage.getItem('access_token');
```

Cualquier script de la página —propio, de una dependencia o inyectado por XSS— puede leer
`localStorage`. El requisito está **incumplido hoy**.

## Decisión
El identificador de sesión viaja en una cookie con atributos fijados **en el contrato**, no en la
implementación:

```typescript
export const ATRIBUTOS_COOKIE_SESION = {
  nombre: 'pc_sid', httpOnly: true, secure: true, sameSite: 'strict', path: '/',
};
```

`apiClient.ts` deja de leer y adjuntar el token a mano y pasa a `withCredentials: true`.

## Consecuencias

**Positivas**
- `httpOnly` hace el requisito **estructural**: el código de la página no puede leer la cookie
  aunque quiera.
- `sameSite: 'strict'` mitiga CSRF, que es el riesgo que las cookies introducen frente a los *bearer tokens*.
- El Escenario 8 de HU-SEG-02 pasa a ser **aserción automatizable** sobre atributos, no inspección manual.

**Negativas / aceptadas**
- Toca `frontend/src/core/api/apiClient.ts`, que es código **compartido** de `core/`. Autorizado por
  el Product Owner: el esqueleto del frontend fue clonado y no es fuente de verdad.
- El backend debe emitir CORS con `credentials` y origen explícito; no admite `*`.
- Los futuros clientes no-navegador (si los hubiera) necesitarán otro mecanismo. Hoy no existen.
