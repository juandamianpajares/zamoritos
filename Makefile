.PHONY: up down build rebuild rebuild-frontend rebuild-backend \
        logs logs-backend logs-frontend logs-nginx \
        shell-backend shell-frontend migrate fresh tinker \
        wsl-ports tunnel-status

# ── Ciclo de vida ────────────────────────────────────────────────────────────

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose up -d --build

# Reconstruye imágenes y borra volúmenes de caché (rebuild completo)
rebuild:
	docker-compose down -v --remove-orphans
	docker-compose build --no-cache
	docker-compose up -d

# Solo recompila el frontend (útil después de cambios en código)
rebuild-frontend:
	docker volume rm zamoritos_frontend_next 2>/dev/null || true
	docker-compose restart frontend

# Reconstruye solo la imagen del backend (cambios en Dockerfile/entrypoint)
rebuild-backend:
	docker-compose build --no-cache backend
	docker-compose up -d backend

# ── Logs ─────────────────────────────────────────────────────────────────────

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-nginx:
	docker-compose logs -f nginx

# ── Shells ───────────────────────────────────────────────────────────────────

shell-backend:
	docker-compose exec backend bash

shell-frontend:
	docker-compose exec frontend sh

# ── Base de datos ────────────────────────────────────────────────────────────

migrate:
	docker-compose exec backend php artisan migrate

fresh:
	docker-compose exec backend php artisan migrate:fresh --seed

tinker:
	docker-compose exec backend php artisan tinker

# ── WSL2: expone el puerto 80 de Docker al exterior (ejecutar como admin en PowerShell)
# Obtiene la IP de WSL2 y configura port proxy en Windows
wsl-ports:
	@echo "Ejecuta esto en PowerShell como Administrador:"
	@echo ""
	@echo "  \$$wslIP = (wsl hostname -I).Trim().Split(' ')[0]"
	@echo "  netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=\$$wslIP"
	@echo "  netsh advfirewall firewall add rule name='Docker WSL2 HTTP' dir=in action=allow protocol=TCP localport=80"
	@echo ""
	@echo "Para revertir:"
	@echo "  netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0"

# ── Estado del sistema ───────────────────────────────────────────────────────

status:
	@echo "=== Contenedores ==="
	@docker-compose ps
	@echo ""
	@echo "=== URL de acceso ==="
	@echo "  Local:     http://localhost"
	@echo "  WSL/Red:   http://$$(hostname -I 2>/dev/null | awk '{print $$1}' || echo '<IP>')"
