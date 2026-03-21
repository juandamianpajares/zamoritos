# Zamoritos

Sistema de gestión de ventas para veterinaria/pet shop. Stack: Laravel 11 (API) + Next.js 15 (frontend) + MySQL 8 + Nginx, orquestado con Docker Compose.

---

## Requisitos

- Debian 12 / Ubuntu 22.04 o superior
- Git
- Docker Engine 24+
- Docker Compose v2 (`docker compose`)
- Make (opcional, para los atajos del Makefile)

---

## Instalación en Debian/Ubuntu (producción)

### 1. Instalar Docker

```bash
# Dependencias
sudo apt update && sudo apt install -y ca-certificates curl gnupg

# Clave GPG oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Repositorio
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Agregar tu usuario al grupo docker (evita usar sudo)
sudo usermod -aG docker $USER
newgrp docker
```

> Para Ubuntu reemplazá `debian` por `ubuntu` en la URL del repositorio.

### 2. Instalar Make (opcional)

```bash
sudo apt install -y make
```

### 3. Clonar el repositorio

```bash
git clone <url-del-repo> zamoritos
cd zamoritos
```

### 4. Configurar variables de entorno

```bash
# Backend: copiar el ejemplo (el entrypoint completa los valores de DB automáticamente)
cp backend/.env.example backend/.env
```

Si necesitás una `ANTHROPIC_API_KEY` para el scanner de productos con IA, editá el archivo:

```bash
nano backend/.env
# Agregar al final:
# ANTHROPIC_API_KEY=sk-ant-...
```

Y también en el frontend, creá un `.env.local`:

```bash
cat > frontend/.env.local <<EOF
ANTHROPIC_API_KEY=sk-ant-...
EOF
```

### 5. Levantar el sistema

```bash
# Primera vez: construye las imágenes y levanta todo
docker compose up --build -d

# Ver que todos los contenedores estén healthy
docker compose ps
```

El primer inicio tarda varios minutos porque:
- El backend descarga dependencias PHP (Composer)
- El frontend compila Next.js
- Se ejecutan las migraciones y seeders automáticamente

### 6. Verificar

```bash
# Ver logs en tiempo real
docker compose logs -f

# Cuando todos los servicios estén "healthy":
curl http://localhost/api/health
```

La app queda disponible en **http://localhost** (o la IP del servidor).

---

## Comandos útiles (Makefile)

```bash
make up                  # levantar
make down                # bajar
make build               # levantar con rebuild
make rebuild             # rebuild completo (borra volúmenes de caché)
make rebuild-frontend    # recompilar solo el frontend
make rebuild-backend     # recompilar solo el backend

make logs                # logs de todos los servicios
make logs-backend        # logs solo del backend
make logs-frontend       # logs solo del frontend

make shell-backend       # bash dentro del contenedor Laravel
make shell-frontend      # sh dentro del contenedor Next.js

make migrate             # correr migraciones
make fresh               # migrate:fresh --seed (resetea la DB)
make status              # estado de contenedores y URL de acceso
```

---

## Actualizar el sistema

```bash
git pull
docker compose up --build -d
```

Si hubo cambios en dependencias del frontend:

```bash
docker volume rm zamoritos_frontend_node_modules
docker compose up --build -d frontend
```

---

## Estructura del proyecto

```
zamoritos/
├── backend/               # Laravel 11 (PHP-FPM)
│   ├── src/               # Código fuente personalizado
│   │   ├── migrations/
│   │   ├── Models/
│   │   ├── Http/Controllers/Api/
│   │   ├── Services/
│   │   ├── seeders/
│   │   └── routes/
│   ├── storage/app/public/productos/   # Imágenes de productos
│   ├── docker-entrypoint.sh
│   └── Dockerfile
├── frontend/              # Next.js 15
│   ├── src/app/
│   ├── docker-entrypoint.sh
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── Makefile
└── convertir_webp.sh      # Script de conversión de imágenes a WebP
```

---

## Imágenes de productos

Las imágenes se suben a `backend/storage/app/public/productos/` y quedan accesibles en `/storage/productos/nombre.webp`.

### Enlace de almacenamiento (`storage:link`)

Laravel necesita un enlace simbólico `public/storage → storage/app/public` para servir las imágenes. Esto se ejecuta automáticamente al levantar el contenedor, pero si las imágenes no aparecen podés forzarlo manualmente:

```bash
docker compose exec backend php artisan storage:link --force
```

Verificá que el enlace existe dentro del contenedor:

```bash
docker compose exec backend ls -la public/storage
# Debe mostrar: public/storage -> ../storage/app/public
```

### Convertir imágenes a WebP en lote

Requiere `sudo apt install webp` en el host:

```bash
chmod +x convertir_webp.sh
./convertir_webp.sh /ruta/a/las/imagenes
```

Después de convertir, copiá las imágenes WebP al volumen:

```bash
# Copiar desde el host al contenedor
docker compose cp imagenes_productos/. backend:/var/www/html/storage/app/public/productos/
```

---

## Comandos artisan via `docker compose exec`

Todos los comandos de artisan se ejecutan dentro del contenedor backend:

```bash
# Correr migraciones pendientes
docker compose exec backend php artisan migrate

# Resetear DB completa y correr seeders (⚠️ borra todos los datos)
docker compose exec backend php artisan migrate:fresh --seed

# Sembrar solo el catálogo Zamoritos (sin resetear)
docker compose exec backend php artisan db:seed --class=ZamoritorsCatalogoSeeder

# Abrir consola interactiva de Laravel (Tinker)
docker compose exec backend php artisan tinker

# Ver todas las rutas registradas de la API
docker compose exec backend php artisan route:list

# Limpiar caché de configuración y rutas
docker compose exec backend php artisan optimize:clear

# Recrear el enlace de storage (imágenes)
docker compose exec backend php artisan storage:link --force
```

---

## Solución de problemas comunes

**El backend no encuentra el `.env`**
```bash
cp backend/.env.example backend/.env
docker compose restart backend
```

**El frontend no encuentra un módulo npm**
```bash
docker volume rm zamoritos_frontend_node_modules
docker compose up --build -d frontend
```

**Resetear todo desde cero**
```bash
docker compose down -v --remove-orphans
docker compose up --build -d
```

**Ver errores de la DB**
```bash
docker compose logs db
docker compose logs backend
```
