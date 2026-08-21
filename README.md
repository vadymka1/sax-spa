# React SPA Saxophone Ensemble (Frontend)

Frontend single-page application and Admin CMS for the SPA Saxophone Ensemble project, built with React 19, TypeScript, Vite, React Router, TanStack Query, Axios, Zod, and Vitest.

## Features Implemented

- **F1 Baseline & API Foundation**: Strict environment configuration, Axios client with JWT interceptor, Zod DTO contracts, TanStack Query integration, MSW 2.x API mocking, and native transport file upload handling.
- **F2 Public SPA Shell & Dynamic Navigation**: Real public page shell driven by `GET /api/v1/public/page`, dynamic navigation generated from `SpaSection` records, dynamic anchor linking (`#section.key`), sticky header, mobile hamburger navigation, `IntersectionObserver` active section tracking (`aria-current="location"`), loading/error/empty state handling, and accessible UI baseline.
- **F3 Public ContentBlock Renderers & Media**: Dedicated visitor-facing renderers for all four backend block types (`text`, `text_image`, `text_video`, `text_youtube`). Directly consumes backend-provided media URLs with native HTML image lazy loading, HTML5 native video (with user controls, metadata preload, no autoplay), and responsive 16:9 YouTube iframe embeds. Preserves single grouped API request (`GET /api/v1/public/page`).
- **F4 Admin Authentication & Protected Layout**: Private admin authentication flow using frozen backend endpoints (`POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`). In-memory token storage (`authSession.ts`), single-flight 401 refresh deduplication with automatic retry-once, protected routing (`/admin/*`), double-submit protection, and protected admin layout shell.
- **F4.1 Admin-Only Session Bootstrap & Auth Contract Alignment**: Decoupled public SPA route `/` from auth bootstrap (0 `/auth/refresh` calls on visitor load). Session restoration is scoped strictly to `/admin/*` via idempotent `ensureSessionChecked()`. Aligned frontend auth DTOs with the frozen Rust/Rocket backend contract (**CONTRACT B — Explicit JSON Body Refresh Token**), using explicit `{ refresh_token }` JSON body payload exchange in `authApi.refresh()` and `authApi.logout()`.
- **F4.2 Honest Contract-B Session Model**: Strict in-memory authentication lifecycle. The frozen Rust/Rocket backend returns refresh tokens in JSON response bodies and requires them in refresh/logout request bodies (Contract B). Tokens are kept in JavaScript memory only (`authSession.ts`); no tokens are ever stored in `localStorage`, `sessionStorage`, `IndexedDB`, or cookies. Active session state survives client-side SPA navigation, but a full browser reload destroys memory state and requires signing in again.
- **F5 Admin SpaSection Management**: SpaSection CRUD operations (`GET`, `POST`, `PATCH`, `DELETE`, `POST /reorder`). Focus management, deterministic dialog accessibility (`role="dialog"`, `aria-modal="true"`, focus trap, Escape key closing), and backend order preservation.
- **F6 Admin ContentBlock Management + Media + Strict Boundaries**: ContentBlock CRUD with section selector filter, block-type selection, media upload (`image`, `video`), YouTube creation, strict media schema discrimination, and no media delete cascading.
- **F7 ContentBlock Reorder & Canonical Confirmation**: Admin reordering of ContentBlocks via `POST /api/v1/admin/spa-sections/{id}/content-blocks/reorder`. Canonical GET confirmation handshake, recoverable error banners with request ID, GET-only Retry mechanism, section-scoped confirmation locking, and aria-live announcements.
- **F8 Final Integration, Production Hardening & Docker**: Full public and admin end-to-end integration tests, React ErrorBoundary fallback, multi-stage Docker build (`node:20-alpine` build -> `nginx:alpine` runtime), Nginx SPA client-side routing fallback (`try_files $uri $uri/ /index.html`), security headers, static asset caching, healthcheck (`/healthz`), zero-vulnerability package audit, and release documentation.
- **F8.1 Release Blocker Fixes**:
  1. **Admin 404 Wildcard Routing**: Extracted reusable canonical `NotFoundPage` (`src/components/common/NotFoundPage.tsx`). Configured `/admin/*` wildcard route to render `NotFoundPage` inside the authenticated `AdminLayout` shell instead of fallback `AdminDashboard`.
  2. **Docker Environment Fail-Fast Validation**: Removed default `http://localhost:8000` fallback from `Dockerfile` (`ARG VITE_API_BASE_URL`). Added build-time validation in `vite.config.ts` enforcing `VITE_API_BASE_URL` presence during production build (`docker build` without `--build-arg VITE_API_BASE_URL=...` fails immediately as expected).
  3. **Nginx Cache Precedence & Header Inheritance**: Configured `location ^~ /assets/` strong prefix match in `nginx.conf` for Vite hashed assets with 1-year immutable caching (`public, max-age=31536000, immutable`) and missing asset 404 returns (`try_files $uri =404;`). Explicitly declared security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`) on all location blocks to ensure header inheritance is preserved.
  4. **True Media Upload Integration Test**: Implemented end-to-end stateful media upload test in `src/test/integration.test.tsx` (`file upload` -> `POST /media/upload` -> `POST /content-blocks` with `media_id` -> text-only edit with 0 re-uploads -> block delete with 0 media deletions).
- **F8.2 Final Router Alignment & Release Verification**:
  1. **Canonical NotFoundPage Reuse**: Removed local test-only `NotFoundPage` component definition from `src/test/integration.test.tsx` and imported canonical production `NotFoundPage` (`src/components/common/NotFoundPage.tsx`).
  2. **Router Alignment**: Production and integration routers now use identical `NotFoundPage` component with identical user-facing copy, eliminating router drift.
  3. **404 Route Behavior**:
     - Unknown public routes (`/does-not-exist`) render canonical `NotFoundPage`.
     - Unknown authenticated admin routes (`/admin/does-not-exist`) render canonical `NotFoundPage` inside `AdminLayout` with `AdminDashboard` explicitly absent.
  4. **Regression Assertions**: Added integration regression tests asserting canonical heading (`404 - Page Not Found`), explanatory copy (`The requested page does not exist or has been moved.`), and return link (`Return to Public Application`). Verified 0 duplicate `NotFoundPage` definitions in tests.

## Prerequisites

- Node.js 24+ (specified in `.nvmrc`)
- npm (v10+)
- Docker (optional, for containerized production deployment)
- Rust/Rocket Backend running on `http://localhost:8000`

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local` if custom backend URL is required:

```bash
cp .env.example .env.local
```

Default configuration:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Development Server

Start Vite dev server on port `5173`:

```bash
npm run dev
```

### 4. Docker Deployment

> **Note**: Building the Docker image without `--build-arg VITE_API_BASE_URL=...` will deliberately fail to prevent deploying unconfigured frontend builds.

Build production Docker image:

```bash
docker build --build-arg VITE_API_BASE_URL=http://localhost:8000 -t react-spa-sax:local .
```

Run Docker container locally on port `8080`:

```bash
docker run --rm -p 8080:80 react-spa-sax:local
```

Verify endpoints:

- `http://localhost:8080/` (Public SPA)
- `http://localhost:8080/admin/login` (Admin Login)
- `http://localhost:8080/admin/content` (Admin Content CMS)
- `http://localhost:8080/healthz` (Nginx static healthcheck)

