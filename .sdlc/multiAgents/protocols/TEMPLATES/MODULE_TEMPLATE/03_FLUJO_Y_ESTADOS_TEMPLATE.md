# 🔄 PLANTILLA: 03_FLUJO_Y_ESTADOS — [Nombre del Módulo]

> **Módulo:** [XX. Nombre del Módulo]  
> **Responsable:** Product Manager & Software Architect  

---

## 1. Diagrama de Flujo de Interacción (Secuencia)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario (Rol)
    participant F as Frontend (Next.js 15 + React 19)
    participant A as Backend API (Express)
    participant M as Middleware (Auth/Zod/RBAC)
    participant DB as PostgreSQL (Prisma 6)

    U->>F: Ejecuta acción en la interfaz
    F->>M: Envía petición HTTP con Bearer JWT
    M->>M: Valida token, rol y payload con Zod
    alt Validación Fallida
        M-->>F: Retorna HTTP 400/403/422
        F-->>U: Muestra toast/alerta de error
    else Validación Exitosa
        M->>A: Pasa al Controlador
        A->>DB: Ejecuta consulta tipada Prisma (prisma.$transaction)
        DB-->>A: Retorna datos actualizados
        A-->>F: Retorna HTTP 200/201 con payload JSON
        F-->>U: Actualiza estado reactivo (Zustand) y notifica éxito
    end
```

---

## 2. Máquina de Estados de la Entidad Principal

```mermaid
stateDiagram-v2
    [*] --> Estado_Inicial
    Estado_Inicial --> Estado_En_Progreso: Acción del usuario
    Estado_En_Progreso --> Estado_Cerrado: Cierre formal
    Estado_Cerrado --> Estado_En_Progreso: Reapertura autorizada por Rector
    Estado_Cerrado --> [*]: Consolidación final
```

- **Estados Posibles:**
  - `ESTADO_1`: [Descripción y reglas aplicables].
  - `ESTADO_2`: [Descripción y reglas aplicables].

---

## 3. Casos de Uso Extremo a Extremo (E2E Journeys)

### Caso de Uso CU-[MOD]-01: [Nombre del Flujo Completo]
1. **Precondición:** [Qué debe estar configurado antes].
2. **Paso 1:** [Usuario navega a la vista...].
3. **Paso 2:** [Completa el formulario y envía...].
4. **Paso 3:** [El sistema procesa y emite...].
5. **Resultado Final:** [Estado resultante del sistema y datos guardados].
