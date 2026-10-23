# 🏛️ ADR-001: Adopción del SDLC Multiagente Guiado por Artefactos y Contratos Zod

> **Estado:** ACEPTADO  
> **Fecha:** 2026-10-07  
> **Autores:** Software Architect Lead & Product Manager Lead  

---

## 1. Contexto y Problema
En el desarrollo de software acelerado mediante inteligencia artificial, los enfoques tradicionales de "generación libre de código" sufren de alucinaciones, discrepancias silenciosas de tipos entre frontend y backend, y deriva arquitectural por falta de contexto en la memoria conversacional de los modelos.

## 2. Decisión Arquitectural
Se adopta formalmente la metodología de **SDLC Multiagente Guiado por Artefactos y Compuertas de Calidad (Stage-Gates)**:
1. **Memoria en Disco como Fuente de la Verdad:** El estado del proyecto se gobierna mediante artefactos inmutables (`AGENTS.md`, `STAGE_GATES.md`, `current_state.json`).
2. **API-First con Zod:** Backend y Frontend comparten contratos estrictos en TypeScript (`docs/contracts/*.contract.ts`).
3. **Mandato Zero ANY:** Toda variable o retorno `any` es vetado mecánicamente mediante AST Parsers antes de cualquier pase a producción.
4. **Supervisión HITL (Human In The Loop):** Toda transición de Stage-Gate requiere revisión humana explícita.

## 3. Consecuencias
- **Positivas:**
  - Cero desacoples o roturas de tipos en runtime entre cliente y servidor.
  - Independencia de contexto: cualquier agente de IA o desarrollador humano puede retomar la labor inmediatamente.
  - Trazabilidad y auditoría forense completa de cada decisión.
- **Negativas / Compensaciones:**
  - Requiere la disciplina de redactar y congelar el contrato Zod antes de escribir código.
