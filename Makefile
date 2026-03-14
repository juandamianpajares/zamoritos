.PHONY: up down build logs backend frontend db shell-backend shell-frontend migrate fresh

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose up -d --build

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

shell-backend:
	docker-compose exec backend bash

shell-frontend:
	docker-compose exec frontend sh

migrate:
	docker-compose exec backend php artisan migrate

fresh:
	docker-compose exec backend php artisan migrate:fresh --seed

tinker:
	docker-compose exec backend php artisan tinker
