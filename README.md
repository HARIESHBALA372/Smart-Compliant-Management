# Smart Complaint Management App — Frontend

A modern, responsive, enterprise-grade complaint management frontend built with React + TypeScript.

## Project Overview

The Smart Complaint Management App manages customer complaints end-to-end — from submission through resolution and closure. It serves four roles with dedicated dashboards and permissions:

1. **Customer** — submit and track complaints
2. **Support Agent** — work complaint queue, update status, resolve
3. **Manager** — monitor performance, SLA compliance, analytics
4. **Administrator** — manage users, categories, SLA rules, audit logs, reports

## Features

- JWT authentication with automatic token refresh
- Role-based routing and access control
- Complaint lifecycle (Submitted → Under Review → In Progress → Pending Customer Response → Resolved → Closed)
- AI-powered insights (category/priority prediction, sentiment analysis) via FastAPI ML service
- SLA tracking (Within SLA / Approaching SLA / SLA Breached)
- Real-time notifications over WebSocket with automatic reconnect
- Interactive analytics with Recharts
- Reports (PDF / CSV / Excel) with preview and download
- User, category, and SLA administration
- Audit logs
- Comments and internal notes
- Drag-and-drop file uploads with validation
- Light / Dark / System themes
- Responsive layout (desktop, tablet, mobile)
- Full test coverage with Vitest + React Testing Library

## Tech Stack

| Area         | Technology                                   |
| ------------ | -------------------------------------------- |
| UI           | React 19, TypeScript, Tailwind CSS 4         |
| Routing      | React Router DOM                              |
| State        | Redux Toolkit (typed hooks)                   |
| Forms        | React Hook Form + Zod                        |
| HTTP         | Axios (with interceptors)                     |
| Charts       | Recharts                                      |
| Icons        | Lucide React                                  |
| Real-time    | WebSocket (native)                            |
| Testing      | Vitest, React Testing Library                 |
| Linting      | ESLint                                        |
| Formatting   | Prettier                                      |

## Folder Structure

```
src/
├── assets/            # Static assets
├── components/
│   ├── common/        # Button, Input, Modal, Table, badges, etc.
│   ├── layout/        # Sidebar, Header, Layout
│   ├── complaints/    # AIInsights, complaint-specific components
│   ├── dashboard/     # Dashboard widgets
│   ├── notifications/ # NotificationItem
│   ├── charts/        # ChartCard, PieChart, BarChart, LineChart
│   └── users/         # User components
├── features/          # Role feature modules
├── pages/
│   ├── auth/          # Login, Register, Forgot/Reset Password
│   ├── customer/      # Customer portal
│   ├── agent/         # Agent workspace
│   ├── manager/       # Manager console
│   └── admin/         # Admin console
├── routes/            # ProtectedRoute, RoleRoute
├── services/          # API clients + mock data
├── store/             # Redux store + slices
├── hooks/             # Custom hooks
├── types/             # TypeScript types
├── utils/             # Helpers
├── constants/         # App constants
├── test/              # Test setup + tests
├── App.tsx            # Root app + routing
├── main.tsx           # Entry point
└── index.css          # Tailwind + global styles
```

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```
VITE_API_URL=http://localhost:4000/api
VITE_ML_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:4000
```

| Variable        | Purpose                                     | Default                    |
| --------------- | ------------------------------------------- | -------------------------- |
| `VITE_API_URL`  | Node.js/Express REST API base URL           | `http://localhost:4000/api` |
| `VITE_ML_API_URL` | FastAPI ML service base URL                | `http://localhost:8000`    |
| `VITE_WS_URL`   | WebSocket URL for real-time events          | `ws://localhost:4000`      |

> `.env` is git-ignored. Never commit secrets.

## Running Locally

```bash
npm run dev
```

The dev server runs at `http://localhost:3000`.

### Demo Accounts (mock mode)

The frontend ships with realistic mock data. Mock mode activates whenever the API is unreachable or `VITE_API_URL` is unset. Use these demo accounts:

| Role        | Email                  | Password       |
| ----------- | ---------------------- | -------------- |
| Customer    | `customer@test.com`    | `Password123!` |
| Agent       | `agent@test.com`       | `Password123!` |
| Manager     | `manager@test.com`     | `Password123!` |
| Admin       | `admin@test.com`       | `Password123!` |

## Build

```bash
npm run build        # TypeScript check + production build
npm run preview      # Preview the production build
```

## Testing

```bash
npm run test             # Run all tests once
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

## Available Scripts

| Script             | Description                       |
| ------------------ | --------------------------------- |
| `npm run dev`      | Start dev server                  |
| `npm run build`    | Type-check and build              |
| `npm run preview`  | Preview production build          |
| `npm run lint`     | Run ESLint                        |
| `npm run format`   | Format with Prettier              |
| `npm run test`     | Run tests                         |
| `npm run test:coverage` | Run tests with coverage      |

## API Configuration

The Axios client (`src/services/api.ts`) is configured with:

- Base URL from `VITE_API_URL`
- Request interceptor that attaches the JWT access token
- Response interceptor that automatically refreshes expired access tokens
- Queue-based refresh handling to avoid refresh storms
- Automatic logout + redirect to `/login` when the refresh token is invalid

### Expected backend endpoints

| Resource      | Endpoints                                        |
| ------------- | ------------------------------------------------ |
| Auth          | `POST /auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout` |
| Complaints    | `GET/POST /complaints`, `GET/PUT /complaints/:id`, `POST /complaints/:id/comments` |
| Users         | `GET/POST /users`, `GET/PUT/DELETE /users/:id`   |
| Notifications | `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all` |
| Analytics     | `GET /analytics`, `GET /analytics/agent-performance` |
| Admin         | `GET/POST /admin/categories`, `GET/PUT /admin/sla`, `GET /admin/audit-logs` |
| Reports       | `POST /reports/generate`                          |

## ML Service Configuration

The ML client (`src/services/mlApi.ts`) calls the FastAPI service:

| Endpoint             | Method | Body             | Returns                         |
| -------------------- | ------ | ---------------- | ------------------------------- |
| `/predict-category`  | POST   | `{ text }`       | `{ prediction, confidence }`    |
| `/predict-priority`  | POST   | `{ text }`       | `{ prediction, confidence }`    |
| `/analyze-sentiment` | POST   | `{ text }`       | `{ sentiment, confidence }`     |
| `/suggest-similar`   | POST   | `{ text }`       | `[{ complaintId, title, similarity, resolutionSummary }]` |
| `/retrain-model`     | POST   | —                | `{ message }`                   |

If the ML service is unavailable, the app displays **"AI service unavailable"** and complaint submission still works normally.

## WebSocket Configuration

`socket/services/websocketService.ts` connects to `VITE_WS_URL` and supports these events:

- `new complaint`
- `complaint update`
- `complaint assignment`
- `new comment`
- `notification`
- `SLA warning`
- `SLA breach`

The service automatically reconnects with exponential backoff (up to 5 attempts). If WebSocket is unavailable, the application continues working normally via polling/REST.

## Authentication Flow

1. Login stores `tokens` and `user` in `localStorage`.
2. The axios response interceptor refreshes expired access tokens transparently.
3. If the refresh token is invalid:
   - Auth state is cleared
   - User is logged out
   - Redirected to `/login`

## Role-Based Access

- Protected routes require authentication (`ProtectedRoute`).
- Role routes restrict access by role (`RoleRoute`).
- Unauthorized access → `/unauthorized`.
- Unknown routes → `/404`.
- Frontend RBAC is a UI layer only; the backend remains authoritative.

---

Built as a complete, production-ready frontend for the Smart Complaint Management App.