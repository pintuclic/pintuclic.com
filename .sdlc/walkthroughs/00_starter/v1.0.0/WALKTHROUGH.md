# 🚶 WALKTHROUGH: Inicialización y Puesta en Marcha del Starter Kit

> **Módulo:** `00_starter`  
> **Versión:** `v1.0.0`  
> **Fecha:** 2026-10-07  
> **Propósito:** Guía de verificación paso a paso para arrancar cualquier proyecto utilizando el Starter Kit Multiagente.

---

## 1. Verificación del Repositorio Clonado
1. Clonar el repositorio base:
   ```bash
   git clone https://github.com/DanExl24/multiagent-sdlc-starter.git mi-nuevo-proyecto
   cd mi-nuevo-proyecto
   ```
2. Instalar dependencias del kit de gobernanza:
   ```bash
   npm install
   ```

---

## 2. Ejecución del Asistente Interactivo de Inicialización
Ejecutar el wizard interactivo para adaptar automáticamente todos los documentos al dominio deseado:
```bash
npm run init:project
```
El asistente solicitará:
- **Nombre del Proyecto** (ej. *FintechPay*, *HealthCarePro*, *AutoLogistics*)
- **Dominio / Sector** (ej. *Fintech y Pagos Digitales*, *Salud y Gestión Clínica*)
- **Autor / Organización** (ej. *DanExl24*)
- **Stack Backend / Frontend**

---

## 3. Verificación de Compilación y Comprobador AST (Zero ANY)
Ejecutar la comprobación para asegurar que no existan variables de tipo `any`:
```bash
npm run check:no-any
```
Resultado esperado: `0 violaciones detectadas`.

---

## 4. Invocación del Primer Agente de IA
Copiar y pegar el contenido de [`LANDING_PROMPT.md`](file:///LANDING_PROMPT.md) en la ventana de chat del asistente (Antigravity IDE, Cursor, Claude, etc.):
```text
🤖 Hola. He iniciado sesión en este repositorio... (ver LANDING_PROMPT.md)
```
El agente leerá automáticamente [`AGENTS.md`](file:///AGENTS.md) y [`.workflow/current_state.json`](file:///.workflow/current_state.json) y se pondrá a tus órdenes bajo el rol correspondiente.
