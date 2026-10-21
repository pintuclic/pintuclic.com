# 🎨 REGLAS TÉCNICAS OBLIGATORIAS: FRONTEND

Stack Confirmado: `Next.js 15` + `React 19` + `Tailwind CSS 4` + `Zustand 5` + `React Hook Form` + `Zod 4` + `Axios`.

---

## 1. Sistema de Diseño y Tokens (Directiva #8 e Innegociable)
1. **Tokens Oficiales Exclusivos:** Todo estilo visual debe usar exclusivamente los tokens de `frontend/src/core/theme/colors.ts`:
   - `corporate`, `action`, `subaction`, `conversion`, `highlight`, `neutral-*`.
2. **Prohibición Absoluta de Colores Arbitrarios:** Queda terminantemente PROHIBIDO usar clases hexadecimales inline como `bg-[#002855]`, `text-purple-600` o colores genéricos de Tailwind no aprobados.
3. **Uso Obligatorio del Core Kit (Directiva #13):**
   - Construir todas las vistas usando los componentes base de `frontend/src/core/components/`:
     `Button`, `Input`, `Checkbox`, `Modal`, `ProductCard`, `Badge`, `Skeleton`.
   - Prohibido maquetar botones, modales o inputs ad-hoc desde cero.

---

## 2. Formularios y Arquitectura de DTOs (Directiva #12)
1. **Prohibido Zod Inline en `.tsx`:** Ningún componente o página React puede declarar esquemas Zod inline.
2. **Ubicación de DTOs:**
   - DTOs globales/transversales: `frontend/src/core/dtos/`.
   - DTOs específicos de módulo: `frontend/src/modules/m[xx]-[nombre]/dtos/`.
3. **Integración con Formularios:** Usar obligatoriamente `react-hook-form` con `zodResolver(miSchemaDto)`.
4. **Interfaces sin Runtime:** Carpetas `interfaces/` contienen únicamente tipos (`type`, `interface`) sin código ejecutable.

---

## 3. Accesibilidad y Calidad (Zero Warnings)
1. En `frontend/` ejecutar antes de dar por cerrada una tarea:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run lint:a11y
   npm test
   ```
2. Garantizar atributos ARIA en diálogos (`aria-labelledby`), trampas de foco y navegación por teclado en elementos interactivos.
