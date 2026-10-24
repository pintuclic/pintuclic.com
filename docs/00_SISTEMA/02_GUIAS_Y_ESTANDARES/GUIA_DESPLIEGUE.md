# Guia de Despliegue y Pipeline de CD — PINTU CLIC

Esta guia describe la arquitectura de despliegue, el pipeline automatizado de Entrega Continua (CD) en GitHub Actions y las buenas practicas operativas para la plataforma **Pintu Clic**.

---

## 1. Arquitectura de Despliegue con Docker Compose

El despliegue productivo de Pintu Clic esta orquestado mediante [`docker-compose.yml`](../../../docker-compose.yml) y se compone de tres servicios esenciales:

```mermaid
graph TD
    subgraph Internet ["Acceso Externo (Internet / Clientes)"]
        CLIENTE[Navegador / Cliente API]
    end

    subgraph Host ["Servidor Host (Docker Engine)"]
        subgraph Ports ["Puertos del Host"]
            P8080["127.0.0.1:${FRONTEND_PORT:-8080}"]
            P3000["127.0.0.1:${BACKEND_PORT:-3000}"]
        end

        subgraph DockerNetwork ["Redes Internas Docker"]
            subgraph FRONTEND_NET ["frontend_net (Bridge)"]
                FRONTEND["Frontend (Next.js 15)<br/>pintuclic-frontend:3001"]
            end

            subgraph BACKEND_NET ["backend_net (Bridge Interno)"]
                BACKEND["Backend (Express 5)<br/>pintuclic-backend:3000"]
                DB[("PostgreSQL 15<br/>pintuclic-db:5432")]
            end
        end

        VOLUME[("Volumen Persistente<br/>pgdata")]
    end

    CLIENTE -->|HTTP / HTTPS| P8080
    P8080 --> FRONTEND
    FRONTEND -->|Proxy interno /api/:path*| BACKEND
    P3000 -.->|Solo local / monitoreo| BACKEND
    BACKEND -->|DATABASE_URL| DB
    DB --- VOLUME

    style DB fill:#1e3a8a,stroke:#3b82f6,color:#ffffff
    style BACKEND fill:#14532d,stroke:#22c55e,color:#ffffff
    style FRONTEND fill:#581c87,stroke:#a855f7,color:#ffffff
    style BACKEND_NET fill:#18181b,stroke:#52525b,stroke-dasharray: 5 5,color:#ffffff
```

### Componentes y Aislamiento

1. **Base de Datos (`pintuclic-db`):**
   - Imagen: `postgres:15-alpine`.
   - Red: Exclusivamente `backend_net` con directiva `internal: true`. Inaccesible desde el exterior.
   - Volumen: `pgdata` montado en `/var/lib/postgresql/data`.
   - Inicializacion: Montaje en solo lectura de `./bd/sql:/docker-entrypoint-initdb.d:ro` (`schema_pintuclic.sql` y `seed_pintuclic.sql`).
   - Healthcheck: `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}` cada 10s.

2. **Backend API (`pintuclic-backend`):**
   - Multi-stage build (`node:24-alpine`) con usuario sin privilegios `node`.
   - Conexion a DB con `depends_on: condition: service_healthy`.
   - Puerto en contenedor: `3000`, expuesto al host en `127.0.0.1:${BACKEND_PORT:-3000}`.
   - Healthcheck: HTTP `GET http://127.0.0.1:3000/api/health` cada 15s.

3. **Frontend Web (`pintuclic-frontend`):**
   - Multi-stage build (`node:24-alpine`) con usuario sin privilegios `nextjs` y salida `standalone`.
   - Conexion con backend con `depends_on: condition: service_healthy`.
   - Proxy de API integrado (`next.config.ts`): reenvia peticiones `/api/:path*` hacia `${BACKEND_URL}/api/:path*` en `backend:3000`. Esto permite cookies de sesion `HttpOnly` + `SameSite=Strict` sin CORS perimetral (ADR-005).
   - Puerto en contenedor: `3001`, expuesto al host en `127.0.0.1:${FRONTEND_PORT:-8080}`.
   - Healthcheck: HTTP `GET http://127.0.0.1:3001` cada 15s.

---

## 2. Pipeline de CD en GitHub Actions

El workflow [`.github/workflows/02_cd_deploy.yml`](../../../.github/workflows/02_cd_deploy.yml) automatiza el ciclo de entrega:

### Disparadores
1. **Push a la rama `main`:** Ejecucion automatica tras la integracion de pull requests validados.
2. **`workflow_dispatch` (Manual):** Permite ejecutar despliegues bajo demanda desde GitHub Actions seleccionando el entorno (`production` o `staging`), activando o saltando smoke tests, o forzando reconstruccion sin cache (`clean_deploy`).

### Etapas del Pipeline

```mermaid
flowchart LR
    A[Push main / Dispatch] --> B[Job 1: pre-deploy-validation]
    B --> B1[Validar sintaxis docker-compose]
    B1 --> B2[Compilar imagenes Docker]
    B2 --> B3[Ejecutar Smoke Test en Runner]
    B3 --> C{Smoke Test Exitoso}
    C -- Si --> D[Job 2: deploy]
    C -- No --> E[Cancelar Despliegue y Volcar Logs]
    D --> D1{Metodo de Despliegue}
    D1 -- SSH Directo --> D2[Sync rsync + .env seguro + docker compose up -d]
    D1 -- Webhook Dokploy --> D3[Disparar Webhook POST]
    D1 -- Sin Configurar --> D4[Generar Resumen de Secretos Requeridos]
    D2 --> F[Verificar Healthchecks y Prune]
    D3 --> G[Fin]
    F --> G
```

