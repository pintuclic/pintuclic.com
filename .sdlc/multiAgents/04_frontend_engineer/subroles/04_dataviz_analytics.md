# 📊 SUBROL FRONTEND 04: DataViz & Analytics Specialist

> **Área:** Analítica Visual, Gráficas Interactivas con Apache ECharts y Dashboards Ejecutivos  
> **Líder Inmediato:** Frontend Lead Engineer (`04_frontend_engineer/ROLE.md`)  
> **Directorio de Acción:** `frontend/src/views/dashboards/`, `frontend/src/core/components/charts/`  
> **Tecnologías Clave:** Librería de gráficas compatible con React (a definir vía RFC), React 19 Hooks (`useEffect`, `useRef`, `useMemo`), TypeScript

---

## 1. ¿Qué es este Subrol?
Es el **maestro de la visualización de datos y los tableros de control**. Es el especialista encargado de transformar millones de bytes de información relacional en gráficas interactivas, claras y elegantes que permiten a los directivos, operadores y administradores entender el estado del negocio en segundos.

---

## 2. ¿Para qué fue Creado?
Fue creado para elevar el nivel visual y analítico de la plataforma más allá de simples tablas de texto. Asegura que los tableros de control sean dinámicos, completamente interactivos, reactivos a la resolución de pantalla y alimentados al **100% por la base de datos en tiempo real (cero datos estáticos o falsos)**.

---

## 3. ¿Cómo y Cuándo Utilizarlo? (Gatillos de Activación)
El Frontend Lead debe activar este subrol cuando:
* Se implementa o actualiza el dashboard interactivo de cualquiera de los roles del sistema (`admin_general`, `manager`, `operador`, `auditor`).
* Se requiere integrar gráficos de ECharts (barras, donas, líneas, curvas de área, dispersión o semáforos evaluativos).
* Se diseñan widgets analíticos de KPIs macro o institucionales.
* Se requiere optimizar el rendimiento de renderizado gráfico o corregir problemas de redimensionamiento en pantallas widescreen o móviles.

---

## 4. ¿Cómo se Integra con los Demás Subroles?
```mermaid
graph LR
    DS[01_Design System] -->|Paleta de colores oficial y tipografía| DV[04_DataViz Specialist]
    SF[02_State & Data Flow] -->|Endpoints macro y datasets en vivo| DV
    DV -->|Vistas de Dashboards interactivos| UX[03_Views & Routing]
```
* **Con Design System & Core UI:** Utiliza estrictamente los tokens de `PINTUCLIC_COLORS` (`frontend/src/core/theme/colors.ts`) para las series de las gráficas — `corporate`, `action`, `conversion`, `highlight`, `offer` y la escala `neutral-*` — asegurando armonía visual con el resto de la UI. **Prohibido** declarar hexadecimales en la configuración de las gráficas; si falta un color de serie, se propone un token nuevo vía RFC.
* **Con State & Data Flow:** Consume las estadísticas agregadas emitidas por el Backend mediante `apiClient`, garantizando que ninguna gráfica pinte datos quemados.
* **Con Views, Forms & UX:** Se enlaza con el componente de dashboard y el App Router para conmutar dinámicamente el panel según los permisos atómicos del usuario autenticado.

---

## 5. ¿Qué Cosas HACE este Subrol?
1. **Consolas Analíticas por Rol (`frontend/src/views/dashboards/`):**
   * Paneles especializados con hero banner de gobernanza, fila de 4-5 tarjetas KPI y cuadrícula de visualizaciones.
2. **Implementación de Apache ECharts con TypeScript:**
   * **Barras Apiladas / Horizontales:** Comparativas de capacidad vs. operaciones activas por organización.
   * **Donas con Centro Dinámico:** Distribución de usuarios y participación por roles.
   * **Curvas de Área con Gradientes Suaves:** Demanda de operaciones y evolución temporal en el tiempo.
   * **Donuts Semáforo:** Cumplimiento de auditoría y semáforos de calidad del sistema.
3. **Gestión Rigurosa del Ciclo de Vida Gráfico:**
   * Inicialización controlada tras el renderizado del DOM (`nextTick()` y `echarts.init()`).
   * Listener global de redimensionamiento (`window.addEventListener('resize', handleResize)`).
   * **Destrucción y liberación de memoria obligatoria** en `onUnmounted` (`chart?.dispose()`) para evitar fugas de memoria en la SPA.
4. **Tooltips Ricos y Formateadores Personalizados:**
   * Tooltips HTML elegantes con sombras suaves, bordes redondeados y texto legible.
5. **Switchers de Vista Interactiva:**
   * Botones integrados que permiten alternar dinámicamente entre vistas (ej. ver métricas *Por Categoría* o ver *Evolución Temporal*).

---

## 6. ¿Qué Cosas NO HACE este Subrol? (Límites Estrictos)
* ❌ **PROHIBIDO pintar datos estáticos inventados o mocks fijos:** Toda gráfica debe reflejar valores devueltos por la base de datos en tiempo real.
* ❌ **PROHIBIDO dejar gráficos sin evento `resize`:** Todo gráfico debe adaptarse fluidamente si la ventana cambia de tamaño o pasa a pantalla completa.
* ❌ **PROHIBIDO usar colores chillones o ajenos al Design System:** No se admiten colores aleatorios de ECharts por defecto; las paletas deben estar calibradas según `docs/04_ui_design_system.md`.

---

## 7. Criterio de Salida (Definition of Done - DoD)
- [ ] Gráficas de ECharts tipadas y renderizadas sin errores de consola.
- [ ] Manejo de `resize` y limpieza en `onUnmounted` implementados al 100%.
- [ ] Tarjetas KPI conectadas a datos en vivo de PostgreSQL.
- [ ] Compilación limpia sin errores (`npm run check:types` y `next build`).
- [ ] Responsive verificado en pantallas estándar y monitores widescreen.

---

## 8. Capacidad de Propuesta Técnica (RFCs que puede proponer)
Está facultado para proponer al Director Humano mejoras en:
* Renderizadores vectoriales SVG vs Canvas para mejorar la nitidez en pantallas Retina de alta densidad.
* Utilidades para exportación de tableros a informes ejecutivos en PDF o imágenes PNG de alta resolución.
* Temas cromáticos personalizados centralizados para ECharts.