## Available Scripts

| Script                 | Action                                               |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Starts Vite local development server                 |
| `npm run build`        | Runs TypeScript compilation & Vite production build  |
| `npm run preview`      | Previews production build locally                    |
| `npm run test`         | Runs Vitest in watch mode                            |
| `npm run test:run`     | Runs Vitest test suite once                          |
| `npm run typecheck`    | Validates TypeScript types strictly (`tsc --noEmit`) |
| `npm run lint`         | Runs ESLint checks                                   |
| `npm run format`       | Formats codebase with Prettier                       |
| `npm run format:check` | Checks code formatting with Prettier                 |

## Security & Architectural Guarantees

1. **Authentication (Contract B)**: Access and refresh tokens are kept strictly in JavaScript memory (`authSession.ts`). Zero token persistence in `localStorage`, `sessionStorage`, `IndexedDB`, or cookies. Full browser reloads clear session state as required by Contract B.
2. **Zero Inventions**: All `sort_order` and `key` values are generated exclusively by the backend.
3. **Canonical Handshake**: ContentBlock reorder POST requires explicit canonical GET fetch confirmation before announcing updated position.
4. **Strict Media Discrimination**: Media payload responses undergo strict Zod schema validation matching expected media type (`image`, `video`, `youtube`).
5. **No HTML Injection**: Zero usage of `dangerouslySetInnerHTML`, raw HTML string injection, or unvalidated iframes.

