# EchoGPT Backend — REST API

A production-grade, modular monolith backend REST API built with **NestJS**, **PostgreSQL**, **TypeORM**, and **Swagger / OpenAPI**. EchoGPT powers an extensible multi-AI chat platform supporting dynamic provider selection (**OpenAI**, **Anthropic Claude**, **Google Gemini**), real-time SSE streaming, web search query caching, subscription quotas, and administrative panel operations.

---

## Architecture & Design Principles

- **Modular Monolith**: Clean boundaries across domains (`auth`, `users`, `subscriptions`, `providers`, `chat`, `search`, `admin`). Modules communicate strictly through injected service interfaces, never by leaking entities or repositories directly across modules.
- **Strategy Pattern for AI Providers**: Pluggable provider architecture (`AiProvider` interface) decoupling LLM implementations. Adding new model providers requires zero changes to chat logic.
- **Enterprise-Grade Security**: Provider API keys encrypted at rest with **AES-256-GCM** using 32-byte secret keys and cryptographically random initialization vectors. API keys are never returned in cleartext.
- **Server-Sent Events (SSE)**: Real-time token and chunk streaming endpoint (`POST /api/chat/stream`) alongside buffered completion responses (`POST /api/chat/send`).
- **Subscription Quotas & Usage Tracking**: Tier-based monthly quotas (Free & Premium plans) with atomic quota evaluation and billing period resets.
- **Web Search Engine with LRU Caching**: Fast search query resolution, autocomplete suggestions, deduplicated history, and in-memory TTL caching.
- **Admin Panel & Diagnostics**: Comprehensive dashboard stats, token consumption breakdown, user management, and system health metrics.

---

## Tech Stack

- **Framework**: NestJS (Node.js & TypeScript)
- **Database**: PostgreSQL
- **ORM**: TypeORM with strictly versioned TypeScript migrations (`synchronize: false`)
- **Authentication**: Passport.js JWT (Access Token + Refresh Token rotation, bcrypt)
- **API Documentation**: Swagger / OpenAPI 3.0 at `/api/docs`
- **Testing**: Jest unit & integration test suites
- **Containerization**: Docker & Docker Compose

---

## Getting Started

### 1. Prerequisites
- Node.js `v20+` or `v22+`
- PostgreSQL `v14+` or Docker

### 2. Environment Configuration
Copy the example environment file and configure variables:
```bash
cp .env.example .env
```

Ensure `.env` contains:
```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=echogpt
DB_SSL=false

# Authentication
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_min_32_characters
JWT_REFRESH_EXPIRATION=7d

# AES-256-GCM Encryption Key (Must be 32 bytes / 64 hex characters)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run PostgreSQL via Docker (Optional)
```bash
docker-compose up -d
```

### 5. Run Database Migrations
```bash
npm run migration:run
```

### 6. Start the Server
```bash
# Development mode
npm run start:dev

# Production build & run
npm run build
npm run start:prod
```

The application will be accessible at:
- **API Root**: `http://localhost:3000/api`
- **Swagger Documentation**: `http://localhost:3000/api/docs`

---

## API Endpoints Summary

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Log in and receive JWT access + refresh token | No |
| `POST` | `/api/auth/refresh` | Rotate and issue new access & refresh tokens | No |
| `POST` | `/api/auth/logout` | Revoke active refresh token session | Yes (Bearer) |
| `GET`  | `/api/auth/me` | Get current user token payload | Yes (Bearer) |

### 2. User Management (`/api/users`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`    | `/api/users/profile` | Retrieve authenticated user profile | Yes (Bearer) |
| `PATCH`  | `/api/users/profile` | Update user name details | Yes (Bearer) |
| `POST`   | `/api/users/change-password` | Update account password | Yes (Bearer) |
| `DELETE` | `/api/users/account` | Deactivate/delete account | Yes (Bearer) |
| `GET`    | `/api/users` | List all active users (Admin only) | Admin |

