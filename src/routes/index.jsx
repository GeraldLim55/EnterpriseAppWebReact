import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { MODULES } from '@/types'
import { AppLayout } from '@/components/layout'
import { LoadingScreen } from '@/components/ui'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// Pages (lazy imports for code splitting)
import { lazy, Suspense } from 'react'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const ItemsPage = lazy(() => import('@/features/items/ItemsPage'))
const ItemDetailPage = lazy(() => import('@/features/items/ItemDetailPage'))
const InvoicesPage = lazy(() => import('@/features/invoices/InvoicesPage'))
const InvoiceDetailPage = lazy(() => import('@/features/invoices/InvoiceDetailPage'))
const InvoiceCreatePage = lazy(() => import('@/features/invoices/InvoiceCreatePage'))
const InvoiceEditPage = lazy(() => import('@/features/invoices/InvoiceEditPage'))
const AccountPage = lazy(() => import('@/features/profile/AccountPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const CompanySettingsPage = lazy(() => import('@/features/settings/CompanySettingsPage'))
const NotFoundPage = lazy(() => import('./NotFoundPage'))
const BrandMaintenancePage = lazy(() => import('@/features/maintenance/BrandMaintenancePage'))
const CategoryMaintenancePage = lazy(() => import('@/features/maintenance/CategoryMaintenancePage'))
const LocationMaintenancePage = lazy(() => import('@/features/maintenance/LocationMaintenancePage'))
const PaymentTermsMaintenancePage = lazy(() => import('@/features/maintenance/PaymentTermsMaintenancePage'))
const SystemDownPage = lazy(() => import('@/features/errors/SystemDownPage'))
const NotSubscribedPage = lazy(() => import('@/features/errors/NotSubscribedPage'))

// ─── Protected Route ──────────────────────────────────────────────────────
function ProtectedRoute({ minLevel, moduleKey }) {
  const { isAuthenticated, isLoading, hasMinLevel, hasModule } = useAuth()

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (minLevel && !hasMinLevel(minLevel)) return <Navigate to="/items" replace />
  if (moduleKey && !hasModule(moduleKey)) return <Navigate to="/not-subscribed" replace />

  return (
    <AppLayout>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </AppLayout>
  )
}

// ─── Public Route (redirect if logged in) ────────────────────────────────
function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  )
}

// ─── App Router ───────────────────────────────────────────────────────────
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected — all roles */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Protected — Invoice module */}
        <Route element={<ProtectedRoute moduleKey={MODULES.Erp} />}>
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/create" element={<InvoiceCreatePage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/invoices/:id/edit" element={<InvoiceEditPage />} />
        </Route>

        {/* Protected — Manager+ */}
        <Route element={<ProtectedRoute minLevel={60} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        {/* Protected — Admin+ */}
        <Route element={<ProtectedRoute minLevel={80} />}>
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/company" element={<CompanySettingsPage />} />
        </Route>

        {/* Protected — Admin+ and ERP module */}
        <Route element={<ProtectedRoute minLevel={80} moduleKey={MODULES.Erp} />}>
          <Route path="/maintenance/brand" element={<BrandMaintenancePage />} />
          <Route path="/maintenance/category" element={<CategoryMaintenancePage />} />
          <Route path="/maintenance/location" element={<LocationMaintenancePage />} />
          <Route path="/maintenance/payment-terms" element={<PaymentTermsMaintenancePage />} />
        </Route>

        {/* Not subscribed — authenticated but missing module */}
        <Route element={<ProtectedRoute />}>
          <Route path="/not-subscribed" element={<NotSubscribedPage />} />
        </Route>

        {/* System down — public, no auth, no layout */}
        <Route path="/system-down" element={<Suspense fallback={<LoadingScreen />}><SystemDownPage /></Suspense>} />

        <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>} />
      </Routes>
    </BrowserRouter>
  )
}
