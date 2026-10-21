# 📝 WORKLOG — 04_FRONTEND_ENGINEER

## Bitácora de Acciones
- **[Inicialización]:** Rol preparado para construcción de interfaz SPA reactiva, consumo de contratos Zod, Design System oficial y Walkthroughs versionados.

---

## 2026-10-21 — M20 · Fase 3B acotada

**Rol:** Frontend Lead Engineer · **Sello:** ✅ Firmado en turno propio

**Alcance acotado por el Product Owner:** solo infraestructura de seguridad y el servicio tipado de
privacidad. **Sin componentes ni pantallas** — un Líder Frontend dejará el design system en `core/`.

### Subroles convocados
- **02 · State & Data Flow** — store sin token, interceptor `401`, servicios tipados.
- **05 · Developer Component TDD** — 19 pruebas Vitest.
- *No se convocó* **01 · Design System Core** ni **03 · Views & UX**: su trabajo queda fuera por decreto.

### Decisiones
- **El middleware NO es control de acceso** y así se documenta en el propio archivo: solo comprueba
  la presencia de la cookie, porque validarla exigiría un viaje al servidor en cada navegación. La
  autoridad sigue en el backend (`RNF-SEG-03-01`). Confundir esto sería justo lo que `RF-SEG-03-06`
  advierte.
- **El interceptor no navega.** Limpia la sesión y recuerda el destino, pero deja la redirección a la
  vista: navegar desde un interceptor interrumpiría peticiones de fondo y pelearía con el router.
- **`consumirDestino()` limpia al leer.** Si no, una segunda expiración reutilizaría un destino viejo
  y llevaría al usuario a donde ya no quería ir.

### Verificación
`tsc` ✅ · `next lint --max-warnings=0` ✅ · `check:no-any` ✅ 58 archivos · **Vitest 19/19** ✅ ·
`next build` ✅ · backend sin regresión 36/36 ✅

**Mutación:** se hizo que `errorApi` devolviera el mensaje crudo y que el destino no se consumiera;
ambas pruebas fallaron y volvieron a pasar al restaurar.

### ⚠️ Elevado al Director Humano
**Gate 3B pide revisar la interfaz en el navegador y esta entrega no tiene interfaz.** La compuerta
no puede evaluarse como está escrita. La revisión visual corresponderá a quien construya las
pantallas sobre estos servicios.
