FROM node:24.13.1-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM eclipse-temurin:25.0.1_8-jdk AS backend
WORKDIR /app/backend
COPY backend/ ./
COPY --from=frontend /app/frontend/dist ./src/main/resources/static
RUN chmod +x mvnw && ./mvnw -B -ntp package -DskipTests

FROM eclipse-temurin:25.0.1_8-jre
WORKDIR /app
RUN groupadd --system campus && useradd --system --gid campus campus
COPY --from=backend /app/backend/target/tour-virtual-0.1.0.jar app.jar
USER campus
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