1. **Job 1: `pre-deploy-validation`**
   - Valida la sintaxis estricta de `docker-compose.yml`.
   - Compila las imagenes de Backend y Frontend para certificar que no existen fallos de compilacion ni dependencias rotas.
   - Levanta temporalmente el stack completo en el runner de GitHub Actions (`smoke test`), espera que todos los contenedores alcancen estado `healthy` y comprueba la disponibilidad HTTP antes de tocar el servidor productivo.

2. **Job 2: `deploy`**
   - Protegido por el entorno configurado (`production` o `staging`).
   - Detecta la infraestructura configurada:
     - **Opcion A (SSH Directo):** Transfiere archivos con `rsync`, escribe de forma segura el archivo `.env` (permisos `600`), ejecuta `docker compose up -d --remove-orphans`, supervisa los healthchecks de los contenedores en el host y purga imagenes huerfanas (`docker image prune -f`).
     - **Opcion B (Webhook Dokploy/PaaS):** Llama al endpoint de despliegue mediante peticion HTTP POST segura.
     - **Opcion C (Informativo):** Si no existen secretos cargados, genera un reporte detallado en el *Step Summary* del workflow indicando los secretos faltantes.

---

## 3. Catalogo de Secretos de GitHub Actions

Para habilitar el despliegue automatico, configurar los siguientes secretos en el repositorio (**Settings > Secrets and variables > Actions**):

### A. Secretos de Servidor (Despliegue por SSH)
| Secreto | Obligatorio | Descripcion | Ejemplo |
| :--- | :---: | :--- | :--- |
| `SSH_HOST` | Si | IP o dominio publico del servidor | `198.51.100.24` o `servidor.pintuclic.com` |
| `SSH_USER` | Si | Usuario con privilegios de Docker | `deploy` o `ubuntu` |
| `SSH_KEY` / `SSH_PRIVATE_KEY` | Si | Llave SSH privada (sin passphrase) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_PATH` | No | Ruta del proyecto en el servidor (def: `/opt/pintuclic`) | `/opt/pintuclic` |
| `SSH_PORT` | No | Puerto SSH del servidor (def: `22`) | `22` o `2222` |

### B. Secretos de Base de Datos y Aplicacion
| Secreto | Obligatorio | Descripcion | Ejemplo |
| :--- | :---: | :--- | :--- |
| `POSTGRES_PASSWORD` | Si | Contrasena segura del usuario PostgreSQL | Cadena aleatoria de 24+ caracteres |
| `POSTGRES_USER` | No | Usuario de base de datos (def: `pintuclic`) | `pintuclic` |
| `POSTGRES_DB` | No | Nombre de la base de datos (def: `pintuclic`) | `pintuclic` |
| `JWT_SECRET` | Si | Clave para firmado de tokens (min. 32 chars) | Cadena aleatoria segura |
| `CORS_ORIGIN` | Si | Dominio permitido en produccion | `https://pintuclic.com` |
| `SMTP_HOST` | No | Host del servidor SMTP (def: `smtp-relay.brevo.com`) | `smtp-relay.brevo.com` |
| `SMTP_PORT` | No | Puerto SMTP (def: `587`) | `587` |
| `SMTP_USER` | Si | Usuario / remitente SMTP | `notificaciones@pintuclic.com` |
| `SMTP_PASS` | Si | Contrasena o Master Key SMTP | Master key de Brevo |
| `GOOGLE_CLIENT_ID` | No | ID de cliente OAuth Google (M04) | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | No | Secreto de OAuth Google (M04) | `GOCSPX-xxxx` |
| `GOOGLE_CALLBACK_URL` | No | URL de callback de autenticacion Google | `https://pintuclic.com/api/v1/auth/google/callback` |

### C. Despliegue Alternativo por Webhook (Dokploy)
| Secreto | Obligatorio | Descripcion |
| :--- | :---: | :--- |
| `DEPLOY_WEBHOOK_URL` | Alternativo | URL de webhook de despliegue generada en Dokploy o Portainer |

---

## 4. Procedimiento Manual y Mantenimiento en el Servidor

Si se requiere intervenir manualmente en el servidor:

```bash
cd /opt/pintuclic

# 1. Verificar estado de los servicios y healthchecks
docker compose ps

# 2. Inspeccionar logs en tiempo real
docker compose logs -f --tail=100 backend
docker compose logs -f --tail=100 frontend

# 3. Recompilar y reiniciar un servicio especifico
docker compose up -d --build --no-deps backend

# 4. Detener y reiniciar todos los servicios
docker compose down
docker compose up -d

# 5. Ejecutar migraciones manuales de Prisma (si aplica)
docker compose exec backend pnpm exec prisma migrate deploy

# 6. Limpieza de imagenes en desuso
docker image prune -f
```

---

## 5. Procedimiento de Rollback

En caso de requerir volver a una version previa tras un despliegue fallido:

1. Identificar el commit o tag estable anterior en `main` (por ejemplo `v0.6.8` o commit SHA).
2. En GitHub Actions, ejecutar el workflow **CD - Despliegue continuo** seleccionando la rama o commit correspondiente, o desplegar por SSH en el servidor:
   ```bash
   cd /opt/pintuclic
   git checkout <TAG_O_COMMIT_ESTABLE>
   docker compose build
   docker compose up -d --remove-orphans
   ```
3. Comprobar la salud de los servicios con `docker compose ps` y `curl -fsS http://127.0.0.1:3000/api/health`.

