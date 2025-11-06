# Step 1: Use Node.js to build the React app
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the app and build
COPY . .
RUN npm run build

# Step 2: Use Nginx to serve the React build
FROM nginx:alpine

# Copy build folder into Nginx html directory
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx config (optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