## Visual Design System & Token Architecture

The visual architecture separates public visitor experience from administrative workspace tooling while maintaining shared spacing and token hygiene:

- **Public Site (Soft Editorial Musician Portfolio)**: Warm paper aesthetic (`#F6F2EC` background, `#FFFCF8` cards), serif display typography (`Georgia`), decorative brass accents (`#A88955`), text-safe brass tokens (`#80613A`, 5.13:1 contrast ratio against `#F6F2EC`), translucent sticky header, and editorial section spacing.
- **Decorative vs Text-Safe Brass**:
  - `Decorative Brass` (`--color-public-accent: #A88955`): Used for non-text ornamental elements (borders, underlines, card highlights).
  - `Text-Safe Brass` (`--color-public-accent-text: #80613A`): Used for normal-sized public navigation, brand hover, and active text states (WCAG AA 5.13:1 contrast).
  - `Text-Hover Brass` (`--color-public-accent-text-hover: #755730`): Used for interactive hover states (6.04:1 contrast).
- **Admin UI (Clean Accessible Workspace)**: Cool neutral workspace (`#F5F7F9` background, `#FFFFFF` cards), dark slate typography (`#24313D`), muted slate blue primary action system (`#3F6488`), and systematic button variants.
- **Systematic Button System**: High-contrast states across default, hover, active, and disabled across primary (`#3F6488`), secondary/edit (`#FFFFFF` outline), danger (`#B34C4C`), and utility/reorder controls.
- **Accessibility & Focus Philosophy**: Scoped high-contrast W3C `:focus-visible` rings (`outline: 3px solid #243A3A` on public, `outline: 3px solid #3F6488` on admin), WCAG AA contrast compliance, `@media (prefers-reduced-motion: reduce)` support, and 0 undefined CSS variables (`var(--...)`).

## Continuous Integration

Automated quality verification is managed via GitHub Actions ([.github/workflows/ci.yml](file:///.github/workflows/ci.yml)):

- **Triggers**: Pushes to `main`, Pull Requests to `main`, and manual execution (`workflow_dispatch`).
- **Node.js Environment**: Standardized on Node.js 24 via `.nvmrc` with npm dependency caching (`package-lock.json`).
- **Quality Gates**:
  1. `Install dependencies`: `npm ci`
  2. `Check formatting`: `npm run format:check`
  3. `Lint`: `npm run lint`
  4. `Typecheck`: `npm run typecheck`
  5. `Test`: `npm run test:run`
  6. `Production Vite build`: `VITE_API_BASE_URL=http://localhost:8000 npm run build`
- **Docker Image Build Validation**: Follows successful `quality` gate to verify multi-stage production Docker build (`node:24-alpine` -> `nginx:alpine`).

### Local Developer Quality Parity

Developers should run the full suite before pushing code:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:run
VITE_API_BASE_URL=http://localhost:8000 npm run build
docker build --build-arg VITE_API_BASE_URL=http://localhost:8000 -t react-spa-sax:ci .
```

## Project Architecture

```text
react-spa-sax/
├── Dockerfile            # Multi-stage production Docker build
├── nginx.conf            # Nginx SPA fallback routing, caching & security headers
├── .dockerignore         # Docker context ignore file
├── src/
│   ├── api/              # Canonical HTTP client, Zod schemas, API error normalization & endpoints
│   ├── app/              # App shell, Router configuration, ErrorBoundary & TanStack Query providers
│   ├── components/       # Common reusable UI components (ErrorBoundary, ErrorMessage, LoadingSpinner)
│   ├── features/         # Feature components (public-page, auth, admin sections/content)
│   ├── hooks/            # React custom hooks
│   ├── lib/              # Environment resolver & media guard utilities
│   ├── styles/           # Global CSS, resets & design system tokens
│   └── test/             # Vitest tests, MSW handlers & fixtures
```
