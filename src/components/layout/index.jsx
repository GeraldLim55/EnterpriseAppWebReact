import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { companyApi } from '@/api'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, FileText, Users, Settings,
  UserCircle, LogOut, Menu, X, ChevronRight, Building2,
  BarChart3, Bell, Wrench, Tag, ChevronDown, FolderTree, MapPin, Clock, Contact,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn, getInitials } from '@/lib/utils'
import { Button } from '@/components/ui'
import toast from 'react-hot-toast'
import { ROLE_LEVELS, MODULES } from '@/types'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, minLevel: ROLE_LEVELS.Manager },
  { label: 'Items', href: '/items', icon: Package },
  { label: 'Invoices', href: '/invoices', icon: FileText, moduleKey: MODULES.Erp },
  { label: 'Users', href: '/users', icon: Users, minLevel: ROLE_LEVELS.Admin },
  { label: 'Profile', href: '/profile', icon: Contact, moduleKey: MODULES.Profile },
  { label: 'Account', href: '/account', icon: UserCircle },
]

const NAV_GROUPS = [
  {
    label: 'Maintenance',
    icon: Wrench,
    basePath: '/maintenance',
    minLevel: ROLE_LEVELS.Admin,
    children: [
      { label: 'Brand Maintenance', href: '/maintenance/brand', icon: Tag },
      { label: 'Category Maintenance', href: '/maintenance/category', icon: FolderTree },
      { label: 'Location Maintenance', href: '/maintenance/location', icon: MapPin },
      { label: 'Payment Terms', href: '/maintenance/payment-terms', icon: Clock },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    basePath: '/settings',
    minLevel: ROLE_LEVELS.Admin,
    children: [
      { label: 'General', href: '/settings', icon: Settings },
      { label: 'Company Profile', href: '/settings/company', icon: Building2 },
      { label: 'Invoice Settings', href: '/settings/invoice', icon: FileText, moduleKey: MODULES.Erp },
    ],
  },
]

// ─── Nav Group (expandable dropdown) ─────────────────────────────────────
function NavGroup({ group, collapsed, onChildClick }) {
  const location = useLocation()
  const { hasModule } = useAuth()
  const visibleChildren = group.children.filter(c => !c.moduleKey || hasModule(c.moduleKey))
  const isGroupActive = location.pathname.startsWith(group.basePath)
  const [open, setOpen] = useState(isGroupActive)

  if (!visibleChildren.length) return null

  if (collapsed) {
    // In collapsed mode show only the group icon, linking to the first child
    return (
      <NavLink
        to={visibleChildren[0].href}
        className={cn(
          'nav-link mb-0.5 justify-center px-0 w-10 mx-auto',
          isGroupActive && 'active',
        )}
        title={group.label}
      >
        <group.icon className="w-4 h-4 flex-shrink-0" />
      </NavLink>
    )
  }

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'nav-link w-full',
          isGroupActive && 'active',
        )}
      >
        <group.icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-gray-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="mt-0.5 ml-3 pl-3 border-l border-gray-100">
          {visibleChildren.map(child => (
            <NavLink
              key={child.href}
              to={child.href}
              end
              onClick={onChildClick}
              className={({ isActive }) => cn('nav-link mb-0.5 text-sm', isActive && 'active')}
            >
              <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────
function Sidebar({ collapsed, onToggle }) {
  const { session, hasMinLevel, hasModule, logout } = useAuth()
  const navigate = useNavigate()
  const { data: company } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => companyApi.get().then(r => r.data?.data),
    staleTime: 1000 * 60 * 10,
  })
  const displayName = company?.companyName || session?.tenantName || 'EnterpriseApp'

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-gray-100', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-gray-900 truncate">{displayName}</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {/* Tenant badge */}
        {!collapsed && session && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-brand-50">
            <Building2 className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
            <span className="text-xs font-medium text-brand-700 truncate">
              Tenant #{session.tenantId}
            </span>
          </div>
        )}

        {NAV_ITEMS.filter(item =>
          (!item.minLevel || hasMinLevel(item.minLevel)) &&
          (!item.moduleKey || hasModule(item.moduleKey))
        ).map(item => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              'nav-link mb-0.5',
              isActive && 'active',
              collapsed && 'justify-center px-0 w-10 mx-auto',
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.badge && (
              <span className="ml-auto rounded-full bg-brand-100 text-brand-700 text-xs font-medium px-1.5 py-0.5">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        {/* Nav groups */}
        {NAV_GROUPS.filter(g => (!g.minLevel || hasMinLevel(g.minLevel)) && (!g.moduleKey || hasModule(g.moduleKey))).map(group => (
          <NavGroup key={group.basePath} group={group} collapsed={collapsed} />
        ))}
      </nav>

      {/* User section */}
      <div className={cn('border-t border-gray-100 p-3', collapsed && 'flex justify-center')}>
        {collapsed ? (
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
              {getInitials(session?.firstName, session?.lastName, session?.username)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {session?.firstName ? `${session.firstName} ${session.lastName ?? ''}`.trim() : session?.username}
              </p>
              <p className="text-xs text-gray-500 truncate">{session?.roleName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

// ─── Top Header ───────────────────────────────────────────────────────────
function Header({ onMenuToggle }) {
  const { session } = useAuth()
  const { data: company } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => companyApi.get().then(r => r.data?.data),
    staleTime: 1000 * 60 * 10,
  })
  const displayName = company?.companyName || session?.tenantName
  return (
    <header className="h-14 flex items-center justify-between px-5 border-b border-gray-200 bg-white flex-shrink-0">
      <button
        onClick={onMenuToggle}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>
      {displayName && (
        <span className="text-sm font-semibold text-gray-700 ml-4 truncate max-w-[200px]">
          {displayName}
        </span>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────
function MobileDrawer({ open, onClose }) {
  const { session, hasMinLevel, hasModule, logout } = useAuth()
  const navigate = useNavigate()
  const { data: company } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => companyApi.get().then(r => r.data?.data),
    staleTime: 1000 * 60 * 10,
  })
  const displayName = company?.companyName || session?.tenantName || 'EnterpriseApp'

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/login')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-xl animate-slide-in">
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 truncate">{displayName}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV_ITEMS.filter(item =>
            (!item.minLevel || hasMinLevel(item.minLevel)) &&
            (!item.moduleKey || hasModule(item.moduleKey))
          ).map(item => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) => cn('nav-link mb-0.5', isActive && 'active')}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
            </NavLink>
          ))}
          {NAV_GROUPS.filter(g => (!g.minLevel || hasMinLevel(g.minLevel)) && (!g.moduleKey || hasModule(g.moduleKey))).map(group => (
            <NavGroup key={group.basePath} group={group} collapsed={false} onChildClick={onClose} />
          ))}
        </nav>
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700">
              {getInitials(session?.firstName, session?.lastName, session?.username)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {session?.firstName ? `${session.firstName} ${session.lastName ?? ''}`.trim() : session?.username}
              </p>
              <p className="text-xs text-gray-500">{session?.roleName}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" leftIcon={<LogOut className="w-4 h-4" />} onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── App Layout ───────────────────────────────────────────────────────────
export function AppLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(p => !p)} />
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="px-5 py-6 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// ─── Page Header ──────────────────────────────────────────────────────────
export function PageHeader({ title, description, action, breadcrumbs }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumbs && (
          <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {b.href ? (
                  <NavLink to={b.href} className="hover:text-gray-700 transition-colors">{b.label}</NavLink>
                ) : (
                  <span className="text-gray-700 font-medium">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {action && <div className="flex items-center gap-2 mt-0.5">{action}</div>}
    </div>
  )
}
