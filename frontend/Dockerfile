FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

# Instala dependencias en imagen (pre-popula el volumen node_modules)
RUN npm install

COPY . .

EXPOSE 3000

# Compila en primera ejecución, luego inicia en modo producción
CMD ["sh", "docker-entrypoint.sh"]