### 3. Subscription Management (`/api/subscriptions`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`  | `/api/subscriptions/status` | Current subscription status & details | Yes (Bearer) |
| `GET`  | `/api/subscriptions/usage` | Request usage quota & remaining requests | Yes (Bearer) |
| `GET`  | `/api/subscriptions/plans` | Available subscription plan tiers | Yes (Bearer) |
| `POST` | `/api/subscriptions/change-plan` | Upgrade/downgrade subscription plan | Yes (Bearer) |

### 4. AI Provider Management (`/api/providers`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST`   | `/api/providers` | Create AI provider (encrypted API key) | Admin |
| `GET`    | `/api/providers` | List all AI providers | Yes (Bearer) |
| `GET`    | `/api/providers/default` | Get current default active provider | Yes (Bearer) |
| `GET`    | `/api/providers/health` | Health check all enabled providers | Admin |
| `GET`    | `/api/providers/:id` | Get provider details by ID | Yes (Bearer) |
| `PATCH`  | `/api/providers/:id` | Update provider configuration | Admin |
| `PATCH`  | `/api/providers/:id/toggle` | Enable/disable provider | Admin |
| `PATCH`  | `/api/providers/:id/default` | Set provider as default | Admin |
| `GET`    | `/api/providers/:id/health` | Health check individual provider | Admin |
| `DELETE` | `/api/providers/:id` | Delete AI provider | Admin |

### 5. Chat & Multi-AI Completions (`/api/chat`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`    | `/api/chat/providers` | Available models tailored to subscription tier | Yes (Bearer) |
| `POST`   | `/api/chat/send` | Send prompt and receive AI response | Yes (Bearer) |
| `POST`   | `/api/chat/stream` | Stream AI response via Server-Sent Events (SSE) | Yes (Bearer) |
| `POST`   | `/api/chat/conversations` | Initialize a new conversation thread | Yes (Bearer) |
| `GET`    | `/api/chat/conversations` | List user conversation threads | Yes (Bearer) |
| `GET`    | `/api/chat/conversations/:id` | Full conversation message history | Yes (Bearer) |
| `PATCH`  | `/api/chat/conversations/:id` | Rename conversation thread title | Yes (Bearer) |
| `DELETE` | `/api/chat/conversations/:id` | Delete conversation thread | Yes (Bearer) |

### 6. Web Search API (`/api/search`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST`   | `/api/search` | Execute web search query (cached & persisted) | Yes (Bearer) |
| `GET`    | `/api/search/history` | Paginated search query history | Yes (Bearer) |
| `GET`    | `/api/search/recent` | Recent distinct search queries | Yes (Bearer) |
| `GET`    | `/api/search/suggestions` | Search query autocomplete suggestions | Yes (Bearer) |
| `DELETE` | `/api/search/history/:id` | Delete specific search history record | Yes (Bearer) |
| `DELETE` | `/api/search/history` | Clear all search history | Yes (Bearer) |

### 7. Admin Panel (`/api/admin`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET`   | `/api/admin/dashboard` | Dashboard metrics & totals | Admin |
| `GET`   | `/api/admin/analytics/usage` | Token and model usage analytics | Admin |
| `GET`   | `/api/admin/users` | List users with search and filters | Admin |
| `PATCH` | `/api/admin/users/:id/role` | Promote/demote user role | Admin |
| `PATCH` | `/api/admin/users/:id/status` | Activate/deactivate user account | Admin |
| `GET`   | `/api/admin/subscriptions` | List subscriptions with filters | Admin |
| `PATCH` | `/api/admin/subscriptions/:userId` | Override subscription quota/plan | Admin |
| `GET`   | `/api/admin/providers` | Manage AI providers | Admin |
| `GET`   | `/api/admin/providers/:id/health` | Test provider health check | Admin |
| `PATCH` | `/api/admin/providers/:id/toggle` | Toggle provider active state | Admin |
| `PATCH` | `/api/admin/providers/:id/default` | Set default provider | Admin |
| `GET`   | `/api/admin/system/health` | Database and memory diagnostics | Admin |
| `GET`   | `/api/admin/system/logs` | System audit and request logs | Admin |

---

## Testing

Run all unit and integration test suites:
```bash
npm test
```

Generate test coverage report:
```bash
npm run test -- --coverage
```
