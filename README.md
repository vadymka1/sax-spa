# React SPA Saxophone Ensemble (Frontend)

Frontend single-page application and Admin CMS for the SPA Saxophone Ensemble project, built with React 19, TypeScript, Vite, React Router, TanStack Query, Axios, Zod, and Vitest.

## Features Implemented

- **F1 Baseline & API Foundation**: Strict environment configuration, Axios client with JWT interceptor, Zod DTO contracts, TanStack Query integration, MSW 2.x API mocking, and native transport file upload handling.
- **F2 Public SPA Shell & Dynamic Navigation**: Real public page shell driven by `GET /api/v1/public/page`, dynamic navigation generated from `SpaSection` records, dynamic anchor linking (`#section.key`), sticky header, mobile hamburger navigation, `IntersectionObserver` active section tracking (`aria-current="location"`), loading/error/empty state handling, and accessible UI baseline.
- **F3 Public ContentBlock Renderers & Media**: Dedicated visitor-facing renderers for all four backend block types (`text`, `text_image`, `text_video`, `text_youtube`). Directly consumes backend-provided media URLs with native HTML image lazy loading, HTML5 native video (with user controls, metadata preload, no autoplay), and responsive 16:9 YouTube iframe embeds. Preserves single grouped API request (`GET /api/v1/public/page`).
- **F4 Admin Authentication & Protected Layout**: Private admin authentication flow using backend endpoints (`POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`). In-memory access token storage (`authSession.ts`), single-flight 401 refresh deduplication with automatic retry-once, protected routing (`/admin/*`), double-submit protection, and protected admin layout shell.
- **F4.1 Auth Contract C Alignment & Scoped Session Bootstrap**: Decoupled public SPA route `/` from auth bootstrap (0 `/auth/refresh` calls on visitor load). Session restoration is scoped strictly to `/admin/*` via idempotent `ensureSessionChecked()`. Aligned frontend with **Auth Contract C — HttpOnly Refresh Cookie Session**, sending `withCredentials: true` with empty request bodies for `/auth/refresh` and `/auth/logout`.
- **F4.2 Persistent Admin Session Restore & Memory-Only Access Token Model**: Robust in-memory access token lifecycle paired with Secure HttpOnly cookie refresh. Access tokens are kept strictly in JavaScript memory (`authSession.ts`) and never stored in `localStorage`, `sessionStorage`, `IndexedDB`, or client-accessible cookies. When an administrator reloads the browser (F5), `AuthProvider` transitions to `checking` state and automatically restores the session via cookie-based `/auth/refresh`, eliminating session loss while keeping tokens safe from XSS exfiltration.
- **F5 Admin SpaSection Management**: SpaSection CRUD operations (`GET`, `POST`, `PATCH`, `DELETE`, `POST /reorder`). Focus management, deterministic dialog accessibility (`role="dialog"`, `aria-modal="true"`, focus trap, Escape key closing), and backend order preservation.
- **F6 Admin ContentBlock Management + Media + Strict Boundaries**: ContentBlock CRUD with section selector filter, block-type selection, media upload (`image`, `video`), YouTube creation, strict media schema discrimination, and no media delete cascading.
- **F7 ContentBlock Reorder & Canonical Confirmation**: Admin reordering of ContentBlocks via `POST /api/v1/admin/spa-sections/{id}/content-blocks/reorder`. Canonical GET confirmation handshake, recoverable error banners with request ID, GET-only Retry mechanism, section-scoped confirmation locking, and aria-live announcements.
- **F8 Final Integration, Production Hardening & Docker**: Full public and admin end-to-end integration tests, React ErrorBoundary fallback, multi-stage Docker build (`node:24-alpine` build -> `nginx:alpine` runtime), Nginx SPA client-side routing fallback (`try_files $uri $uri/ /index.html`), security headers, static asset caching, healthcheck (`/healthz`), zero-vulnerability package audit, and release documentation.
- **F9 Super Admin User Management & F9.1 Hardening**: Comprehensive user management workspace located at `/admin/users` restricted strictly to `super_admin` role users via `RequireRole` route guard. Renders 403 `ForbiddenPage` and suppresses API calls when accessed by normal `admin` users. Dynamic header navigation shows `Users` link only for `super_admin`. Supports backend user operations (`getUsers`, `getUser`, `createUser`, `updateUser`), user creation password validation (minimum 6 characters, `type="password"`, `autocomplete="new-password"`), role assignment (`admin`, `super_admin`) with runtime role validation without unsafe casts, modal focus management & focus restoration, pending mutation backdrop/escape locking, user activation/deactivation status management, structured error & Request-ID preservation, and strict frontend self-deactivation prevention for active sessions.
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
- `http://localhost:8080/admin/users` (Super Admin User Management)
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

