FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

# npm install runs at IMAGE BUILD TIME so the named volume is pre-populated
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
