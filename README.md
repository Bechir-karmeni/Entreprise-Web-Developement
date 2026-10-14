# Daily Tracker - Nutrition

Personalized nutrition planning web application: nutrition targets, meal planning, allergy-aware recommendations, and automatic shopping lists.

> Informational only. Calorie and macro values are estimates. Allergy detection cannot guarantee that a food is safe: users must verify ingredients and labels themselves. This is not a medical device.

## Technologies

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, Tailwind CSS, Recharts |
| Backend | Java 21, Spring Boot 3.5, Spring Web, Spring Security, Spring Data JPA, Bean Validation, Maven |
| Database | PostgreSQL 16 with Flyway migrations |
| Deployment | Docker, Docker Compose |

## Architecture

    Controller -> Service -> Repository -> PostgreSQL

Controllers accept and return DTOs. JPA entities are never exposed through the API. Business rules live in the backend.

## Requirements

- Java 21 (Temurin)
- Maven 3.9+
- Node.js 22 or 24 (LTS)
- Docker Desktop (for PostgreSQL and the backend container)

## Setup

1. Copy the environment template and fill in your values:

       copy .env.example .env

2. Start the database:

       docker compose up -d postgres

3. Start the backend (from `backend/`):

       mvn spring-boot:run

4. Start the frontend (from `frontend/`):

       npm install
       npm run dev

The frontend runs on http://localhost:5173 and proxies `/api` to the backend on http://localhost:8080.

## Project structure

    backend/    Spring Boot application (Maven)
    frontend/   React + TypeScript application (Vite)
    docker-compose.yml
    .env.example
    REPORT_NOTES.md   Development log for the report and presentation

## Status

Foundation only: project skeleton, configuration, and database connection. Features (authentication, nutrition targets, food database, meal planner, shopping list, analytics) are added step by step and logged in `REPORT_NOTES.md`.