1. **Authentication (Auth Contract C — HttpOnly Cookie Session)**: Access tokens are kept strictly in JavaScript memory (`authSession.ts`). Refresh tokens are stored exclusively by the backend in a Secure HttpOnly cookie (`SameSite=Lax`, `Path=/api/v1/auth`), completely inaccessible to JavaScript (`document.cookie` cannot access it). Zero credential persistence in `localStorage`, `sessionStorage`, or `IndexedDB`. Full browser reloads (F5) automatically restore session state via credentialed refresh without requiring administrators to sign in again.
2. **Zero Inventions**: All `sort_order` and `key` values are generated exclusively by the backend.
3. **Canonical Handshake**: ContentBlock reorder POST requires explicit canonical GET fetch confirmation before announcing updated position.
4. **Strict Media Discrimination**: Media payload responses undergo strict Zod schema validation matching expected media type (`image`, `video`, `youtube`).
5. **No HTML Injection**: Zero usage of `dangerouslySetInnerHTML`, raw HTML string injection, or unvalidated iframes.

## Authentication Architecture — Auth Contract C

The frontend implements **Auth Contract C — HttpOnly Refresh Cookie Session**:

### 1. Token Distribution & Storage Boundaries

- **Access Token**:
  - Returned in JSON payload on `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh` (`access_token`, `token_type`, `expires_in`, `user`).
  - Stored strictly in JavaScript memory (`src/features/auth/authSession.ts`).
  - Attached via Axios request interceptor as `Authorization: Bearer <access_token>` for protected administrative requests.
  - Never persisted to `localStorage`, `sessionStorage`, `IndexedDB`, or client-accessible cookies.
- **Refresh Token**:
  - Managed exclusively by the backend via a `Secure`, `HttpOnly`, `SameSite=Lax` cookie scoped to `/api/v1/auth`.
  - Inaccessible to client JavaScript (`document.cookie` cannot read or modify it).
  - Never serialized in frontend-visible JSON response bodies.

### 2. Login Flow

- Endpoint: `POST /api/v1/auth/login`
- Request: `{ email, password }` with `withCredentials: true`.
- Backend response: `{ access_token, token_type, expires_in, user }` and sets the HttpOnly `refresh_token` cookie.
- Frontend sets in-memory session (`setSession(access_token, user)`) and transitions `AuthProvider` to `authenticated`.

### 3. Session Restoration & F5 Browser Reload Persistence

- When an administrator reloads the browser (F5) or visits an admin URL directly:
  1. In-memory access token is cleared by the browser reload.
  2. `AuthProvider` initializes in the `checking` state.
  3. `ProtectedAdminRoute` renders a loading spinner while `status === "checking"`, preventing premature redirects to `/admin/login`.
  4. Scoped to admin routes (`ensureSessionChecked()`), the client issues `POST /api/v1/auth/refresh` with an empty body and `withCredentials: true`.
  5. The browser automatically includes the HttpOnly `refresh_token` cookie with the request.
  6. The backend validates and rotates the token, returning a fresh `access_token` and `user`.
  7. Frontend restores the in-memory session and transitions to `authenticated`.
- **A valid logged-in user does NOT need to sign in again after F5 or page reload.**

### 4. Protected Route Guarantees

- `ProtectedAdminRoute` distinguishes 3 authentication states:
  - `checking`: Renders `LoadingSpinner` during session bootstrap/restoration.
  - `authenticated`: Renders protected admin content (`AdminLayout`, `AdminDashboard`, `SpaSectionsPage`, `ContentBlocksPage`, `UsersPage`).
  - `unauthenticated`: Redirects to `/admin/login` (preserving intended destination via location state).
- Ensures zero visual flashing or accidental logout redirects during initial reload.

### 5. Logout Flow

- Endpoint: `POST /api/v1/auth/logout`
- Request: Empty body with `withCredentials: true`.
- Backend revokes the refresh token in the database and clears the cookie (`Max-Age=0`).
- Frontend clears in-memory state (`clearSession()`) and transitions `AuthProvider` to `unauthenticated`.

### 6. Automatic 401 Interceptor & Single-Flight Refresh

- Axios response interceptor catches `401 Unauthorized` responses on protected requests.
- **Single-Flight Coalescing**: Concurrent 401s share a single in-flight `refreshPromise` calling `POST /api/v1/auth/refresh` with `withCredentials: true`.
- **Automatic Retry**: Once refresh succeeds, original failed requests are retried once with the new access token.
- **Generation Guard**: Prevents race conditions from overwriting newer tokens with stale responses.
- **Loop Prevention**: 401 errors from `/auth/login`, `/auth/refresh`, and `/auth/logout` are explicitly excluded from interceptor retry loops.

### 7. Public Route Isolation

