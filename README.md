# EnterpriseApp — React Frontend

Modern admin dashboard built with React 18, TypeScript, Vite, and Tailwind CSS.  
Connects to the EnterpriseApp ASP.NET Core 8 backend.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite 5 | Build tool & dev server |
| Tailwind CSS 3 | Styling |
| TanStack Query 5 | Server state, caching, refetching |
| React Hook Form + Zod | Forms & validation |
| Axios | HTTP client with interceptors |
| React Router 6 | Client-side routing |
| React Hot Toast | Notifications |
| Lucide React | Icons |
| date-fns | Date formatting |

---

## Quick Start

### 1. Install dependencies

```bash
cd enterprise-frontend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5001/api/v1
```

If your backend runs on HTTPS locally:
```env
VITE_API_URL=https://localhost:5001/api/v1
```

### 3. Run development server

```bash
npm run dev
# → http://localhost:3000
```

The Vite dev proxy forwards `/api` → `https://localhost:5001` automatically (configured in `vite.config.ts`).

### 4. Build for production

```bash
npm run build
# Output: dist/
```

---

## Default Credentials (from backend seed)

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Admin@123` | Admin |
| `superadmin` | `SuperAdmin@123` | SuperAdmin |
| `manager` | `Manager@123` | Manager |
| `staff` | `Staff@123` | Staff |

---

## Project Structure

```
src/
├── api/
│   ├── client.ts          # Axios instance, token refresh interceptor
│   └── index.ts           # All API service modules
├── components/
│   ├── layout/
│   │   └── index.tsx      # AppLayout, Sidebar, Header, PageHeader
│   └── ui/
│       └── index.tsx      # Button, Input, Table, Modal, Badge, Pagination…
├── context/
│   └── AuthContext.tsx    # Auth state, login/logout, role helpers
├── features/
│   ├── auth/              # LoginPage, ForgotPassword, ResetPassword
│   ├── dashboard/         # DashboardPage — stats + revenue chart
│   ├── items/             # ItemsPage, ItemDetailPage (image upload)
│   ├── invoices/          # InvoicesPage, InvoiceCreatePage, InvoiceDetailPage
│   ├── profile/           # ProfilePage — tabbed, resume builder, 3 templates
│   ├── users/             # UsersPage — CRUD with role management
│   └── settings/          # SettingsPage — system config + change password
├── hooks/                 # (extend with custom hooks as needed)
├── lib/
│   └── utils.ts           # cn(), formatDate, formatCurrency, downloadBlob…
├── routes/
│   ├── index.tsx          # All routes, ProtectedRoute, PublicRoute
│   └── NotFoundPage.tsx
├── types/
│   └── index.ts           # All TypeScript types mirroring backend DTOs
├── App.tsx
├── main.tsx
└── index.css
```

---

## Key Architecture Decisions

### Authentication flow
1. `POST /auth/login` → stores `access_token`, `refresh_token`, `user_session` in localStorage
2. Axios interceptor attaches `Authorization: Bearer <token>` to every request
3. On 401 with `Token-Expired: true` header → silently refreshes token, queues concurrent requests
4. On 401 without that header → clears storage, redirects to `/login`
5. Session cookie (HttpOnly) is also sent for cookie-based auth via `withCredentials: true`

### Role-based UI
- `useAuth().hasMinLevel(level)` gates UI elements and routes
- Route-level protection via `<ProtectedRoute minLevel={...} />`
- Navigation items are filtered by `hasMinLevel` — users only see what they can access

### Data fetching (TanStack Query)
- All API calls go through service modules in `src/api/index.ts`
- Query keys follow `['resource', params]` convention
- Mutations invalidate relevant query keys on success
- `staleTime: 5min` for most queries; longer for static data (categories, brands)

### Cache provider
- Driven by backend `appsettings.json: Cache.Provider`
- Frontend always sends the same requests — caching is server-side
- TanStack Query adds client-side deduplication and background refetch

---

## Multi-tenant Support

Tenant is sent via `X-Tenant` header or resolved from subdomain by the backend middleware.  
The frontend reads `session.tenantId` from the JWT claims (set after login).

To send a tenant header on all requests, add to `client.ts`:
```typescript
client.interceptors.request.use(config => {
  const session = JSON.parse(localStorage.getItem('user_session') ?? '{}')
  if (session.tenantId) config.headers['X-Tenant-Id'] = session.tenantId
  return config
})
```

---

## Adding a New Feature

1. Add types to `src/types/index.ts`
2. Add API calls to `src/api/index.ts`
3. Create `src/features/<name>/<Name>Page.tsx`
4. Add route in `src/routes/index.tsx`
5. Add nav item in `src/components/layout/index.tsx`

---

## Production Deployment

```bash
npm run build
```

The `dist/` folder is a static SPA. Serve with Nginx, Caddy, or any CDN (Vercel, Netlify, Azure Static Web Apps).

**Nginx config snippet (for React Router):**
```nginx
location / {
  root /var/www/enterprise-frontend;
  try_files $uri $uri/ /index.html;
}
```

**Environment variable at build time:**
```bash
VITE_API_URL=https://api.yourapp.com/api/v1 npm run build
```

---

## Scripts

```bash
npm run dev        # Start dev server at localhost:3000
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run type-check # TypeScript check without emitting
npm run lint       # ESLint
```
