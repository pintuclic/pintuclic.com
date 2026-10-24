# Guia de Despliegue y Pipeline de CD — PINTU CLIC

Esta guia describe el pipeline automatizado de Entrega Continua (CD) en GitHub Actions y las buenas practicas para desplegar la plataforma **Pintu Clic** en un servidor VPS usando Docker Compose.

---

## 1. Filosofia de Despliegue (Enfoque Pragmatico VPS)

El despliegue sigue el patron de **servidor persistente con seguridad perimetral**:

1. **Credenciales seguras en el servidor:** El archivo `.env` reside **exclusivamente dentro de tu VPS**, protegido con permisos estrictos (`chmod 600`). Las contraseñas de producción nunca se almacenan en GitHub.
2. **Bloqueo de seguridad en primer despliegue:** Si el pipeline detecta que es la primera vez que se clona el proyecto en el servidor, copia `.env.example` a `.env` y **detiene el pipeline intencionalmente** (`exit 1`) para recordarte que debes ingresar por SSH a configurar tus contraseñas reales antes de levantar contenedores.
3. **Despliegues continuos desatendidos:** En los siguientes despliegues, el pipeline verifica que `.env` no este vacio (`[ -s .env ]`), actualiza el codigo con `git pull` y recompila los contenedores con `docker compose up -d --build --remove-orphans`.

---

## 2. Pipeline en GitHub Actions (`02_cd_deploy.yml`)

El workflow [`.github/workflows/02_cd_deploy.yml`](../../../.github/workflows/02_cd_deploy.yml) realiza las siguientes acciones:

```mermaid
flowchart TD
    A[Push a main o Dispatch manual] --> B[Conectar por SSH al VPS con appleboy/ssh-action]
    B --> C{¿Existe el directorio del proyecto?}
    C -- No (Primer Despliegue) --> D[git clone + crear .env desde .env.example]
    D --> E[⚠️ Bloqueo de seguridad: detener pipeline para configurar .env]
    C -- Si (Actualizacion) --> F[git fetch + git reset --hard origin/main]
    F --> G{¿El .env tiene contenido?}
    G -- No --> H[Error: .env vacio, abortar]
    G -- Si --> I[docker compose config --quiet]
    I --> J[docker compose up -d --build --remove-orphans]
    J --> K[docker compose ps + docker image prune -f]
    K --> L[✅ Despliegue Exitoso]
```

---

## 3. Secretos Requeridos en GitHub Actions

En tu repositorio de GitHub ve a **Settings > Secrets and variables > Actions > New repository secret** y configura unicamente las credenciales de acceso SSH a tu VPS:

| Secreto | Obligatorio | Descripcion | Ejemplo |
| :--- | :---: | :--- | :--- |
| `VPS_HOST` | Si | IP publica o dominio de tu servidor | `198.51.100.24` |
| `VPS_USER` | Si | Usuario del servidor con permisos Docker | `ubuntu` o `deploy` |
| `SSH_PRIVATE_KEY` | Si | Contenido de tu llave privada SSH completa | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_SSH_PORT` | No | Puerto SSH del servidor (por defecto: `22`) | `22` |
| `DEPLOY_PATH` | No | Ruta en el VPS (por defecto: `/home/<VPS_USER>/pintuclic`) | `/home/ubuntu/pintuclic` |

*(Tambien son compatibles los nombres alternativos `SSH_HOST`, `SSH_USER` y `SSH_KEY`).*

---

## 4. Primer Despliegue Paso a Paso

1. Configura los **3 secretos de SSH** en GitHub Actions (`VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY`).
2. Haz push o ejecuta manualmente el workflow de despliegue.
3. El primer despliegue se detendra con el mensaje:
   ```text
   BLOQUEO DE SEGURIDAD: Se ha detenido el despliegue.
   Entra por SSH a tu VPS, edita el archivo '/home/usuario/pintuclic/.env' con tus credenciales reales y vuelve a ejecutar el pipeline.
   ```
4. Conéctate a tu servidor por SSH, edita el archivo con tus credenciales de producción:
   ```bash
   nano /home/usuario/pintuclic/.env
   ```
5. Vuelve a ejecutar el pipeline o haz un push: el despliegue compilara y levantara los contenedores automaticamente.

---

## 5. Mantenimiento y Comandos Utiles en el Servidor

```bash
cd /home/usuario/pintuclic

# Ver estado y healthchecks de los contenedores
docker compose ps

# Ver logs del backend o frontend en tiempo real
docker compose logs -f --tail=100 backend
docker compose logs -f --tail=100 frontend

# Reiniciar servicios
docker compose restart

# Limpieza de imagenes antiguas
docker image prune -f
```