- Public visitor endpoints (`GET /api/v1/public/page`, `POST /api/v1/public/contact`, `POST /api/v1/public/testimonials`) require zero authentication.
- Loading the public site triggers 0 `/auth/refresh` requests. Auth cookies and session restoration are strictly isolated to admin workflows.

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
│   ├── lib/              # Environment resolver, locale state & media guard utilities
│   ├── styles/           # Global CSS, resets & design system tokens
│   └── test/             # Vitest tests, MSW handlers & fixtures
```

## Multilingual Architecture (V1.1)

- **Supported Locales**: `en` (canonical default and fallback) and `de`.
- **Public Page**: Automatically requests `GET /api/v1/public/page?locale=<locale>`. Renders localized title, content blocks, and localized `navigation_label`. Zero client-side fallback merging; renders backend-provided localized values directly.
- **Admin SpaSection Management**:
  - `name`: Localized independently per language (`translations.en.name` required, `translations.de.name` optional).
  - `navigation_label`: Localized independently per language (`translations.en.navigation_label`, `translations.de.navigation_label`).
  - `section_key` / `slug`: Immutable, technical identifier that remains language-independent for anchor navigation.
- **Admin ContentBlock Management**:
  - `title` and `text`: Localized independently per language (`translations.en`, `translations.de`).
  - `media`: Shared across languages and not duplicated.

## Page Appearance (V1.2)

- **Feature Overview**: Enables administrative configuration of the visual page background mode, solid color, background image, and overlay on the public SPA.
- **Background Modes**:
  - `none` (Default): Uses the default editorial site design. Stored image and color configurations remain preserved but inactive.
  - `color` (Color): Displays a solid `#RRGGBB` background color across the entire public page. Stored background image is preserved in state without being detached.
  - `image` (Image): Displays a background image. Background color acts as the base/fallback while the image loads or if it cannot be displayed. Requires an uploaded image before switching.
- **Supported Settings**:
  - `background_mode`: Explicit mode enum (`none`, `color`, `image`).
  - `background_color`: Canonical uppercase `#RRGGBB` hex color. Controlled via native color picker and synchronized hex text input with validation.
  - `background_media`: Image media asset (`image/jpeg`, `image/png`, `image/webp`). Managed through the shared Media API.
  - `overlay_opacity`: Soft ivory overlay intensity ranging from `0.0` (0%) to `1.0` (100%). Active in Image mode.
  - `background_position`: CSS positioning (`center`, `top`, `bottom`). Active in Image mode.
  - `background_size`: Sizing mode (`cover` fills the screen, may crop; `contain` preserves aspect ratio without cropping). Active in Image mode.
- **Admin Management Route**: Dedicated protected route `/admin/page-appearance` accessible via the admin navigation sidebar.
- **Workflow & Preservation Semantics**:
  - Switching modes preserves stored color and stored image across mode switches without destructive resets.
  - Selecting an image uploads the asset via `POST /api/v1/admin/media/upload` and assigns `background_media_id` without forcing mode switch away from `none` or `color`.
  - Removing background in `image` mode atomically switches mode to `none` and clears `background_media_id`. In `color` or `none` modes, only `background_media_id` is cleared while preserving mode and color.
  - Partial PATCH: Only modified fields are sent when updating mode, color, overlay opacity, position, or size.
  - Live Preview: Real-time visual preview reacting dynamically to mode, color, slider, and option adjustments before saving.
- **Public SPA Rendering Behavior**:
  - When `background_mode` is `color`: Applies `background-color` to the page root without overlay.
  - When `background_mode` is `image`: Applies `background-color` as base/fallback, `background-image`, `background-position`, `background-size`, and renders overlay (`var(--color-public-bg)` with dynamic opacity).
  - When `background_mode` is `none`: Falls back gracefully to the default editorial background without broken styles or overlay.
  - Language-Independent: Appearance settings are shared across all locales (`en`, `de`). Switching languages does not reset or refetch appearance settings.
- **Appearance Media Contract**:
  - The appearance media DTO strictly enforces the backend discriminator:
    ```json
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "type": "image",
      "url": "https://api.enstisax.com/uploads/...",
      "alt_text": null
    }
    ```
  - Both public and admin appearance schemas strictly require `type: "image"`. Discriminator-less payloads, non-image types (`video`, `youtube`), and legacy `media_type` shapes are rejected at the frontend schema level.

### Production Upload Persistence Note

The backend stores uploaded background and media assets on the filesystem (`/app/uploads`). The production environment **MUST** mount persistent volume storage for uploads to ensure background images survive container recreation or deployments.

Expected production Docker Compose configuration:

```yaml
services:
  backend:
    volumes:
      - uploads_data:/app/uploads

volumes:
  uploads_data:
```

> **Warning**: Never run destructive volume removal commands such as `docker compose down -v` in production, as this would erase uploaded media assets.
