// ─── Roles ────────────────────────────────────────────────────────────────
export const ROLE_LEVELS = {
  SuperAdmin: 99,
  Admin: 80,
  Manager: 60,
  Staff: 40,
  User: 10,
}

// ─── Modules ──────────────────────────────────────────────────────────────
// Keys must match what the backend returns in session.modules[].key
export const MODULES = {
  Reports: 'reports',
  Invoice: 'invoice',
  Erp: 'erp',
  Profile: 'profile',
  HR: 'hr',
}
