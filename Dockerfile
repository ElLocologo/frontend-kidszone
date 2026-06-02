FROM node:24-alpine AS build

WORKDIR /app

# Copiamos package.json e instalamos dependencias
COPY package*.json ./

RUN npm ci --legacy-peer-deps --no-audit --network-timeout=600000

COPY . .

RUN npm run build


# Serve con Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]