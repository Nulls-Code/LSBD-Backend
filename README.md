# LSBD Backend

LSBD Backend is the API layer for the LSBD Courier Management & Tracking System. It powers internal staff workflows, shipment lifecycle management, manual checkpoint logging, and public shipment tracking for customers without requiring authentication.

This project is built as a modular monolith using Node.js, TypeScript, Express, PostgreSQL, and Prisma ORM. It follows a layered architecture with route, controller, service, and database access boundaries.

## Table of Contents

- [Overview](#overview)
- [System Goals](#system-goals)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)
- [API Architecture](#api-architecture)
- [Authentication and Authorization](#authentication-and-authorization)
- [Core Modules](#core-modules)
- [Security Considerations](#security-considerations)
- [Development Guidelines](#development-guidelines)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)

## Overview

The backend supports a manual courier workflow where physical package movements happen offline, and staff record each checkpoint and status update manually. The system is designed for internal operations and public customer visibility.

The application includes:

- staff authentication and session management
- role-based authorization for internal users
- location and hub management
- customer record management
- courier request intake and review flows
- shipment creation and operational tracking
- manual historical checkpoint logging
- public shipment tracking endpoints
- security protections for abuse prevention and safe API behavior

## System Goals

The project focuses on the following business responsibilities:

1. Internal operational management for staff roles: ADMIN, MANAGER, and EMPLOYEE.
2. Intake, review, and approval of courier service requests.
3. Generation of collision-free tracking numbers.
4. Immutable tracking history for each shipment.
5. Privacy-safe public tracking for customers.
6. Strong validation, permission enforcement, and secure token handling.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 20+ |
| Language | TypeScript (strict mode) |
| Framework | Express.js 5 |
| Database | PostgreSQL |
| ORM | Prisma ORM |
| Authentication | JWT + cookies |
| Password Hashing | bcrypt |
| Validation | Zod |
| Security | Helmet, CORS, rate limiting |
| Logging | Morgan + custom request logger |
| Build | TypeScript compiler |

## Project Structure

```text
.
├── prisma/
│   ├── migrations/
│   ├── schema/
│   ├── seed.ts
│   └── schema.prisma
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── lib/
│   ├── middleware/
│   ├── modules/
│   └── types/
├── .env.example (if added locally)
├── AGENTS.md
├── eslint.config.mjs
├── package.json
├── prisma.config.ts
├── tsconfig.json
├── README.md
└── ...
```

### Main source folders

- `src/app.ts` — Express app setup, middleware registration, route mounting
- `src/server.ts` — startup lifecycle, config validation, DB connection, graceful shutdown
- `src/config/` — environment configuration and Prisma config
- `src/middleware/` — auth, validation, rate limiting, error handling
- `src/modules/` — feature-based modules such as auth, users, locations, shipments, tracking
- `src/lib/` — reusable helpers for API responses and errors

## Prerequisites

Before running this project, make sure you have:

- Node.js 20 or newer
- PostgreSQL installed and running
- Access to a local or remote database instance
- A package manager such as npm

## Environment Configuration

Create a `.env` file in the project root. The app validates required environment variables on startup.

Example:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lsbd_db?schema=public
JWT_SECRET=your_super_secret_key_at_least_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_key_at_least_32_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
PUBLIC_RATE_LIMIT_WINDOW_MS=900000
PUBLIC_RATE_LIMIT_MAX_REQUESTS=30
```

### Configuration rules

- `DATABASE_URL` is required.
- `JWT_SECRET` and `JWT_REFRESH_SECRET` are required.
- In non-development environments, secret keys must be at least 32 characters long.
- `CORS_ORIGIN` can accept a comma-separated list of origins.

## Installation

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Configure your `.env` file.
4. Generate Prisma client:

```bash
npx prisma generate
```

## Database Setup

This project uses Prisma with PostgreSQL. The schema is split into modular Prisma files under `prisma/schema/` and is assembled by the Prisma schema configuration.

Run the migration setup:

```bash
npx prisma migrate dev
```

Optional seed data:

```bash
npm run db:seed
```

### Prisma commands

```bash
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

## Running the Application

### Development mode

```bash
npm run dev
```

This uses `tsx watch` and restarts the server on code changes.

### Production build

```bash
npm run build
npm start
```

The build step compiles TypeScript to the `dist` folder.

## Available Scripts

This project includes the following scripts from `package.json`:

```bash
npm run dev
npm run build
npm start
npm run lint
npm run typecheck
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run db:seed
```

## API Architecture

The application exposes APIs under the `/api/v1` prefix.

Common response format:

- success responses follow a standard envelope structure
- error responses include a structured `error` object with code and message
- the app centralizes error handling through `src/middleware/errorHandler.ts`

The primary route groups are:

- `/api/v1/auth`
- `/api/v1/users`
- `/api/v1/locations`
- `/api/v1/customers`
- `/api/v1/courier-requests`
- `/api/v1/shipments`
- `/api/v1/tracking`

Health check:

```http
GET /api/v1/health
```

## Authentication and Authorization

The backend uses JWT-based authentication with a hybrid token strategy:

- access token from `Authorization: Bearer <token>` or cookie
- refresh token support for reissuing access tokens
- secure HTTP-only cookies for browser-based sessions

### Role system

Users can be assigned internal roles such as:

- `ADMIN`
- `MANAGER`
- `EMPLOYEE`

Permissions are mapped through the role/authorization layer and enforced by middleware before route handlers run.

### Auth endpoints

Typical authentication flows include:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/profile`
- `POST /api/v1/auth/change-password`

## Core Modules

### Auth

The auth module handles login, password verification, token creation, refresh flow, and user profile retrieval. It uses bcrypt for password hashing and JWT for session tokens.

### Users

The users module is intended for administrative staff management, including listing users, viewing details, role updates, activation status changes, and password resets.

### Locations

The locations module manages transit hubs, sorting centers, and operational facilities. It includes validation for unique location codes and safeguards against deactivating locations with active in-transit shipments.

### Customers

The customer module handles sender and recipient client data, often with automatic lookup/upsert patterns to reduce duplicate records during request intake.

### Courier Requests

This module manages the lifecycle of shipping requests:

- intake
- status review
- approval or rejection
- cancellation
- relationship to shipments and customers

### Shipments

Shipments are created after a request is approved. This module supports the operational record of a physical shipment, including status, location, assignment, and timeline tracking.

### Tracking

The tracking module covers:

- internal shipment checkpoint logging
- immutable history records
- public customer tracking endpoints
- data sanitization to protect internal PII and operational details

## Security Considerations

This backend is designed with several operational protections:

- Helmet for secure HTTP headers
- CORS configuration
- JSON payload limits to prevent oversized requests
- rate limiting for API and public tracking access
- DTO validation with Zod at the route boundary
- typed error handling with custom application errors
- secure cookie handling for auth tokens
- permission enforcement before sensitive routes execute

## Development Guidelines

The codebase follows a consistent layered pattern:

- routes -> controller -> service -> database access
- validation at the boundary
- type-safe business logic
- custom exception classes for expected failures
- Prisma transactions for multi-table mutation workflows

### Conventions

- Prefer typed models and strict TypeScript usage.
- Do not put Prisma logic in controllers or routes.
- Use `AppError` subclasses instead of generic thrown values.
- Validate all incoming `body`, `query`, and `params` data.
- Use transactions whenever multiple tables are changed together.

## Roadmap

The project is organized around phased development:

1. Authentication and session security
2. Locations module
3. Users and RBAC administration
4. Customers and courier requests
5. Shipments and tracking number generation
6. Manual tracking updates
7. Public tracking and privacy shielding
8. Production hardening and automated testing

## Troubleshooting

### Database connection errors

Check that:

- PostgreSQL is running
- the `DATABASE_URL` is valid
- the database exists and is reachable
- Prisma migrations have been applied

### JWT errors

Verify that:

- `JWT_SECRET` and `JWT_REFRESH_SECRET` are configured
- the secrets are long enough for your current environment
- tokens are being sent in the correct format

### CORS issues

Make sure your frontend origin matches the configured `CORS_ORIGIN` value. If running multiple apps locally, use a comma-separated list.

### Dependency issues

If you run into install or build problems, re-run dependency installation and Prisma generation:

```bash
rm -rf node_modules
npm install
npx prisma generate
```

## License

This project is intended for internal operational use and is currently designed around the LSBD courier workflow. Add licensing details here if needed for production or external distribution.

## Notes

This README reflects the codebase structure and conventions currently present in the repository. If the project evolves, keep this file aligned with the actual modules, environment variables, and deployment setup.
