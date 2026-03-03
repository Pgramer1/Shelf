# Root-level Dockerfile for HuggingFace Spaces
# Builds the Spring Boot backend from the backend/ subdirectory

FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B
COPY backend/src ./src
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# HuggingFace Spaces injects PORT=7860; Spring Boot reads ${PORT:8080}
EXPOSE 7860
ENTRYPOINT ["java", "-jar", "app.jar"]
